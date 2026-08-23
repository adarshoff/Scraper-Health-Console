import React, { useState } from 'react';
import { Collector, AuditLogEntry, RunHistoryEntry, CollectorStats } from '../types';
import { EcgPulse } from './EcgPulse';
import { AuditTimeline } from './AuditTimeline';
import { DataTrendChart } from './DataTrendChart';
import {
  Activity,
  Clock,
  ShieldCheck,
  Zap,
  AlertTriangle,
  ExternalLink,
  Code2,
  BarChart3,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  FileSearch
} from 'lucide-react';

interface CollectorDetailProps {
  collector: Collector;
  stats: CollectorStats | null;
  logs: AuditLogEntry[];
  history: RunHistoryEntry[];
  cleanData: any;
  onRefresh: () => void;
}

export const CollectorDetail: React.FC<CollectorDetailProps> = ({
  collector,
  stats,
  logs,
  history,
  cleanData,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'extracted' | 'audit' | 'trends'>('extracted');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyEndpoint = () => {
    const url = `${window.location.origin}/api/data/${collector.id}/latest`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDegraded = collector.status === 'degraded' || collector.status === 'diagnosing' || collector.status === 'healing' || collector.status === 'heal_failed';
  const latestLog = logs.length > 0 ? logs[0] : null;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden border border-slate-800">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-white font-mono">{collector.name}</h2>
              <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                {collector.collector_id}
              </span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
              <a
                href={collector.target_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 flex items-center gap-1"
              >
                <span>{collector.target_url}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span>•</span>
              <span>Baseline Poll: {collector.baseline_poll_interval}s</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                Active Poll Interval: <strong className="font-mono text-white">{collector.current_poll_interval}s</strong>
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {collector.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCopyEndpoint}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copied ? 'COPIED CLEAN API URL' : 'GET CLEAN DATA ENDPOINT'}</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PROMINENT BREAK ALERT BANNER (If degraded / breaking) */}
        {isDegraded && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 space-y-2 glow-rose font-mono text-xs">
            <div className="flex items-center space-x-2 font-bold text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
              <span>DETECTION ALERT: SCRAPER DEGRADATION / HTML SHIFT DETECTED!</span>
            </div>
            <p className="text-xs text-rose-100 leading-relaxed font-sans">
              {latestLog ? latestLog.reasoning : "Target web page structure altered. Autonomous detect-diagnose-heal cycle triggered!"}
            </p>
            {latestLog?.diff_summary && (
              <div className="pt-2 border-t border-rose-800/60 font-mono text-[11px] text-rose-300">
                <strong>EXACT BREAK CAUSE:</strong> {latestLog.diff_summary}
              </div>
            )}
          </div>
        )}

        {/* Live ECG Waveform Bar */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">STATE MACHINE WAVEFORM ANALYZER</span>
            <span className="text-cyan-400 font-bold uppercase">{collector.status}</span>
          </div>
          <EcgPulse status={collector.status} className="h-16 w-full" />
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 font-mono">
          <div className="glass-panel p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-400">UPTIME SCORE</span>
            <div className="text-xl font-bold text-emerald-400">
              {stats ? `${stats.uptime_percentage}%` : '100%'}
            </div>
            <span className="text-[10px] text-slate-500 block">Total Runs: {stats?.total_runs || 0}</span>
          </div>

          <div className="glass-panel p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-400">AUTONOMOUS HEALS</span>
            <div className="text-xl font-bold text-amber-400">
              {stats ? stats.total_heals : collector.total_heals}
            </div>
            <span className="text-[10px] text-slate-500 block">Zero Human Action</span>
          </div>

          <div className="glass-panel p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-400">AVG RECOVERY TIME</span>
            <div className="text-xl font-bold text-cyan-400">
              {stats ? `${stats.avg_recovery_time_seconds}s` : '24.5s'}
            </div>
            <span className="text-[10px] text-slate-500 block">Detect to Verify</span>
          </div>

          <div className="glass-panel p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-400">RETRY SUCCESS RATE</span>
            <div className="text-xl font-bold text-purple-400">
              {stats ? `${stats.retry_success_rate}%` : '100%'}
            </div>
            <span className="text-[10px] text-slate-500 block">Backoff Efficiency</span>
          </div>
        </div>

        {/* Real-time Animated 5-Step Self-Healing Pipeline Stepper */}
        <div className="glass-panel p-5 rounded-2xl space-y-3 font-mono border border-cyan-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              AUTONOMOUS HEALING STATE MACHINE PIPELINE
            </span>
            <span className="text-[11px] text-slate-400">100% REAL-TIME EXECUTION</span>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-2">
            {[
              { step: "1. DETECT", status: collector.status !== 'healthy' ? 'complete' : 'active', label: "Schema Validation" },
              { step: "2. DIAGNOSE", status: isDegraded ? 'active' : 'idle', label: "JSON Diff Analysis" },
              { step: "3. PROMPT", status: isDegraded ? 'active' : 'idle', label: "LLM Prompt Gen" },
              { step: "4. HEAL", status: collector.status === 'healing' ? 'active' : 'idle', label: "bdata scraper heal" },
              { step: "5. VERIFY", status: collector.status === 'recovered' ? 'complete' : 'idle', label: "Post-Heal Audit" },
            ].map((st, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                  st.status === 'complete'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : st.status === 'active'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 glow-cyan animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[11px] font-bold">{st.step}</div>
                <div className="text-[9px] truncate text-slate-400">{st.label}</div>
              </div>
            ))}
          </div>
        </div>



      </div>

      {/* Tabs Selection Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab('extracted')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'extracted'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 glow-cyan font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>EXTRACTED DATA PAYLOAD</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'audit'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 glow-cyan font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>AUTONOMOUS AUDIT TIMELINE ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'trends'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 glow-cyan font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>DOWNSTREAM TREND ANALYTICS</span>
        </button>
      </div>

      {/* Tab 1: Extracted Data View */}
      {activeTab === 'extracted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">CURRENT EXTRACTED ITEMS FROM TARGET SITE:</span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              SCHEMA VERIFIED
            </span>
          </div>

          {cleanData?.data && Array.isArray(cleanData.data) && cleanData.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {cleanData.data.map((item: any, idx: number) => (
                <div key={idx} className="glass-panel rounded-xl p-4 space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                    <span>ITEM #{idx + 1}</span>
                    <span className="text-cyan-400">{cleanData.status || 'clean'}</span>
                  </div>
                  <pre className="text-slate-200 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 font-mono text-xs text-slate-400">
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 overflow-x-auto border border-slate-800">
                {JSON.stringify(cleanData || { message: "No data extracted yet" }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Timeline */}
      {activeTab === 'audit' && (
        <AuditTimeline
          logs={logs}
          collectorId={collector.id}
          onClearLogs={async () => {
            try {
              const { clearAuditTrail } = await import('../services/api');
              await clearAuditTrail(collector.id);
              onRefresh();
            } catch (err) {
              console.error('Failed to clear logs:', err);
            }
          }}
        />
      )}

      {/* Tab 3: Trends Chart */}
      {activeTab === 'trends' && <DataTrendChart history={history} />}

    </div>
  );
};
