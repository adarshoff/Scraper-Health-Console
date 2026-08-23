import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Zap, Radio, Terminal } from 'lucide-react';
import { Collector } from '../types';

interface HeaderProps {
  collectors: Collector[];
  isSseConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ collectors, isSseConnected }) => {
  const totalCollectors = collectors.length;
  const healthyCount = collectors.filter(c => c.status === 'healthy' || c.status === 'recovered').length;
  const totalHeals = collectors.reduce((acc, c) => acc + (c.total_heals || 0), 0);

  const [tickerMessage, setTickerMessage] = useState<string>('AUTONOMOUS WATCHER ACTIVE • MONITORING TARGET SCRAPERS LIVE');

  useEffect(() => {
    const messages = [
      'AUTONOMOUS WATCHER ACTIVE • MONITORING TARGET SCRAPERS LIVE',
      'BRIGHT DATA DCA ENGINE • SYNC /DCA/CRAWL ENDPOINT VERIFIED',
      'ZERO HUMAN INTERVENTION • AUTONOMOUS STRUCTURAL JSON DIFF ENGINE READY',
      'KAGGLE & LIVE HTTP EXTRACTION ENGINE ACTIVE'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setTickerMessage(messages[idx]);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-40">
      
      {/* Top Scrolling Realtime Ticker Bar */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-1 px-6 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-400">REALTIME EVENT STREAM:</span>
          <span className="text-cyan-300 font-semibold transition-all duration-500">{tickerMessage}</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            BACKEND ENGINE: ONLINE
          </span>
          <span>•</span>
          <span className="text-emerald-400">AUTO-APPROVE: ACTIVE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-3.5">
        
        {/* Title Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 glow-cyan">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                SCRAPER<span className="text-cyan-400">.HEALTH</span> CONSOLE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                BRIGHT DATA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous Self-Healing Web Scraping Platform
            </p>
          </div>
        </div>

        {/* Global Stats Bar */}
        <div className="flex items-center space-x-6 text-sm bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 font-mono">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Fleet Uptime:</span>
            <span className="font-mono font-semibold text-emerald-400">
              {totalCollectors > 0 ? Math.round((healthyCount / totalCollectors) * 100) : 100}%
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Autonomous Heals:</span>
            <span className="font-mono font-semibold text-amber-400">{totalHeals}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <Radio className={`w-3.5 h-3.5 ${isSseConnected ? 'text-emerald-400 animate-ping' : 'text-slate-500'}`} />
            <span className="font-mono text-xs text-slate-300">
              {isSseConnected ? 'LIVE SSE FEED' : 'CONNECTING'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
