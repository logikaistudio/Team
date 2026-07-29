import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  BrainCircuit,
  Sparkles,
  Upload,
  Users,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { request } from '../services/api';

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
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; prNumber: string; description: string; estimatedCost: number; requiredDate?: string; status: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await request<Array<{ id: string; name: string }>>('/projects');
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load projects', error);
      }
    };
    loadProjects();
  }, []);

  const loadPRs = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await request<Array<{ id: string; prNumber: string; description: string; estimatedCost: number; requiredDate?: string; status: string }>>(`/enterprise/procurement/pr/${projectId}`);
      setRows(data);
    } catch (error) {
      console.error('Failed to load PR list', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadPRs(selectedProjectId);
    }
  }, [selectedProjectId]);

  const createPR = async () => {
    if (!selectedProjectId) return;
    const prNumber = prompt('PR Number (contoh: PR-2026-001):');
    if (!prNumber) return;
    const description = prompt('Deskripsi PR:', '') || '';
    const estimatedCostRaw = prompt('Estimasi biaya:', '0') || '0';
    const requiredDate = prompt('Required date (YYYY-MM-DD):', '') || '';
    try {
      await request('/enterprise/procurement/pr', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
          prNumber: prNumber.trim(),
          description,
          estimatedCost: Number(estimatedCostRaw) || 0,
          requiredDate: requiredDate || null,
        }),
      });
      await loadPRs(selectedProjectId);
    } catch (error) {
      console.error('Failed to create PR', error);
      alert('Gagal membuat PR.');
    }
  };

  const editPR = async (row: { id: string; description: string; estimatedCost: number; requiredDate?: string; status: string }) => {
    const description = prompt('Deskripsi PR:', row.description || '') ?? row.description;
    const estimatedCostRaw = prompt('Estimasi biaya:', String(row.estimatedCost ?? 0)) ?? String(row.estimatedCost ?? 0);
    const requiredDate = prompt('Required date (YYYY-MM-DD):', row.requiredDate ? row.requiredDate.slice(0, 10) : '') ?? '';
    const status = prompt('Status (draft/submitted/approved/rejected):', row.status) ?? row.status;
    try {
      await request(`/enterprise/procurement/pr/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description,
          estimatedCost: Number(estimatedCostRaw) || 0,
          requiredDate: requiredDate || null,
          status,
        }),
      });
      await loadPRs(selectedProjectId);
    } catch (error) {
      console.error('Failed to update PR', error);
      alert('Gagal mengubah PR.');
    }
  };

  const deletePR = async (id: string) => {
    if (!confirm('Hapus PR ini?')) return;
    try {
      await request(`/enterprise/procurement/pr/${id}`, { method: 'DELETE' });
      await loadPRs(selectedProjectId);
    } catch (error) {
      console.error('Failed to delete PR', error);
      alert('Gagal menghapus PR.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Procurement & Sourcing</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={createPR} className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[11px] font-semibold">Add PR</button>
        </div>
      </div>
      <p className="text-zinc-500 text-sm">Data procurement diambil langsung dari Supabase.</p>

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-zinc-500">Memuat data procurement...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-zinc-500">Belum ada data PR untuk proyek ini.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/30">
                <th className="p-3">PR Number</th>
                <th className="p-3">Description</th>
                <th className="p-3">Estimated Cost</th>
                <th className="p-3">Required Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="p-3 font-semibold text-brand-500">{row.prNumber}</td>
                  <td className="p-3">{row.description || '-'}</td>
                  <td className="p-3">{Number(row.estimatedCost || 0).toLocaleString('id-ID')}</td>
                  <td className="p-3">{row.requiredDate ? new Date(row.requiredDate).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editPR(row)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><Pencil size={14} /></button>
                      <button onClick={() => deletePR(row.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; incidentDate?: string; severity: string; description: string; location: string; status: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await request<Array<{ id: string; name: string }>>('/projects');
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load projects', error);
      }
    };
    loadProjects();
  }, []);

  const loadIncidents = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await request<Array<{ id: string; incidentDate?: string; severity: string; description: string; location: string; status: string }>>(`/enterprise/hse/incidents/${projectId}`);
      setRows(data);
    } catch (error) {
      console.error('Failed to load incidents', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadIncidents(selectedProjectId);
    }
  }, [selectedProjectId]);

  const createIncident = async () => {
    if (!selectedProjectId) return;
    const description = prompt('Deskripsi incident:');
    if (!description) return;
    const severity = prompt('Severity (low/medium/high/critical):', 'medium') || 'medium';
    const location = prompt('Lokasi incident:', '-') || '-';
    const incidentDate = prompt('Tanggal incident (YYYY-MM-DD):', new Date().toISOString().slice(0, 10)) || new Date().toISOString().slice(0, 10);
    try {
      await request('/enterprise/hse/incidents', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
          incidentDate,
          severity,
          description,
          location,
        }),
      });
      await loadIncidents(selectedProjectId);
    } catch (error) {
      console.error('Failed to create incident', error);
      alert('Gagal membuat incident.');
    }
  };

  const editIncident = async (row: { id: string; severity: string; description: string; location: string; status: string }) => {
    const severity = prompt('Severity:', row.severity) ?? row.severity;
    const description = prompt('Deskripsi:', row.description) ?? row.description;
    const location = prompt('Lokasi:', row.location) ?? row.location;
    const status = prompt('Status (investigating/closed):', row.status) ?? row.status;
    try {
      await request(`/enterprise/hse/incidents/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ severity, description, location, status }),
      });
      await loadIncidents(selectedProjectId);
    } catch (error) {
      console.error('Failed to update incident', error);
      alert('Gagal mengubah incident.');
    }
  };

  const deleteIncident = async (id: string) => {
    if (!confirm('Hapus incident ini?')) return;
    try {
      await request(`/enterprise/hse/incidents/${id}`, { method: 'DELETE' });
      await loadIncidents(selectedProjectId);
    } catch (error) {
      console.error('Failed to delete incident', error);
      alert('Gagal menghapus incident.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HSE & Quality Control</h1>
          <p className="text-zinc-500 text-sm">Data incident diambil langsung dari Supabase.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={createIncident} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg">
            <ShieldAlert size={14} />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-zinc-500">Memuat incident...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-zinc-500">Belum ada incident untuk proyek ini.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/30">
                <th className="p-3">Date</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Description</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="p-3">{row.incidentDate ? new Date(row.incidentDate).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-3 font-semibold">{row.severity}</td>
                  <td className="p-3">{row.description}</td>
                  <td className="p-3">{row.location || '-'}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editIncident(row)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><Pencil size={14} /></button>
                      <button onClick={() => deleteIncident(row.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Semua field password wajib diisi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    setChangingPassword(true);
    try {
      await request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password berhasil diubah.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah password.';
      setPasswordMessage(message);
    } finally {
      setChangingPassword(false);
    }
  };

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

      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl max-w-2xl">
        <h3 className="font-semibold text-sm mb-1">Ubah Password</h3>
        <p className="text-xs text-zinc-500 mb-4">Gunakan tombol mata untuk melihat/menutup password agar tidak salah ketik.</p>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Password Saat Ini</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                placeholder="Masukkan password saat ini"
              />
              <button type="button" onClick={() => setShowCurrentPassword((v) => !v)} className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-zinc-300">
                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Password Baru</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                placeholder="Minimal 6 karakter"
              />
              <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-zinc-300">
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Konfirmasi Password Baru</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                placeholder="Ulangi password baru"
              />
              <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-zinc-300">
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {passwordMessage && (
            <div className="text-xs text-zinc-500">{passwordMessage}</div>
          )}

          <button
            type="submit"
            disabled={changingPassword}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg"
          >
            {changingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
};
