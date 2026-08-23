from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class CollectorStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DIAGNOSING = "diagnosing"
    HEALING = "healing"
    RECOVERED = "recovered"
    HEAL_FAILED = "heal_failed"

class SeverityLevel(str, Enum):
    NONE = "NONE"
    MINOR = "MINOR"
    MAJOR = "MAJOR"
    CRITICAL = "CRITICAL"

class FieldRule(BaseModel):
    name: str
    required: bool = True
    expected_type: str = "str"  # "str", "int", "float", "url", "list"
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None

class CollectorSchema(BaseModel):
    fields: List[FieldRule]

class Collector(BaseModel):
    id: str
    name: str
    target_url: str
    description: str
    collector_id: str
    status: CollectorStatus = CollectorStatus.HEALTHY
    current_severity: SeverityLevel = SeverityLevel.NONE
    baseline_poll_interval: int = 60  # seconds
    current_poll_interval: int = 60   # self-adjusting seconds
    consecutive_healthy_runs: int = 0
    total_heals: int = 0
    last_healed_at: Optional[str] = None
    created_at: str
    updated_at: str

class CollectorCreate(BaseModel):
    name: str
    target_url: str
    description: str
    collector_id: Optional[str] = None
    baseline_poll_interval: int = 60
    schema_rules: Dict[str, Any]

class DemoBreakRequest(BaseModel):
    break_type: str = "empty_field"  # "empty_field", "type_mismatch", "short_text", "total_failure"
    target_field: Optional[str] = None

class AuditLogEntry(BaseModel):
    id: int
    collector_id: str
    event_type: str  # beat, break, detect, diagnose, heal_attempt, verify, retry, rollback, recovered, heal_exhausted
    severity: SeverityLevel
    step_title: str
    reasoning: str
    diff_summary: Optional[str] = None
    prompt_used: Optional[str] = None
    attempt_number: int = 0
    poll_interval: int = 60
    created_at: str

class RunHistoryEntry(BaseModel):
    id: int
    collector_id: str
    run_timestamp: str
    is_valid: bool
    schema_score: float  # 0.0 to 1.0
    execution_time_ms: float
    data: List[Dict[str, Any]]
    error_message: Optional[str] = None

class CollectorStats(BaseModel):
    collector_id: str
    collector_name: str
    uptime_percentage: float
    total_runs: int
    successful_runs: int
    total_heals: int
    avg_recovery_time_seconds: float
    retry_success_rate: float
    current_status: CollectorStatus
    current_poll_interval: int
    consecutive_healthy_runs: int

class SSEEventPayload(BaseModel):
    event_type: str
    collector_id: str
    timestamp: str
    data: Dict[str, Any]
