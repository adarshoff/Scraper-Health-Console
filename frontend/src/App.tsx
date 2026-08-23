import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FleetView } from './components/FleetView';
import { CollectorDetail } from './components/CollectorDetail';
import { CustomScraperStudio } from './components/CustomScraperStudio';
import { LiveTerminalConsole } from './components/LiveTerminalConsole';
import { Collector, AuditLogEntry, RunHistoryEntry, CollectorStats, SSEEvent } from './types';
import {
  fetchCollectors,
  fetchAuditTrail,
  fetchRunHistory,
  fetchCollectorStats,
  fetchLatestCleanData,
  subscribeToEvents
} from './services/api';
import { Activity, Globe, Terminal } from 'lucide-react';

export function App() {
  const [activeMainTab, setActiveMainTab] = useState<'fleet' | 'studio' | 'terminal'>('fleet');
  
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string | null>(null);
  
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [cleanData, setCleanData] = useState<any>(null);

  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);

  const loadCollectors = useCallback(async () => {
    try {
      const data = await fetchCollectors();
      setCollectors(data);
      if (data.length > 0 && !selectedCollectorId) {
        setSelectedCollectorId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching collectors:', err);
    }
  }, [selectedCollectorId]);

  const loadCollectorDetails = useCallback(async (id: string) => {
    try {
      const [s, l, h, c] = await Promise.all([
        fetchCollectorStats(id).catch(() => null),
        fetchAuditTrail(id).catch(() => []),
        fetchRunHistory(id).catch(() => []),
        fetchLatestCleanData(id).catch(() => null)
      ]);
      setStats(s);
      setLogs(l);
      setHistory(h);
      setCleanData(c);
    } catch (err) {
      console.error('Error loading collector details:', err);
    }
  }, []);

  useEffect(() => {
    loadCollectors();
  }, [loadCollectors]);

  useEffect(() => {
    if (selectedCollectorId) {
      loadCollectorDetails(selectedCollectorId);
    }
  }, [selectedCollectorId, loadCollectorDetails]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((event: SSEEvent) => {
      setIsSseConnected(true);
      loadCollectors();
      if (selectedCollectorId && event.collector_id === selectedCollectorId) {
        loadCollectorDetails(selectedCollectorId);
      }
    });

    // Active polling interval for real-time telemetry and decision log updates
    const interval = setInterval(() => {
      loadCollectors();
      if (selectedCollectorId) {
        loadCollectorDetails(selectedCollectorId);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [selectedCollectorId, loadCollectors, loadCollectorDetails]);

  const selectedCollector = collectors.find((c) => c.id === selectedCollectorId);

  return (
    <div className="min-h-screen bg-mission-grid bg-[#060911] text-slate-100 font-sans flex flex-col">
      
      {/* Top Header */}
      <Header
        collectors={collectors}
        isSseConnected={isSseConnected}
      />

      {/* Navigation Mode Switcher Bar */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-2.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => setActiveMainTab('fleet')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeMainTab === 'fleet'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 glow-cyan font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>FLEET MONITOR & SELF-HEALING CONSOLE</span>
          </button>

          <button
            onClick={() => setActiveMainTab('studio')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeMainTab === 'studio'
                ? 'bg-purple-950 text-purple-300 border border-purple-500/40 glow-cyan font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>CUSTOM URL SCRAPER & HEAL STUDIO</span>
          </button>

          <button
            onClick={() => setActiveMainTab('terminal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeMainTab === 'terminal'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 glow-cyan font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>LIVE TERMINAL CONSOLE</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {activeMainTab === 'fleet' ? (
          <>
            <FleetView
              collectors={collectors}
              selectedCollectorId={selectedCollectorId}
              onSelectCollector={(id) => setSelectedCollectorId(id)}
            />

            {selectedCollector ? (
              <CollectorDetail
                collector={selectedCollector}
                stats={stats}
                logs={logs}
                history={history}
                cleanData={cleanData}
                onRefresh={() => loadCollectorDetails(selectedCollector.id)}
              />
            ) : (
              <div className="p-12 text-center glass-panel rounded-2xl font-mono text-sm text-slate-400">
                Select a collector from the fleet view to inspect autonomous telemetry.
              </div>
            )}
          </>
        ) : activeMainTab === 'studio' ? (
          <CustomScraperStudio />
        ) : (
          <LiveTerminalConsole />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 px-6 text-center text-xs font-mono text-slate-400">
        Scraper Health Console • Powered by Bright Data Scraper Studio • Autonomous Self-Healing Platform
      </footer>

    </div>
  );
}

export default App;
