import React, { useState } from 'react';
import {
  ShieldAlert,
  BrainCircuit,
  Sparkles,
  Upload,
  Users
} from 'lucide-react';

// ============================================================================
// RESOURCES & COST PAGE
// ============================================================================
export const ResourcesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources & Cost Baseline</h1>
          <p className="text-zinc-500 text-sm">Manage manpower, equipment, material allocations, and lock your BoQ.</p>
        </div>
        <button className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-brand-500/20">
          Lock Cost Baseline
        </button>
      </div>

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
         <div className="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center mb-4">
           <Users size={24} />
         </div>
         <h3 className="font-bold text-lg">Resource Allocation Engine</h3>
         <p className="text-zinc-500 text-sm mt-2 max-w-md text-center">
           Assign resources to WBS tasks to automatically generate the Bill of Quantities (BoQ) and project cost baseline.
         </p>
      </div>
    </div>
  );
};

// ============================================================================
// 1. PROCUREMENT PAGE
// ============================================================================
export const ProcurementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Procurement & Sourcing</h1>
        <p className="text-zinc-500 text-sm">Monitor Purchase Requisitions, RFQs, and Purchase Orders (PO).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-900/10">
            <h3 className="font-semibold text-xs uppercase text-zinc-400">Active Purchase Orders</h3>
            <button className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[11px] font-semibold">New PO</button>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase">
                <th className="p-3">PO Number</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Delivery Date</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <td className="p-3 font-semibold text-brand-400">PO-2026-004</td>
                <td className="p-3">Concrete Supply Indo Ltd</td>
                <td className="p-3 font-medium">$42,000</td>
                <td className="p-3">2026-06-25</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span></td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-brand-400">PO-2026-005</td>
                <td className="p-3">Steel Fabricators PT</td>
                <td className="p-3 font-medium">$78,500</td>
                <td className="p-3">2026-07-02</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Sent</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
          <h3 className="font-semibold text-sm mb-4">Vendor Directory & Ratings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="font-semibold text-xs">Concrete Supply Indo Ltd</h4>
                <span className="text-[10px] text-zinc-500">Materials supply</span>
              </div>
              <span className="text-xs font-bold text-yellow-500">★ 4.8</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-xs">Steel Fabricators PT</h4>
                <span className="text-[10px] text-zinc-500">Structural fabrication</span>
              </div>
              <span className="text-xs font-bold text-yellow-500">★ 4.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. DOCUMENTS PAGE
// ============================================================================
export const DocumentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Management (DMS)</h1>
          <p className="text-zinc-500 text-sm">Store project drawings, revision records, and electronic approvals.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg">
          <Upload size={14} />
          <span>Upload File</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-900/10">
              <th className="p-3">Doc Number</th>
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">Active Rev</th>
              <th className="p-3">Status</th>
              <th className="p-3">Signoff Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <tr>
              <td className="p-3 font-semibold text-brand-400">EPCS-DWG-CIV-002</td>
              <td className="p-3">Foundation Plan layout detail</td>
              <td className="p-3">Drawing</td>
              <td className="p-3">Rev 1</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span></td>
              <td className="p-3 text-zinc-500">Signoff completed</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-brand-400">EPCS-SPC-MEC-010</td>
              <td className="p-3">Pumping piping systems specs</td>
              <td className="p-3">Specification</td>
              <td className="p-3">Rev A</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Under Review</span></td>
              <td className="p-3">
                <button className="px-2 py-0.5 bg-brand-500 text-white rounded text-[10px]">Approve</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SAFETY & QUALITY PAGE
// ============================================================================
export const SafetyPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HSE & Quality Control</h1>
          <p className="text-zinc-500 text-sm">Conduct structural inspections, log incident audits, and trace open NCRs.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg">
          <ShieldAlert size={14} />
          <span>Report Incident</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* NCR widget */}
        <div className="md:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-900/10">
            <h3 className="font-semibold text-xs text-zinc-400 uppercase">Non-Conformance Reports (NCR)</h3>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase">
                <th className="p-3">NCR Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Target Date</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <td className="p-3 font-semibold text-red-500">NCR-CIV-021</td>
                <td className="p-3">Concrete strength core result below baseline specs</td>
                <td className="p-3">2026-06-20</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Open</span></td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-red-500">NCR-MEC-014</td>
                <td className="p-3">Welding crack detected in line A pump outlet flange</td>
                <td className="p-3">2026-06-18</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Inspections sidebar */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="font-semibold text-sm">Site Inspections Checklist</h3>
          <div className="space-y-3">
            <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-semibold">Excavation Prep</h4>
                <p className="text-[10px] text-zinc-500">Inspector: John</p>
              </div>
              <span className="text-green-500 font-bold">Passed</span>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-semibold">Rebar Alignment</h4>
                <p className="text-[10px] text-zinc-500">Inspector: John</p>
              </div>
              <span className="text-red-400 font-bold">Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. AI ASSISTANT PAGE
// ============================================================================
export const AIAssistantPage: React.FC = () => {
  const [aiReport, setAiReport] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReport = () => {
    setLoading(true);
    setTimeout(() => {
      setAiReport(`[AI Executive Summary - Generated June 2026]
Project Status: CAUTION (Health score: 78/100)
- Cost Performance Index (CPI) reflects 1.05, indicating cost is well controlled.
- Schedule Performance Index (SPI) is at 0.93. The cable tray installation task is critical path bottleneck.
- Delay Forecast: 15% probability of a 12-day milestone slippage on foundation pouring due to government permit backlog.
- Recommended Action: Expedite concrete submittals and initiate extra shift work on clearing grading tasks.`);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Project Predictor Assistant</h1>
        <p className="text-zinc-500 text-sm">Leveraging LLM models to analyze budget drifts, schedule bottlenecks, and supply chain risks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Assistant controls */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="font-semibold text-sm">Analysis Controls</h3>
          <div className="space-y-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold"
            >
              <BrainCircuit size={16} />
              <span>{loading ? 'Analyzing Data...' : 'Generate Executive Report'}</span>
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-semibold">
              <Sparkles size={16} />
              <span>Predict Supply Chain Delays</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">LLM Provider:</span>
              <span className="font-semibold text-brand-400">Gemini-1.5-Flash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">API Status:</span>
              <span className="text-green-500 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* AI Output Window */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-6 min-h-[300px] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AI Assistant Output</span>
            {aiReport ? (
              <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap mt-4 leading-relaxed bg-zinc-900/50 p-4 rounded border border-zinc-800">
                {aiReport}
              </pre>
            ) : (
              <p className="text-zinc-500 text-xs mt-12 text-center">
                Click on the controls to analyze project and output diagnostic summaries.
              </p>
            )}
          </div>
          {aiReport && (
            <div className="flex justify-end gap-2 text-xs pt-4 border-t border-zinc-800">
              <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">Copy Draft</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ============================================================================
// 5. SETTINGS & BILLING PAGE
// ============================================================================
export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Settings</h1>
        <p className="text-zinc-500 text-sm">Configure multi-tenant limits, SMTP email triggers, and view subscriptions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active plan billing */}
        <div className="md:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-6">
          <div>
            <h3 className="font-semibold text-sm">SaaS Active Plan Selection</h3>
            <p className="text-xs text-zinc-500 mt-1">Select appropriate pricing plan suitable for your scale.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 text-left">
              <h4 className="font-bold text-xs">Starter</h4>
              <p className="text-sm font-bold mt-1 text-zinc-400">$99 / mo</p>
              <ul className="text-[10px] text-zinc-500 mt-3 space-y-1">
                <li>• Up to 3 projects</li>
                <li>• 5 team members</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border-2 border-brand-500 bg-brand-500/5 text-left relative">
              <span className="absolute -top-2 right-2 px-1.5 py-0.5 bg-brand-600 text-white rounded text-[8px] uppercase font-bold">Active</span>
              <h4 className="font-bold text-xs text-brand-400">Professional</h4>
              <p className="text-sm font-bold mt-1 text-zinc-200">$299 / mo</p>
              <ul className="text-[10px] text-zinc-400 mt-3 space-y-1">
                <li>• Up to 15 projects</li>
                <li>• 50 team members</li>
                <li>• EVM Curves & Gantt</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 text-left">
              <h4 className="font-bold text-xs">Enterprise</h4>
              <p className="text-sm font-bold mt-1 text-zinc-400">Custom</p>
              <ul className="text-[10px] text-zinc-500 mt-3 space-y-1">
                <li>• Unlimited projects</li>
                <li>• Custom LLM api</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integration indicators */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="font-semibold text-sm">Enterprise Integrations</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">SMTP Engine</span>
              <span className="text-green-500 font-semibold">Active</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">WhatsApp Alert</span>
              <span className="text-yellow-500 font-semibold">Disabled</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-400">Google OAuth 2.0</span>
              <span className="text-green-500 font-semibold">Active</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
