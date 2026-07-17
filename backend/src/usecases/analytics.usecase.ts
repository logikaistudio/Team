import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface EVMResult {
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
}

export interface HealthScoreResult {
  score: number;
  status: 'green' | 'yellow' | 'red';
  breakdown: {
    cost: number;
    schedule: number;
    risk: number;
    safety: number;
    quality: number;
  };
}

export class AnalyticsUseCase {
  /**
   * Calculate Earned Value Management (EVM) metrics for a given project up to a target date
   */
  async calculateEVM(tenantId: string, projectId: string, upToDate: Date): Promise<EVMResult> {
    const formattedDate = upToDate.toISOString().split('T')[0];

    // 1. Get total project budget (BAC - Budget at Completion)
    const budgetRes = await pool.query(
      `SELECT budget FROM projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    if (budgetRes.rows.length === 0) {
      throw new Error('Project not found');
    }
    const bac = parseFloat(budgetRes.rows[0].budget || '0');

    // 2. Calculate Planned Value (PV)
    // PV is the sum of task planned costs * percentage of elapsed duration up to target date
    const pvRes = await pool.query(
      `SELECT 
        COALESCE(SUM(
          planned_cost * 
          CASE 
            WHEN planned_start > $3 THEN 0
            WHEN planned_end <= $3 THEN 1
            ELSE EXTRACT(EPOCH FROM ($3 - planned_start))::NUMERIC / NULLIF(EXTRACT(EPOCH FROM (planned_end - planned_start))::NUMERIC, 0)
          END
        ), 0) as pv
       FROM tasks 
       WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId, formattedDate]
    );
    const pv = parseFloat(pvRes.rows[0].pv);

    // 3. Calculate Earned Value (EV)
    // EV is the sum of task planned costs * current progress percentage
    const evRes = await pool.query(
      `SELECT 
        COALESCE(SUM(planned_cost * (progress_percent / 100.0)), 0) as ev
       FROM tasks 
       WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const ev = parseFloat(evRes.rows[0].ev);

    // 4. Calculate Actual Cost (AC)
    // AC is the sum of actual costs recorded up to target date
    const acRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as ac
       FROM actual_costs
       WHERE tenant_id = $1 AND project_id = $2 AND transaction_date <= $3`,
      [tenantId, projectId, formattedDate]
    );
    const ac = parseFloat(acRes.rows[0].ac);

    // 5. Calculate variances and performance indices
    const sv = ev - pv;
    const cv = ev - ac;
    const spi = pv > 0 ? ev / pv : 1.0;
    const cpi = ac > 0 ? ev / ac : 1.0;

    return {
      pv: Math.round(pv * 100) / 100,
      ev: Math.round(ev * 100) / 100,
      ac: Math.round(ac * 100) / 100,
      spi: Math.round(spi * 1000) / 1000,
      cpi: Math.round(cpi * 1000) / 1000,
      sv: Math.round(sv * 100) / 100,
      cv: Math.round(cv * 100) / 100,
    };
  }

  /**
   * S-Curve coordinate generator
   */
  async generateSCurve(tenantId: string, projectId: string): Promise<any[]> {
    // 1. Get project start/end dates
    const projectRes = await pool.query(
      `SELECT start_date, end_date, budget FROM projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    if (projectRes.rows.length === 0) {
      throw new Error('Project not found');
    }
    const { start_date, end_date } = projectRes.rows[0];
    const projectStart = new Date(start_date);
    const projectEnd = new Date(end_date);

    // 2. Generate monthly interval dates between start and end
    const intervals: Date[] = [];
    const current = new Date(projectStart);
    while (current <= projectEnd) {
      intervals.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    if (intervals[intervals.length - 1] < projectEnd) {
      intervals.push(new Date(projectEnd));
    }

    // 3. Compile PV, EV, AC metrics for each interval
    const sCurveData = [];
    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    for (const date of intervals) {
      const evm = await this.calculateEVM(tenantId, projectId, date);
      
      // Calculate forecast: extrapolating remaining tasks based on current CPI & SPI
      const totalBudget = parseFloat(projectRes.rows[0].budget || '0');
      let forecastProgress = evm.ev;
      if (evm.spi > 0 && evm.cpi > 0) {
        // Standard forecast calculation: Planned value factored by scheduling index
        forecastProgress = Math.min(totalBudget, evm.ev + (totalBudget - evm.ev) * evm.spi);
      }

      sCurveData.push({
        date: date.toISOString().split('T')[0],
        plannedProgress: Math.round((evm.pv / (totalBudget || 1)) * 10000) / 100,
        actualProgress: Math.round((evm.ev / (totalBudget || 1)) * 10000) / 100,
        forecastProgress: Math.round((forecastProgress / (totalBudget || 1)) * 10000) / 100,
      });
    }

    return sCurveData;
  }

  /**
   * Project Health Score calculation algorithm
   */
  async calculateHealthScore(tenantId: string, projectId: string): Promise<HealthScoreResult> {
    const today = new Date();
    
    // 1. Calculate Cost & Schedule metrics via EVM
    let evm: EVMResult;
    try {
      evm = await this.calculateEVM(tenantId, projectId, today);
    } catch (e) {
      evm = { pv: 0, ev: 0, ac: 0, spi: 1, cpi: 1, sv: 0, cv: 0 };
    }

    // Normalizing indices: scale 1.0 (on budget) as 100 points, subtract penalties for < 1.0
    const costScore = Math.max(0, Math.min(100, Math.round(evm.cpi * 100)));
    const scheduleScore = Math.max(0, Math.min(100, Math.round(evm.spi * 100)));

    // 2. Risk Score: based on count of high/critical open risks
    const riskRes = await pool.query(
      `SELECT COUNT(*) as high_risks FROM risks WHERE tenant_id = $1 AND project_id = $2 AND severity_score >= 12 AND status = 'open'`,
      [tenantId, projectId]
    );
    const highRisksCount = parseInt(riskRes.rows[0].high_risks);
    const riskScore = Math.max(0, 100 - highRisksCount * 15); // Deduct 15 pts per high risk

    // 3. Safety Score: based on HSE incidents count (fewer = better)
    const safetyRes = await pool.query(
      `SELECT COUNT(*) as incidents FROM incidents WHERE tenant_id = $1 AND project_id = $2 AND severity != 'near_miss'`,
      [tenantId, projectId]
    );
    const incidentCount = parseInt(safetyRes.rows[0].incidents);
    const safetyScore = Math.max(0, 100 - incidentCount * 25); // Deduct 25 pts per major incident

    // 4. Quality Score: outstanding NCRs vs inspections
    const ncrRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_ncrs,
        COUNT(*) as total_ncrs
       FROM ncrs WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const openNcrs = parseInt(ncrRes.rows[0].open_ncrs || '0');
    const qualityScore = Math.max(0, 100 - openNcrs * 20); // Deduct 20 pts per open NCR

    // 5. Aggregate overall health using weighted indexes
    // Weights: Cost(30%), Schedule(30%), Risk(15%), Safety(15%), Quality(10%)
    const score = Math.round(
      costScore * 0.3 +
      scheduleScore * 0.3 +
      riskScore * 0.15 +
      safetyScore * 0.15 +
      qualityScore * 0.1
    );

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (score < 70) status = 'red';
    else if (score < 90) status = 'yellow';

    return {
      score,
      status,
      breakdown: {
        cost: costScore,
        schedule: scheduleScore,
        risk: riskScore,
        safety: safetyScore,
        quality: qualityScore,
      },
    };
  }

  /**
   * AI Analysis helper utilizing either Gemini API or OpenAI SDK
   */
  async generateAIReportSummary(tenantId: string, projectId: string, requestType: 'weekly' | 'monthly' | 'forecast'): Promise<string> {
    // 1. Collect analytics parameters from project
    const projectRes = await pool.query(
      `SELECT name, description, budget, start_date, end_date FROM projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    if (projectRes.rows.length === 0) {
      return "Error: Project not found.";
    }
    const project = projectRes.rows[0];
    const health = await this.calculateHealthScore(tenantId, projectId);
    
    // Fetch latest tasks status counts
    const taskRes = await pool.query(
      `SELECT status, count(*) FROM tasks WHERE tenant_id = $1 AND project_id = $2 GROUP BY status`,
      [tenantId, projectId]
    );
    const tasksSummary = taskRes.rows.map((r) => `${r.status}: ${r.count}`).join(', ');

    // Compile prompts containing stats
    const promptText = `
      Perform an executive project analysis for "${project.name}" (${project.description}).
      - Project Schedule: ${project.start_date} to ${project.end_date}
      - Total Budget: ${project.budget} USD
      - Health Score: ${health.score}/100 (Status: ${health.status.toUpperCase()})
      - Tasks Count: ${tasksSummary}
      - Health Breakdown: Cost index ${health.breakdown.cost}, Schedule index ${health.breakdown.schedule}, Risks ${health.breakdown.risk}, Safety ${health.breakdown.safety}, Quality ${health.breakdown.quality}
      
      Generate a professional ${requestType} executive summary report including:
      1. Overall execution summary.
      2. Predictive delay alerts & potential cost overrun forecast.
      3. Mitigating recommendations.
    `;

    // Connect to model endpoint
    const apiKey = config.ai.geminiKey || config.ai.openaiKey;
    if (!apiKey) {
      logger.warn('AI API key is missing. Returning a template summary.');
      return `[MOCKED AI REPORT SUMMARY FOR: ${project.name}]
Based on Project Health of ${health.score}/100, the project is trending ${health.status.toUpperCase()}.
- Cost indicator is at ${health.breakdown.cost}%.
- Schedule completion rates reflect ${tasksSummary}.
- Recommendations: Check task dependency chains and review mitigation strategies for open risk logs.`;
    }

    try {
      // Connect to Gemini API or fallback OpenAI
      if (config.ai.geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });
        const data = await response.json() as any;
        return data.candidates[0].content.parts[0].text;
      } else {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ai.openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptText }]
          })
        });
        const data = await response.json() as any;
        return data.choices[0].message.content;
      }
    } catch (err: any) {
      logger.error('Failed to query LLM endpoint', { error: err.message });
      return `Failed to fetch live AI summary: ${err.message}.`;
    }
  }
}
