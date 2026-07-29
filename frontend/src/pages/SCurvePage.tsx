import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Percent, DollarSign } from 'lucide-react';
import { request } from '../services/api';

type Project = {
  id: string;
  code: string;
  name: string;
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

type SCurvePoint = {
  date: string;
  plannedProgress: number;
  actualProgress: number;
  forecastProgress: number;
};

export const SCurvePage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [evm, setEvm] = useState<EVMResult | null>(null);
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
        const [evmData, sCurveData] = await Promise.all([
          request<EVMResult>(`/analytics/${selectedProjectId}/evm`),
          request<SCurvePoint[]>(`/analytics/${selectedProjectId}/s-curve`),
        ]);
        setEvm(evmData);
        setSCurve(sCurveData);
      } catch (error) {
        console.error('Failed to load S-curve analytics', error);
        setEvm(null);
        setSCurve([]);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const chartData = useMemo(
    () =>
      sCurve.map((point) => ({
        month: new Date(point.date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        Planned: point.plannedProgress,
        Actual: point.actualProgress,
        Forecast: point.forecastProgress,
      })),
    [sCurve]
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">S-Curve & Earned Value Management (EVM)</h1>
        <p className="text-zinc-500 text-sm">Visualizing baseline schedules, cumulative actuals, and cost performance trends.</p>
        <div className="mt-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="min-w-[260px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* EVM Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Planned Value (PV)</span>
          <p className="text-xl font-bold mt-1">{evm ? `$${evm.pv.toLocaleString()}` : '-'}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Earned Value (EV)</span>
          <p className="text-xl font-bold mt-1">{evm ? `$${evm.ev.toLocaleString()}` : '-'}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Actual Cost (AC)</span>
          <p className="text-xl font-bold mt-1">{evm ? `$${evm.ac.toLocaleString()}` : '-'}</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Cost Variance (CV)</span>
          <p className={`text-xl font-bold mt-1 ${(evm?.cv || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {evm ? `${evm.cv >= 0 ? '+' : ''}$${Math.abs(evm.cv).toLocaleString()}` : '-'}
          </p>
        </div>
      </div>

      {/* S-Curve Graph Card */}
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
        <h3 className="font-semibold text-sm mb-6">{selectedProject ? `${selectedProject.name} - Cumulative S-Curve` : 'Cumulative S-Curve'}</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Planned" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2.5} />
              <Line type="monotone" dataKey="Forecast" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="text-xs text-zinc-500 mt-3">Loading analytics...</p>}
      </div>

      {/* CPI/SPI Indicator Metrics Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CPI Analysis */}
        <div className="p-6 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl flex gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg h-fit">
            <DollarSign size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Cost Performance Index (CPI): {evm ? evm.cpi.toFixed(2) : '-'}</h4>
            <p className="text-zinc-500 text-xs mt-1">
              {evm
                ? evm.cpi >= 1
                  ? 'For every cost unit spent, earned value is above plan. Project is currently under budget.'
                  : 'For every cost unit spent, earned value is below plan. Project is currently over budget.'
                : 'CPI insight will appear after analytics data is loaded.'}
            </p>
          </div>
        </div>

        {/* SPI Analysis */}
        <div className="p-6 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl flex gap-4">
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg h-fit">
            <Percent size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Schedule Performance Index (SPI): {evm ? evm.spi.toFixed(2) : '-'}</h4>
            <p className="text-zinc-500 text-xs mt-1">
              {evm
                ? evm.spi >= 1
                  ? 'Execution pace is at or above planned baseline schedule.'
                  : 'Execution pace is below planned baseline schedule and may require corrective actions.'
                : 'SPI insight will appear after analytics data is loaded.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
