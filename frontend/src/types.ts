export type CollectorStatus = 'healthy' | 'degraded' | 'diagnosing' | 'healing' | 'recovered' | 'heal_failed';

export type SeverityLevel = 'NONE' | 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface Collector {
  id: string;
  name: string;
  target_url: string;
  description: string;
  collector_id: string;
  status: CollectorStatus;
  current_severity: SeverityLevel;
  baseline_poll_interval: number;
  current_poll_interval: number;
  consecutive_healthy_runs: number;
  total_heals: number;
  last_healed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  collector_id: string;
  event_type: string;
  severity: SeverityLevel;
  step_title: string;
  reasoning: string;
  diff_summary?: string;
  prompt_used?: string;
  attempt_number: number;
  poll_interval: number;
  created_at: string;
}

export interface RunHistoryEntry {
  id: number;
  collector_id: string;
  run_timestamp: string;
  is_valid: boolean;
  schema_score: number;
  execution_time_ms: number;
  data: any[];
  error_message?: string;
}

export interface CollectorStats {
  collector_id: string;
  collector_name: string;
  uptime_percentage: number;
  total_runs: number;
  successful_runs: number;
  total_heals: number;
  avg_recovery_time_seconds: number;
  retry_success_rate: number;
  current_status: CollectorStatus;
  current_poll_interval: number;
  consecutive_healthy_runs: number;
}

export interface SSEEvent {
  event_type: string;
  collector_id: string;
  timestamp: string;
  data: any;
}
