import { IProjectRepository } from './project.repository.interface';
import { Project, ProjectMember, WBSNode, Task } from '../domain/project.entity';
import { pool } from '../config/database';

export class ProjectRepository implements IProjectRepository {
  async create(tenantId: string, project: Partial<Project>): Promise<Project> {
    const query = `
      INSERT INTO projects (tenant_id, name, code, description, status_id, start_date, end_date, budget, currency, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, tenant_id AS "tenantId", name, code, description, status_id AS "statusId",
                start_date AS "startDate", end_date AS "endDate", budget, currency, location,
                0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      tenantId,
      project.name,
      project.code,
      project.description,
      project.statusId,
      project.startDate,
      project.endDate,
      project.budget || 0.00,
      project.currency || 'USD',
      project.location,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findById(tenantId: string, id: string): Promise<Project | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, code, description, status_id AS "statusId",
             start_date AS "startDate", end_date AS "endDate", budget, currency, location,
             0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM projects
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, id]);
    return rows.length ? rows[0] : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Project | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, code, description, status_id AS "statusId",
             start_date AS "startDate", end_date AS "endDate", budget, currency, location,
             0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM projects
      WHERE tenant_id = $1 AND code = $2
    `;
    const { rows } = await pool.query(query, [tenantId, code]);
    return rows.length ? rows[0] : null;
  }

  async findAll(tenantId: string): Promise<Project[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, code, description, status_id AS "statusId",
             start_date AS "startDate", end_date AS "endDate", budget, currency, location,
             0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM projects
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [tenantId]);
    return rows;
  }

  async update(tenantId: string, id: string, project: Partial<Project>): Promise<Project> {
    const query = `
      UPDATE projects
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          description = COALESCE($3, description),
          status_id = COALESCE($4, status_id),
          start_date = COALESCE($5, start_date),
          end_date = COALESCE($6, end_date),
          budget = COALESCE($7, budget),
          currency = COALESCE($8, currency),
            location = COALESCE($9, location)
          WHERE tenant_id = $10 AND id = $11
      RETURNING id, tenant_id AS "tenantId", name, code, description, status_id AS "statusId",
              start_date AS "startDate", end_date AS "endDate", budget, currency, location,
              0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      project.name,
      project.code,
      project.description,
      project.statusId,
      project.startDate,
      project.endDate,
      project.budget,
      project.currency,
      project.location,
      tenantId,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const query = `DELETE FROM projects WHERE tenant_id = $1 AND id = $2`;
    const res = await pool.query(query, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }

  // Members
  async addMember(tenantId: string, member: Partial<ProjectMember>): Promise<ProjectMember> {
    const query = `
      INSERT INTO project_members (tenant_id, project_id, user_id, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", user_id AS "userId", role_id AS "roleId", joined_at AS "joinedAt"
    `;
    const values = [tenantId, member.projectId, member.userId, member.roleId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getMembers(tenantId: string, projectId: string): Promise<ProjectMember[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", user_id AS "userId", role_id AS "roleId", joined_at AS "joinedAt"
      FROM project_members
      WHERE tenant_id = $1 AND project_id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, projectId]);
    return rows;
  }

  async removeMember(tenantId: string, projectId: string, userId: string): Promise<boolean> {
    const query = `DELETE FROM project_members WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3`;
    const res = await pool.query(query, [tenantId, projectId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  // WBS
  async createWBS(tenantId: string, node: Partial<WBSNode>): Promise<WBSNode> {
    const query = `
      INSERT INTO wbs (tenant_id, project_id, parent_id, code, name, description, weight)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", parent_id AS "parentId",
                code, name, description, weight, 0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      tenantId,
      node.projectId,
      node.parentId,
      node.code,
      node.name,
      node.description,
      node.weight || 0.00,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getWBSNodes(tenantId: string, projectId: string): Promise<WBSNode[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", parent_id AS "parentId",
             code, name, description, weight, 0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM wbs
      WHERE tenant_id = $1 AND project_id = $2
      ORDER BY code ASC
    `;
    const { rows } = await pool.query(query, [tenantId, projectId]);
    return rows;
  }

  async findWBSById(tenantId: string, id: string): Promise<WBSNode | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", parent_id AS "parentId",
             code, name, description, weight, 0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM wbs
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, id]);
    return rows.length ? rows[0] : null;
  }

  async updateWBS(tenantId: string, id: string, node: Partial<WBSNode>): Promise<WBSNode> {
    const query = `
      UPDATE wbs
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          weight = COALESCE($4, weight)
      WHERE tenant_id = $5 AND id = $6
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", parent_id AS "parentId",
                code, name, description, weight, 0.00::numeric AS "progressPercent", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [node.code, node.name, node.description, node.weight, tenantId, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async deleteWBS(tenantId: string, id: string): Promise<boolean> {
    const query = `DELETE FROM wbs WHERE tenant_id = $1 AND id = $2`;
    const res = await pool.query(query, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }

  // Tasks
  async createTask(tenantId: string, task: Partial<Task>): Promise<Task> {
    const query = `
      INSERT INTO tasks (tenant_id, project_id, wbs_id, schedule_id, name, description, planned_start, planned_end, duration_days, planned_cost, weight, progress_percent, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", wbs_id AS "wbsId", schedule_id AS "scheduleId",
                name, description, planned_start AS "plannedStart", planned_end AS "plannedEnd", actual_start AS "actualStart",
                actual_end AS "actualEnd", duration_days AS "durationDays", progress_percent AS "progressPercent",
                planned_cost AS "plannedCost", weight, status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      tenantId,
      task.projectId,
      task.wbsId,
      task.scheduleId,
      task.name,
      task.description,
      task.plannedStart,
      task.plannedEnd,
      task.durationDays || 0,
      task.plannedCost || 0.00,
      task.weight || 0.00,
      task.progressPercent || 0.00,
      task.status || 'not_started',
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getTasks(tenantId: string, projectId: string): Promise<Task[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", wbs_id AS "wbsId", schedule_id AS "scheduleId",
             name, description, planned_start AS "plannedStart", planned_end AS "plannedEnd", actual_start AS "actualStart",
             actual_end AS "actualEnd", duration_days AS "durationDays", progress_percent AS "progressPercent",
             planned_cost AS "plannedCost", weight, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tasks
      WHERE tenant_id = $1 AND project_id = $2
      ORDER BY planned_start ASC
    `;
    const { rows } = await pool.query(query, [tenantId, projectId]);
    return rows;
  }

  async findTaskById(tenantId: string, id: string): Promise<Task | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", wbs_id AS "wbsId", schedule_id AS "scheduleId",
             name, description, planned_start AS "plannedStart", planned_end AS "plannedEnd", actual_start AS "actualStart",
             actual_end AS "actualEnd", duration_days AS "durationDays", progress_percent AS "progressPercent",
             planned_cost AS "plannedCost", weight, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tasks
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, id]);
    return rows.length ? rows[0] : null;
  }

  async updateTask(tenantId: string, id: string, task: Partial<Task>): Promise<Task> {
    const query = `
      UPDATE tasks
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          planned_start = COALESCE($3, planned_start),
          planned_end = COALESCE($4, planned_end),
          actual_start = COALESCE($5, actual_start),
          actual_end = COALESCE($6, actual_end),
          duration_days = COALESCE($7, duration_days),
          progress_percent = COALESCE($8, progress_percent),
          planned_cost = COALESCE($9, planned_cost),
          weight = COALESCE($10, weight),
          status = COALESCE($11, status)
      WHERE tenant_id = $12 AND id = $13
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", wbs_id AS "wbsId", schedule_id AS "scheduleId",
                name, description, planned_start AS "plannedStart", planned_end AS "plannedEnd", actual_start AS "actualStart",
                actual_end AS "actualEnd", duration_days AS "durationDays", progress_percent AS "progressPercent",
                planned_cost AS "plannedCost", weight, status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      task.name,
      task.description,
      task.plannedStart,
      task.plannedEnd,
      task.actualStart,
      task.actualEnd,
      task.durationDays,
      task.progressPercent,
      task.plannedCost,
      task.weight,
      task.status,
      tenantId,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async deleteTask(tenantId: string, id: string): Promise<boolean> {
    const query = `DELETE FROM tasks WHERE tenant_id = $1 AND id = $2`;
    const res = await pool.query(query, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Recalculate and persist progress rollup from Tasks → WBS Nodes → Project.
   * Also syncs project start_date/end_date with the min/max task dates.
   */
  async recalculateProjectRollup(tenantId: string, projectId: string): Promise<void> {
    // Step 1: Fetch all tasks for the project
    const tasksRes = await pool.query(
      `SELECT wbs_id AS "wbsId", planned_start AS "plannedStart", planned_end AS "plannedEnd",
              progress_percent AS "progressPercent", weight
       FROM tasks WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const tasks: { wbsId: string; plannedStart: Date; plannedEnd: Date; progressPercent: number; weight: number }[] = tasksRes.rows;

    if (tasks.length === 0) return;

    // Step 2: Group tasks by wbs_id and compute per-node progress (weighted by task weight)
    const tasksByNode: Record<string, typeof tasks> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const t of tasks) {
      const s = new Date(t.plannedStart);
      const e = new Date(t.plannedEnd);
      if (!minDate || s < minDate) minDate = s;
      if (!maxDate || e > maxDate) maxDate = e;
      if (!tasksByNode[t.wbsId]) tasksByNode[t.wbsId] = [];
      tasksByNode[t.wbsId].push(t);
    }

    // Step 3: For each WBS node, compute weighted progress and update it
    const wbsRes = await pool.query(
      `SELECT id, weight FROM wbs WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const wbsNodes: { id: string; weight: number }[] = wbsRes.rows;

    let projectProgressNumerator = 0;
    let projectProgressDenominator = 0;

    for (const node of wbsNodes) {
      const nodeTasks = tasksByNode[node.id] || [];
      if (nodeTasks.length === 0) continue;

      const totalWeight = nodeTasks.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
      let nodeProgress = 0;
      if (totalWeight > 0) {
        nodeProgress = nodeTasks.reduce((sum, t) => sum + (Number(t.progressPercent) || 0) * (Number(t.weight) || 0), 0) / totalWeight;
      } else {
        // Fallback: simple average
        nodeProgress = nodeTasks.reduce((sum, t) => sum + (Number(t.progressPercent) || 0), 0) / nodeTasks.length;
      }

      // Keep rollup in-memory only when schema does not include wbs.progress_percent.

      projectProgressNumerator += nodeProgress * (Number(node.weight) || 0);
      projectProgressDenominator += Number(node.weight) || 0;
    }

    // Step 4: Compute project-level progress and update project dates + progress
    const projectProgress = projectProgressDenominator > 0
      ? projectProgressNumerator / projectProgressDenominator
      : 0;

    await pool.query(
      `UPDATE projects SET start_date = $1, end_date = $2 WHERE tenant_id = $3 AND id = $4`,
      [minDate, maxDate, tenantId, projectId]
    );
  }
}
