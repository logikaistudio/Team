import React from 'react';
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

const mockSCurveData = [
  { month: 'Jan', Planned: 5, Actual: 4 },
  { month: 'Feb', Planned: 18, Actual: 15 },
  { month: 'Mar', Planned: 35, Actual: 32 },
  { month: 'Apr', Planned: 60, Actual: 54 },
  { month: 'May', Planned: 80, Actual: 72 },
  { month: 'Jun', Planned: 95, Actual: 88 },
  { month: 'Jul', Planned: 100, Actual: null },
];

export const SCurvePage: React.FC = () => {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">S-Curve & Earned Value Management (EVM)</h1>
        <p className="text-zinc-500 text-sm">Visualizing baseline schedules, cumulative actuals, and cost performance trends.</p>
      </div>

      {/* EVM Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Planned Value (PV)</span>
          <p className="text-xl font-bold mt-1">$450,000</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Earned Value (EV)</span>
          <p className="text-xl font-bold mt-1">$420,000</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Actual Cost (AC)</span>
          <p className="text-xl font-bold mt-1">$400,000</p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Cost Variance (CV)</span>
          <p className="text-xl font-bold mt-1 text-green-500">+$20,000</p>
        </div>
      </div>

      {/* S-Curve Graph Card */}
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl">
        <h3 className="font-semibold text-sm mb-6">Cumulative S-Curve</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockSCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Planned" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CPI/SPI Indicator Metrics Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CPI Analysis */}
        <div className="p-6 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl flex gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg h-fit">
            <DollarSign size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Cost Performance Index (CPI) : 1.05</h4>
            <p className="text-zinc-500 text-xs mt-1">
              For every dollar spent, the project earned $1.05 worth of work. The project is currently under budget.
            </p>
          </div>
        </div>

        {/* SPI Analysis */}
        <div className="p-6 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl flex gap-4">
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg h-fit">
            <Percent size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Schedule Performance Index (SPI) : 0.93</h4>
            <p className="text-zinc-500 text-xs mt-1">
              The project is progressing at 93% of the planned schedule baseline. Remedial scheduling options are recommended.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
