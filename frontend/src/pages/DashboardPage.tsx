import React from 'react';
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

const mockSCurveData = [
  { month: 'Jan', Planned: 10, Actual: 8, Forecast: 8 },
  { month: 'Feb', Planned: 25, Actual: 20, Forecast: 22 },
  { month: 'Mar', Planned: 45, Actual: 42, Forecast: 43 },
  { month: 'Apr', Planned: 70, Actual: 62, Forecast: 65 },
  { month: 'May', Planned: 85, Actual: null, Forecast: 80 },
  { month: 'Jun', Planned: 100, Actual: null, Forecast: 100 },
];

const mockCostAnalysis = [
  { name: 'Civil Works', Budget: 500000, Actual: 480000 },
  { name: 'Electrical', Budget: 350000, Actual: 380000 },
  { name: 'Mechanical', Budget: 600000, Actual: 590000 },
  { name: 'Procurement', Budget: 800000, Actual: 750000 },
];

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-8">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Control Dashboard</h1>
          <p className="text-zinc-500 text-sm">Real-time status overview across portfolio and resources.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            Portfolio Health: 92/100 (Optimal)
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* PV / Budget Card */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Portfolio Budget</span>
            <h3 className="text-2xl font-bold mt-1">$2.25M</h3>
            <span className="text-[10px] text-green-500 font-semibold">+12% allocation baseline</span>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-lg">
            <Activity size={20} />
          </div>
        </div>

        {/* CPI Index */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Cost Index (CPI)</span>
            <h3 className="text-2xl font-bold mt-1">1.04</h3>
            <span className="text-[10px] text-green-500 font-semibold">Under Budget (CPI &gt; 1.0)</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* SPI Index */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Schedule Index (SPI)</span>
            <h3 className="text-2xl font-bold mt-1">0.96</h3>
            <span className="text-[10px] text-yellow-500 font-semibold">Slightly Delayed (SPI &lt; 1.0)</span>
          </div>
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase">Active Labor Count</span>
            <h3 className="text-2xl font-bold mt-1">142</h3>
            <span className="text-[10px] text-zinc-400">across 4 active locations</span>
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
            <h3 className="font-semibold text-sm">Portfolio Cumulative Progress (S-Curve)</h3>
            <span className="text-xs text-zinc-400">Planned vs Actual vs Forecast</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSCurveData}>
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
            <h3 className="font-semibold text-sm">Budget vs Actuals Cost (BoQ Category)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockCostAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                <th className="p-4 font-semibold">Budget (USD)</th>
                <th className="p-4 font-semibold">Progress</th>
                <th className="p-4 font-semibold">Health status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr className="hover:bg-zinc-500/5 transition-colors">
                <td className="p-4 font-medium">EPCS-SLR-01</td>
                <td className="p-4">Solar PV Farm 50MW Grid Link</td>
                <td className="p-4">Banten, ID</td>
                <td className="p-4 font-medium">$850,000</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full" style={{ width: '42%' }} />
                    </div>
                    <span>42%</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold border border-green-500/20">On Track</span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-500/5 transition-colors">
                <td className="p-4 font-medium">EPCS-DC-04</td>
                <td className="p-4">Data Center Hyperscale Hall B</td>
                <td className="p-4">Cikarang, ID</td>
                <td className="p-4 font-medium">$1,400,000</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full" style={{ width: '20%' }} />
                    </div>
                    <span>20%</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-semibold border border-yellow-500/20">Caution</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
