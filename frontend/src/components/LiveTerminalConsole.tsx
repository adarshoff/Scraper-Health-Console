import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, CheckCircle2, AlertTriangle, RotateCw, Copy, Check } from 'lucide-react';

export const LiveTerminalConsole: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleRunScript = async () => {
    setIsRunning(true);
    setLogs([
      "========================================",
      "      AI SELF-HEALING SCRAPERS",
      "========================================",
      ""
    ]);

    try {
      const res = await fetch('/api/terminal/run', { method: 'POST' });
      const text = await res.text();
      const lines = text.split('\n');
      setLogs(lines);
    } catch (err: any) {
      setLogs((prev) => [...prev, `❌ Execution Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">STANDALONE CLI RUNNER & AI STEP POLLER</h3>
            <p className="text-slate-400 text-[11px]">
              Outputs live terminal stream: job IDs, validation dicts, root cause analysis, LLM prompts, & AI step diffs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>COPY LOGS</span>
          </button>

          <button
            onClick={handleRunScript}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold transition-all shadow-lg shadow-cyan-950/40 disabled:opacity-50"
          >
            {isRunning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'RUNNING SCRAPERS...' : 'EXECUTE ALL SCRAPERS'}</span>
          </button>
        </div>
      </div>

      {/* Retro Terminal Window */}
      <div className="rounded-2xl bg-[#04070d] border border-slate-800 p-5 shadow-2xl relative overflow-hidden space-y-2">
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-slate-500 text-[11px] ml-2">powershell - python main.py</span>
        </div>

        <div className="max-h-[550px] overflow-y-auto space-y-1 pr-2 leading-relaxed text-[11px]">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-12 text-center">
              Click <strong className="text-cyan-400 font-mono">"EXECUTE ALL SCRAPERS"</strong> or run <code className="text-emerald-400 font-mono">python main.py</code> in your terminal to view real-time Bright Data AI healing logs.
            </div>
          ) : (
            logs.map((line, idx) => {
              let colorClass = 'text-slate-300';
              if (line.includes('PROCESSING:') || line.includes('RUNNING:')) colorClass = 'text-cyan-400 font-bold';
              else if (line.includes('✅') || line.includes('HEALTHY')) colorClass = 'text-emerald-400 font-bold';
              else if (line.includes('❌') || line.includes('BROKEN')) colorClass = 'text-rose-400 font-bold';
              else if (line.includes('LLM GENERATED HEALING PROMPT')) colorClass = 'text-amber-300 font-bold';
              else if (line.includes('[Healing] poll')) colorClass = 'text-purple-300';
              else if (line.includes('TEMPLATE DIFF GENERATED:')) colorClass = 'text-cyan-300 font-bold';

              return (
                <div key={idx} className={colorClass}>
                  {line}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

    </div>
  );
};
