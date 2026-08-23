import React, { useState } from 'react';
import { Collector } from '../types';
import { AlertTriangle, X, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { triggerDemoBreak } from '../services/api';

interface DemoBreakModalProps {
  collectors: Collector[];
  initialCollectorId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (collectorId: string, breakType: string) => void;
}

export const DemoBreakModal: React.FC<DemoBreakModalProps> = ({
  collectors,
  initialCollectorId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>(
    initialCollectorId || (collectors.length > 0 ? collectors[0].id : '')
  );
  const [breakType, setBreakType] = useState<string>('empty_field');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleArmBreak = async () => {
    setLoading(true);
    setError(null);
    try {
      await triggerDemoBreak(selectedCollectorId, breakType);
      onSuccess(selectedCollectorId, breakType);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to arm demo break');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-2xl border border-rose-500/40 p-6 space-y-6 glow-rose relative">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                INJECT DEMO BREAK
              </h2>
              <p className="text-xs text-slate-400">
                Synthetic HTML selector shift trigger for live autonomous demo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 font-mono text-xs">
          {/* Target Collector Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block">SELECT TARGET COLLECTOR:</label>
            <select
              value={selectedCollectorId}
              onChange={(e) => setSelectedCollectorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            >
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Break Type Options */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">SIMULATED BREAK METHOD:</label>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: 'empty_field',
                  title: 'Required Field Stripped (Empty String)',
                  desc: 'Simulates price/title selector breaking — returns empty value across fields.'
                },
                {
                  id: 'type_mismatch',
                  title: 'Data Type Corruption / Mismatch',
                  desc: 'Simulates price field returning non-numeric text string.'
                },
                {
                  id: 'short_text',
                  title: 'Suspicious Short Text Anomaly',
                  desc: 'Simulates extracted text length dropping below historical baseline average.'
                },
                {
                  id: 'total_failure',
                  title: 'Critical Outrage / Zero Items Returned',
                  desc: 'Simulates complete page layout block returning empty payload.'
                }
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setBreakType(opt.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-start space-x-3 transition-all ${
                    breakType === opt.id
                      ? 'bg-rose-950/40 border-rose-500 text-white ring-1 ring-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="breakType"
                    checked={breakType === opt.id}
                    onChange={() => setBreakType(opt.id)}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">{opt.title}</span>
                    <span className="text-[11px] text-slate-400 font-sans leading-normal block mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20 text-slate-300 text-[11px] leading-relaxed font-sans flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Once triggered, the watcher will automatically detect failure on the next cycle, classify severity, diff against stored SQLite baseline, generate heal prompt, call <code className="text-cyan-300">bdata scraper heal</code>, verify, and recover — <strong>100% autonomously with zero manual intervention</strong>!
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleArmBreak}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-mono font-bold shadow-lg shadow-rose-950/40 transition-all hover:scale-105"
          >
            <Play className="w-4 h-4" />
            <span>{loading ? 'ARMING...' : 'ARM DEMO BREAK'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
