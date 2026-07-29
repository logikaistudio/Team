import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, UserCheck, Activity } from 'lucide-react';
import { request } from '../services/api';

type Project = {
  id: string;
  code: string;
  name: string;
  location?: string;
  budget?: number;
  currency?: string;
  progressPercent?: number;
};

type EVMResult = {
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
};

type HealthScore = {
  score: number;
  status: 'green' | 'yellow' | 'red';
  breakdown: {
    cost: number;
    schedule: number;
    risk: number;
    safety: number;
    quality: number;
  };
};

type SCurvePoint = {
  date: string;
  plannedProgress: number;
  actualProgress: number;
  forecastProgress: number;
};

export const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [evm, setEvm] = useState<EVMResult | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [sCurve, setSCurve] = useState<SCurvePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await request<Project[]>('/projects');
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

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [evmData, healthData, sCurveData] = await Promise.all([
          request<EVMResult>(`/analytics/${selectedProjectId}/evm`),
          request<HealthScore>(`/analytics/${selectedProjectId}/health-score`),
          request<SCurvePoint[]>(`/analytics/${selectedProjectId}/s-curve`),
        ]);
        setEvm(evmData);
        setHealth(healthData);
        setSCurve(sCurveData);
      } catch (error) {
        console.error('Failed to load dashboard analytics', error);
        setEvm(null);
        setHealth(null);
        setSCurve([]);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedCurrency = selectedProject?.currency || 'USD';
  const totalBudget = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.budget || 0), 0),
    [projects]
  );

  const averageProgress = useMemo(() => {
    if (!projects.length) return 0;
    return Math.round(projects.reduce((sum, p) => sum + Number(p.progressPercent || 0), 0) / projects.length);
  }, [projects]);

  const sCurveData = useMemo(
    () =>
      sCurve.map((point) => ({
        month: new Date(point.date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        Planned: point.plannedProgress,
        Actual: point.actualProgress,
        Forecast: point.forecastProgress,
      })),
    [sCurve]
  );

  const costBars = useMemo(
    () => [
      { name: 'PV', Value: evm?.pv || 0 },
      { name: 'EV', Value: evm?.ev || 0 },
      { name: 'AC', Value: evm?.ac || 0 },
    ],
    [evm]
  );

  const healthLabel = health?.status === 'green' ? 'On Track' : health?.status === 'yellow' ? 'Caution' : 'Critical';

  return (
    <div className="space-y-8">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Control Dashboard</h1>
          <p className="text-zinc-500 text-sm">Real-time status overview based on project baseline, WBS, and EVM data.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="min-w-[230px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            {health ? `Project Health: ${health.score}/100 (${healthLabel})` : 'Project Health: N/A'}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* PV / Budget Card */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Portfolio Budget</span>
            <h3 className="text-2xl font-bold mt-1">{selectedCurrency} {totalBudget.toLocaleString()}</h3>
            <span className="text-[10px] text-zinc-400 font-semibold">{projects.length} projects</span>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-lg">
            <Activity size={20} />
          </div>
        </div>

        {/* CPI Index */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Cost Index (CPI)</span>
            <h3 className="text-2xl font-bold mt-1">{evm ? evm.cpi.toFixed(2) : '-'}</h3>
            <span className="text-[10px] text-green-500 font-semibold">{evm ? (evm.cpi >= 1 ? 'Under Budget' : 'Over Budget') : 'No data'}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* SPI Index */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Schedule Index (SPI)</span>
            <h3 className="text-2xl font-bold mt-1">{evm ? evm.spi.toFixed(2) : '-'}</h3>
            <span className="text-[10px] text-yellow-500 font-semibold">{evm ? (evm.spi >= 1 ? 'On Schedule' : 'Delayed') : 'No data'}</span>
          </div>
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Average Progress</span>
            <h3 className="text-2xl font-bold mt-1">{averageProgress}%</h3>
            <span className="text-[10px] text-zinc-400">based on all projects</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <UserCheck size={20} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* S-Curve Graph Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-sm">{selectedProject ? `${selectedProject.name} - S-Curve` : 'Project S-Curve'}</h3>
            <span className="text-xs text-zinc-400">Planned vs Actual vs Forecast</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sCurveData}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Planned" stroke="#6366f1" fillOpacity={1} fill="url(#colorPlanned)" strokeWidth={2} />
                <Area type="monotone" dataKey="Actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={2} />
                <Area type="monotone" dataKey="Forecast" stroke="#eab308" strokeDasharray="5 5" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Budget vs Actuals */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
          <div className="mb-6">
            <h3 className="font-semibold text-sm">EVM Cost Components</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Multi-Project Listing */}
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-sm">Portfolio Multi-Project Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50">
                <th className="p-4 font-semibold">Project Code</th>
                <th className="p-4 font-semibold">Project Name</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Budget</th>
                <th className="p-4 font-semibold">Progress</th>
                <th className="p-4 font-semibold">Health status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {projects.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={6}>{loading ? 'Loading projects...' : 'No project data available.'}</td>
                </tr>
              ) : (
                projects.map((project) => {
                  const progress = Number(project.progressPercent || 0);
                  const status = progress >= 80 ? 'On Track' : progress >= 40 ? 'Caution' : 'Critical';
                  const statusClass =
                    progress >= 80
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : progress >= 40
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20';

                  return (
                    <tr key={project.id} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="p-4 font-medium">{project.code}</td>
                      <td className="p-4">{project.name}</td>
                      <td className="p-4">{project.location || '-'}</td>
                      <td className="p-4 font-medium">{(project.currency || 'USD')} {(Number(project.budget || 0)).toLocaleString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span>{progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold border ${statusClass}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
