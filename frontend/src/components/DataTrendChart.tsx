import React from 'react';
import { RunHistoryEntry } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';

interface DataTrendChartProps {
  history: RunHistoryEntry[];
}

export const DataTrendChart: React.FC<DataTrendChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center glass-panel rounded-2xl text-slate-400 font-mono text-xs">
        No historical extraction trend data recorded yet.
      </div>
    );
  }

  // Format historical records for Recharts (reverse to show chronological left-to-right)
  const chartData = [...history].reverse().map((entry) => ({
    time: new Date(entry.run_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    score: Math.round(entry.schema_score * 100),
    latencyMs: Math.round(entry.execution_time_ms),
    itemCount: entry.data ? entry.data.length : 0
  }));

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            DOWNSTREAM PRODUCT ANALYTICS: EXTRACTION QUALITY OVER TIME
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Persisted run history powering downstream data consumers & schema health telemetry
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>Schema Score %</span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Extracted Items</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />

            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
              }}
              formatter={(value: any, name: string) => [
                name === 'score' ? `${value}%` : value,
                name === 'score' ? 'Schema Health Score' : 'Extracted Item Count'
              ]}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#scoreGradient)"
            />
            <Area
              type="monotone"
              dataKey="itemCount"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#itemsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
