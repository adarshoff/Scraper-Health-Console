import React from 'react';
import { AuditLogEntry, SeverityLevel } from '../types';
import {
  Activity,
  AlertTriangle,
  FileSearch,
  Wrench,
  CheckCircle2,
  RotateCcw,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Trash2 } from 'lucide-react';

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  collectorId?: string;
  onClearLogs?: () => void;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs, onClearLogs }) => {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const getEventIcon = (eventType: string, severity: SeverityLevel) => {
    switch (eventType) {
      case 'beat':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'break':
      case 'degraded_minor':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'diagnose':
        return <FileSearch className="w-4 h-4 text-purple-400" />;
      case 'heal_attempt':
        return <Wrench className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'verify':
        return <CheckCircle2 className="w-4 h-4 text-cyan-400" />;
      case 'rollback':
        return <RotateCcw className="w-4 h-4 text-rose-400" />;
      case 'recovered':
        return <Zap className="w-4 h-4 text-emerald-400 glow-emerald" />;
      case 'heal_exhausted':
        return <AlertTriangle className="w-4 h-4 text-rose-500 glow-rose" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'recovered':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'heal_attempt':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40';
      case 'diagnose':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'rollback':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      case 'heal_exhausted':
        return 'bg-rose-950 text-rose-400 border-rose-600/50';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl text-slate-400 font-mono text-xs">
        No autonomous audit events recorded yet for this collector.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold font-mono tracking-tight text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          AUTONOMOUS DECISION TRAIL & DIAGNOSTIC AUDIT LOG ({logs.length})
        </h3>
        <div className="flex items-center space-x-3 font-mono text-xs">
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR LOGS</span>
            </button>
          )}
          <span className="text-slate-400">PROOF OF AUTONOMY • ZERO HUMAN INPUT</span>
        </div>
      </div>

      {/* Clear YouTube / Presentation Explainer Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono flex items-center justify-between text-slate-300 shadow-md">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>
            <strong>AI DECISION TIMELINE:</strong> Displays critical state machine transitions (Break Detection $\rightarrow$ Structural JSON Diff $\rightarrow$ AI Heal Prompt $\rightarrow$ Template Verification $\rightarrow$ Recovery).
          </span>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {logs.map((log) => {
          const isExpanded = expandedId === log.id;
          const hasDetails = log.diff_summary || log.prompt_used;

          return (
            <div key={log.id} className="relative group">
              {/* Timeline Node Icon */}
              <div className="absolute -left-6 top-1 p-1 rounded-full bg-[#080c14] border border-slate-700 shadow-md">
                {getEventIcon(log.event_type, log.severity)}
              </div>

              {/* Event Card */}
              <div className="glass-panel rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${getEventBadgeColor(log.event_type)}`}>
                        {log.event_type.toUpperCase()}
                      </span>
                      {log.attempt_number > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                          ATTEMPT #{log.attempt_number}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-white font-mono">
                        {log.step_title}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {log.reasoning}
                    </p>
                  </div>

                  <div className="flex flex-col items-end text-[11px] font-mono text-slate-400 flex-shrink-0">
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span className="text-[10px] text-slate-400">Poll: {log.poll_interval}s</span>
                  </div>
                </div>

                {/* Collapsible Details */}
                {hasDetails && (
                  <div className="pt-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex items-center space-x-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
                    >
                      <span>{isExpanded ? 'Hide Structural Diff & Prompt' : 'View Structural Diff & Generated Prompt'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                        {log.diff_summary && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-purple-400 font-semibold tracking-wider">
                              STRUCTURAL DIFF ANALYSIS:
                            </span>
                            <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-purple-500/20">
                              {log.diff_summary}
                            </pre>
                          </div>
                        )}

                        {log.prompt_used && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-cyan-400 font-semibold tracking-wider">
                              CODE-GENERATED HEAL PROMPT SENT TO BDATA:
                            </span>
                            <pre className="p-3 rounded-lg bg-slate-950 text-cyan-200 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-cyan-500/20">
                              {log.prompt_used}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
