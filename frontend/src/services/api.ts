import { Collector, AuditLogEntry, RunHistoryEntry, CollectorStats, SSEEvent } from '../types';

const API_BASE = '/api';

export async function fetchCollectors(): Promise<Collector[]> {
  const res = await fetch(`${API_BASE}/collectors`);
  if (!res.ok) throw new Error('Failed to fetch collectors');
  return res.json();
}

export async function fetchAuditTrail(collectorId: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/audit/${collectorId}?limit=${limit}&include_beats=true`);
  if (!res.ok) throw new Error('Failed to fetch audit log');
  return res.json();
}

export async function fetchRunHistory(collectorId: string): Promise<RunHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/history/${collectorId}`);
  if (!res.ok) throw new Error('Failed to fetch run history');
  return res.json();
}

export async function fetchCollectorStats(collectorId: string): Promise<CollectorStats> {
  const res = await fetch(`${API_BASE}/stats/${collectorId}`);
  if (!res.ok) throw new Error('Failed to fetch collector stats');
  return res.json();
}

export async function fetchLatestCleanData(collectorId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/data/${collectorId}/latest`);
  if (!res.ok) throw new Error('Failed to fetch clean data');
  return res.json();
}

export async function triggerDemoBreak(collectorId: string, breakType: string, targetField?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scraper/${collectorId}/demo-break`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ break_type: breakType, target_field: targetField })
  });
  if (!res.ok) throw new Error('Failed to trigger demo break');
  return res.json();
}

export async function clearAuditTrail(collectorId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/audit/${collectorId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear audit trail');
  return res.json();
}

export function subscribeToEvents(onEvent: (event: SSEEvent) => void): () => void {
  const eventSource = new EventSource(`${API_BASE}/events`);

  eventSource.onmessage = (e) => {
    try {
      const parsed: SSEEvent = JSON.parse(e.data);
      onEvent(parsed);
    } catch (err) {
      console.warn('Error parsing SSE event:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
  };

  return () => {
    eventSource.close();
  };
}
