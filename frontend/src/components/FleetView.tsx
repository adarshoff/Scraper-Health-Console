import React from 'react';
import { Collector, CollectorStatus } from '../types';
import { EcgPulse } from './EcgPulse';
import { Activity, Clock, ShieldCheck, Zap, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';

interface FleetViewProps {
  collectors: Collector[];
  selectedCollectorId: string | null;
  onSelectCollector: (id: string) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  collectors,
  selectedCollectorId,
  onSelectCollector
}) => {
  const getStatusBadge = (status: CollectorStatus) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> HEALTHY</span>;
      case 'recovered':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> RECOVERED</span>;
      case 'degraded':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> DEGRADED</span>;
      case 'diagnosing':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-purple-950/80 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 animate-pulse"><Activity className="w-3.5 h-3.5" /> DIAGNOSING</span>;
      case 'healing':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 animate-pulse"><Zap className="w-3.5 h-3.5 animate-spin" /> HEALING</span>;
      case 'heal_failed':
        return <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> HEAL EXHAUSTED</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            COLLECTOR FLEET STATUS ({collectors.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time autonomous monitoring state machines with dynamic self-adjusting schedules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectors.map((collector) => {
          const isSelected = collector.id === selectedCollectorId;

          return (
            <div
              key={collector.id}
              onClick={() => onSelectCollector(collector.id)}
              className={`glass-panel glass-panel-interactive rounded-2xl p-5 cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                isSelected ? 'border-cyan-500/60 ring-1 ring-cyan-500/40 glow-cyan' : ''
              }`}
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-white hover:text-cyan-300 transition-colors">
                      {collector.name}
                    </h3>
                    <a
                      href={collector.target_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 mt-0.5 truncate max-w-[220px]"
                    >
                      <span>{collector.target_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                  {getStatusBadge(collector.status)}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {collector.description}
                </p>
              </div>

              {/* Dynamic Animated ECG Pulse Waveform */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>LIVE ECG WAVEFORM</span>
                  <span className="text-cyan-400">{collector.status.toUpperCase()}</span>
                </div>
                <EcgPulse status={collector.status} className="h-16 w-full" />
              </div>

              {/* Card Footer Info */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>POLL:</span>
                  <span className={`font-semibold ${collector.current_poll_interval < collector.baseline_poll_interval ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
                    {collector.current_poll_interval}s
                  </span>
                  {collector.current_poll_interval < collector.baseline_poll_interval && (
                    <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      TIGHTENED
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-slate-400">
                  <span>HEALS: <strong className="text-white">{collector.total_heals}</strong></span>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
