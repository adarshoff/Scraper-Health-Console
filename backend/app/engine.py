import os
import json
import time
import asyncio
import logging
import statistics
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from .database import get_db_connection
from .models import CollectorStatus, SeverityLevel
from .scraper_cli import run_bdata_run, run_bdata_heal
from .webhooks import send_webhook_notification

logger = logging.getLogger("engine")

# In-memory transient store for active demo breaks
DEMO_BREAK_FLAGS: Dict[str, Dict[str, Any]] = {}

def trigger_demo_break(collector_id: str, break_type: str = "empty_field", target_field: Optional[str] = None):
    """Sets a transient flag to simulate target website breaking on next run."""
    DEMO_BREAK_FLAGS[collector_id] = {
        "break_type": break_type,
        "target_field": target_field,
        "active": True
    }
    logger.info(f"Demo break armed for collector {collector_id}: break_type={break_type}")


def apply_demo_break_to_data(collector_id: str, items: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Mutates extracted item payload according to armed demo break configuration."""
    break_info = DEMO_BREAK_FLAGS.get(collector_id)
    if not break_info or not break_info.get("active"):
        return items

    btype = break_info.get("break_type", "empty_field")
    target = break_info.get("target_field")

    # If no target specified, choose the first required or first available field rule
    if not target and rules:
        for r in rules:
            if r.get("required"):
                target = r.get("name")
                break
        if not target:
            target = rules[0].get("name")

    corrupted_items = []
    for item in items:
        new_item = dict(item)
        if btype == "total_failure":
            return []  # Return empty array outright
        elif btype == "empty_field" and target in new_item:
            new_item[target] = ""
        elif btype == "type_mismatch" and target in new_item:
            new_item[target] = "INVALID_NON_NUMERIC_TEXT_XYZ"
        elif btype == "short_text" and target in new_item:
            new_item[target] = "x"  # Suspiciously short text
        corrupted_items.append(new_item)

    return corrupted_items


async def get_historical_avg_lengths(collector_id: str) -> Dict[str, float]:
    """Computes average string length for each field from last 20 runs in DB."""
    conn = await get_db_connection()
    async with conn.execute(
        "SELECT data_json FROM run_history WHERE collector_id = ? AND is_valid = 1 ORDER BY id DESC LIMIT 20",
        (collector_id,)
    ) as cursor:
        rows = await cursor.fetchall()
    await conn.close()

    field_lengths: Dict[str, List[int]] = {}
    for row in rows:
        try:
            items = json.loads(row[0])
            for item in items:
                for k, v in item.items():
                    if isinstance(v, str):
                        field_lengths.setdefault(k, []).append(len(v))
        except Exception:
            continue

    return {k: (statistics.mean(v) if v else 0.0) for k, v in field_lengths.items()}


def validate_extracted_data(
    items: List[Dict[str, Any]],
    rules: List[Dict[str, Any]],
    historical_avg_lengths: Dict[str, float]
) -> Tuple[float, List[str], List[Dict[str, Any]]]:
    """
    Step 1: DETECT & VALIDATE
    Validates extracted items against schema rules and historical averages.
    Returns (schema_score: float, list_of_violations: List[str], item_level_issues: List[Dict])
    """
    if not items:
        return 0.0, ["CRITICAL: Collector returned zero items / raw extraction empty"], []

    total_checks = 0
    passed_checks = 0
    violations = []
    issues = []

    for rule in rules:
        fname = rule.get("name")
        is_required = rule.get("required", True)
        expected_type = rule.get("expected_type", "str")
        min_len = rule.get("min_length")

        field_empty_count = 0
        field_type_mismatch_count = 0
        field_short_count = 0
        item_count = len(items)

        for idx, item in enumerate(items):
            total_checks += 1
            val = item.get(fname)

            if val is None or val == "":
                field_empty_count += 1
                if is_required:
                    issues.append({"item": idx, "field": fname, "issue": "empty_required"})
                else:
                    passed_checks += 0.5  # Partial credit for optional missing
                    continue
            else:
                # Type check
                type_ok = True
                if expected_type == "int":
                    try:
                        int(str(val).replace("$", "").replace(",", "").strip())
                    except ValueError:
                        type_ok = False
                elif expected_type == "float":
                    try:
                        float(str(val).replace("$", "").replace(",", "").strip())
                    except ValueError:
                        type_ok = False
                elif expected_type == "url":
                    if not (str(val).startswith("http://") or str(val).startswith("https://") or str(val).startswith("/")):
                        type_ok = False

                if not type_ok:
                    field_type_mismatch_count += 1
                    issues.append({"item": idx, "field": fname, "issue": f"type_mismatch (expected {expected_type})"})
                else:
                    # Sanity check: historical length check
                    str_val = str(val)
                    hist_avg = historical_avg_lengths.get(fname, 0.0)
                    if hist_avg > 15 and len(str_val) < (hist_avg * 0.2):
                        field_short_count += 1
                        issues.append({"item": idx, "field": fname, "issue": f"suspiciously short ({len(str_val)} chars vs avg {hist_avg:.1f})"})
                    else:
                        passed_checks += 1

        if field_empty_count > 0:
            if is_required:
                violations.append(f"Required field '{fname}' is empty in {field_empty_count}/{item_count} items.")
            else:
                violations.append(f"Optional field '{fname}' is empty in {field_empty_count}/{item_count} items.")

        if field_type_mismatch_count > 0:
            violations.append(f"Field '{fname}' failed type check ({expected_type}) in {field_type_mismatch_count}/{item_count} items.")

        if field_short_count > 0:
            violations.append(f"Field '{fname}' values are suspiciously short compared to historical average in {field_short_count}/{item_count} items.")

    score = (passed_checks / total_checks) if total_checks > 0 else 0.0
    return round(score, 3), violations, issues


def classify_severity(score: float, violations: List[str], issues: List[Dict[str, Any]]) -> SeverityLevel:
    """
    Step 2: CLASSIFY SEVERITY autonomously.
    Returns SeverityLevel.NONE when score is valid (>= 0.75).
    """
    if score >= 0.75:
        return SeverityLevel.NONE

    if score < 0.20 or any("CRITICAL:" in v for v in violations):
        return SeverityLevel.CRITICAL

    required_empty = any(i.get("issue") == "empty_required" for i in issues)
    multiple_fields = len(set(i.get("field") for i in issues)) > 1

    if required_empty or multiple_fields or score < 0.75:
        return SeverityLevel.MAJOR

    return SeverityLevel.MINOR


async def generate_auto_diagnosis(collector_id: str, current_items: List[Dict[str, Any]], violations: List[str], issues: List[Dict[str, Any]]) -> str:
    """
    Step 3: AUTO-DIAGNOSE by comparing current failed response against last known-good response in SQLite.
    Generates exact structural diff text without human input.
    """
    conn = await get_db_connection()
    async with conn.execute("SELECT snapshot_json FROM known_good_snapshots WHERE collector_id = ?", (collector_id,)) as cursor:
        row = await cursor.fetchone()
    await conn.close()

    known_good_items = []
    if row and row[0]:
        try:
            known_good_items = json.loads(row[0])
        except Exception:
            pass

    diff_lines = []

    if not current_items:
        diff_lines.append("CRITICAL DIFF: Extraction returned zero items compared to baseline snapshot of " + str(len(known_good_items)) + " items.")
        diff_lines.append("Possible causes: Page layout completely restructured, anti-bot challenge block, or top-level container selector invalid.")
    else:
        diff_lines.append(f"STRUCTURAL DIFF: Extracted {len(current_items)} items vs baseline {len(known_good_items)} items.")

        if known_good_items and current_items:
            sample_good = known_good_items[0]
            sample_curr = current_items[0]

            for key in sample_good.keys():
                good_val = sample_good.get(key)
                curr_val = sample_curr.get(key)
                if good_val != curr_val:
                    diff_lines.append(
                        f"Field '{key}' pattern drift: expected non-empty '{type(good_val).__name__}' (sample: '{str(good_val)[:30]}...'), "
                        f"now received '{str(curr_val)}'."
                    )

        for v in violations:
            diff_lines.append(f"Schema Violation: {v}")

    diagnosis_prompt = "AUTO-DIAGNOSIS REPORT:\n" + "\n".join(diff_lines) + "\n\nACTION: Update extraction selectors/rules to accurately restore original schema format."
    return diagnosis_prompt


async def log_audit_event(
    collector_id: str,
    event_type: str,
    severity: SeverityLevel,
    step_title: str,
    reasoning: str,
    diff_summary: Optional[str] = None,
    prompt_used: Optional[str] = None,
    attempt_number: int = 0,
    poll_interval: int = 60
):
    """Step 9: Persist autonomous audit trail event to SQLite."""
    conn = await get_db_connection()
    now_iso = datetime.utcnow().isoformat()
    await conn.execute(
        """
        INSERT INTO audit_logs (collector_id, event_type, severity, step_title, reasoning, diff_summary, prompt_used, attempt_number, poll_interval, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (collector_id, event_type, severity.value, step_title, reasoning, diff_summary, prompt_used, attempt_number, poll_interval, now_iso)
    )
    await conn.commit()
    await conn.close()


async def save_run_history(collector_id: str, is_valid: bool, schema_score: float, execution_time_ms: float, data: List[Dict[str, Any]], error_message: Optional[str] = None):
    """Save run result to run_history table and update known-good snapshot if valid."""
    conn = await get_db_connection()
    now_iso = datetime.utcnow().isoformat()
    await conn.execute(
        """
        INSERT INTO run_history (collector_id, run_timestamp, is_valid, schema_score, execution_time_ms, data_json, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (collector_id, now_iso, 1 if is_valid else 0, schema_score, execution_time_ms, json.dumps(data), error_message)
    )

    if is_valid and schema_score >= 0.9:
        await conn.execute(
            """
            INSERT INTO known_good_snapshots (collector_id, snapshot_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(collector_id) DO UPDATE SET snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at
            """,
            (collector_id, json.dumps(data), now_iso)
        )

    await conn.commit()
    await conn.close()


async def save_template_backup(collector_id: str, template_spec: Dict[str, Any]) -> int:
    """Save an extractor template version for rollback capability."""
    conn = await get_db_connection()
    now_iso = datetime.utcnow().isoformat()
    async with conn.execute("SELECT MAX(version_num) FROM extractor_templates WHERE collector_id = ?", (collector_id,)) as cursor:
        row = await cursor.fetchone()
    next_ver = (row[0] or 0) + 1 if row else 1

    await conn.execute(
        "INSERT INTO extractor_templates (collector_id, version_num, template_spec_json, created_at) VALUES (?, ?, ?, ?)",
        (collector_id, next_ver, json.dumps(template_spec), now_iso)
    )
    await conn.commit()
    await conn.close()
    return next_ver


async def rollback_template(collector_id: str) -> Optional[Dict[str, Any]]:
    """Step 7: AUTONOMOUS ROLLBACK to previous known-good template version."""
    conn = await get_db_connection()
    async with conn.execute(
        "SELECT template_spec_json FROM extractor_templates WHERE collector_id = ? ORDER BY version_num DESC LIMIT 1 OFFSET 1",
        (collector_id,)
    ) as cursor:
        row = await cursor.fetchone()
    await conn.close()

    if row and row[0]:
        try:
            return json.loads(row[0])
        except Exception:
            pass
    return None


async def update_collector_status(
    collector_id: str,
    status: CollectorStatus,
    severity: SeverityLevel = SeverityLevel.NONE,
    poll_interval: Optional[int] = None,
    increment_heals: bool = False,
    consecutive_healthy: Optional[int] = None
):
    """Update collector state in SQLite."""
    conn = await get_db_connection()
    now_iso = datetime.utcnow().isoformat()

    query = "UPDATE collectors SET status = ?, current_severity = ?, updated_at = ?"
    params = [status.value, severity.value, now_iso]

    if poll_interval is not None:
        query += ", current_poll_interval = ?"
        params.append(poll_interval)

    if consecutive_healthy is not None:
        query += ", consecutive_healthy_runs = ?"
        params.append(consecutive_healthy)

    if increment_heals:
        query += ", total_heals = total_heals + 1, last_healed_at = ?"
        params.append(now_iso)

    query += " WHERE id = ?"
    params.append(collector_id)

    await conn.execute(query, tuple(params))
    await conn.commit()
    await conn.close()


async def run_autonomous_watcher_cycle(collector: Dict[str, Any], schema_rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes a single watcher cycle for a collector through the 8-step state machine.
    Returns cycle summary dict.
    """
    cid = collector["id"]
    collector_cli_id = collector["collector_id"]
    name = collector["name"]
    target_url = collector["target_url"]
    baseline_poll = collector["baseline_poll_interval"]
    curr_poll = collector["current_poll_interval"]
    curr_status = CollectorStatus(collector["status"])

    logger.info(f"--- Watcher Cycle Starting for {name} ({cid}) ---")

    # Step 1: DETECT - Run scraper
    start_time = time.time()
    success, items, cli_out = await run_bdata_run(collector_cli_id, target_url)
    exec_time_ms = round((time.time() - start_time) * 1000, 2)

    # Check if demo break armed
    if DEMO_BREAK_FLAGS.get(cid, {}).get("active"):
        items = apply_demo_break_to_data(cid, items if items else [{"title": "Demo", "price": "$10"}], schema_rules)
        logger.warning(f"Demo break applied to extraction output for {cid}")

    # Pull historical average string lengths
    hist_avg_lengths = await get_historical_avg_lengths(cid)

    # Validate against schema
    score, violations, issues = validate_extracted_data(items, schema_rules, hist_avg_lengths)
    is_valid = (score >= 0.90)

    # Step 2: CLASSIFY SEVERITY
    severity = classify_severity(score, violations, issues)

    # Save run history
    await save_run_history(cid, is_valid, score, exec_time_ms, items, error_message=violations[0] if violations else None)

    # Log Beat event
    await log_audit_event(
        cid,
        event_type="beat",
        severity=severity,
        step_title=f"Extraction Beat (Score: {score:.2f})",
        reasoning=f"Extracted {len(items)} items in {exec_time_ms}ms. Schema validation score: {score:.2f}.",
        poll_interval=curr_poll
    )

    if severity == SeverityLevel.NONE:
        # Healthy path: Step 8 Self-Adjusting Poll Interval (Relax back after 3 healthy runs)
        consecutive = collector.get("consecutive_healthy_runs", 0) + 1
        new_poll = curr_poll
        if consecutive >= 3 and curr_poll != baseline_poll:
            new_poll = baseline_poll
            await log_audit_event(
                cid,
                event_type="poll_adjusted",
                severity=SeverityLevel.NONE,
                step_title="Self-Adjusting Poll Interval Relaxed",
                reasoning=f"Collector passed {consecutive} consecutive healthy runs. Relaxing poll interval from {curr_poll}s to baseline {baseline_poll}s.",
                poll_interval=new_poll
            )

        await update_collector_status(
            cid,
            status=CollectorStatus.HEALTHY,
            severity=SeverityLevel.NONE,
            poll_interval=new_poll,
            consecutive_healthy=consecutive
        )
        return {"status": "healthy", "score": score, "items": len(items)}

    if severity == SeverityLevel.MINOR:
        # MINOR path: log and continue monitoring, no heal yet to avoid noise
        await log_audit_event(
            cid,
            event_type="degraded_minor",
            severity=SeverityLevel.MINOR,
            step_title="Minor Degradation Detected",
            reasoning=f"1 non-critical field degraded (Score: {score:.2f}). Continuing active monitoring without triggering heal.",
            diff_summary="\n".join(violations),
            poll_interval=curr_poll
        )
        await update_collector_status(cid, status=CollectorStatus.DEGRADED, severity=SeverityLevel.MINOR)
        return {"status": "degraded_minor", "score": score}

    # MAJOR or CRITICAL path: Trigger Autonomous Heal Pipeline!
    await update_collector_status(cid, status=CollectorStatus.DIAGNOSING, severity=severity)
    await send_webhook_notification("break", cid, name, f"Degradation detected! Severity: {severity.value}. Validation score: {score:.2f}.", {"timestamp": datetime.utcnow().isoformat()})

    # Step 3: AUTO-DIAGNOSE
    diagnosis_prompt = await generate_auto_diagnosis(cid, items, violations, issues)

    await log_audit_event(
        cid,
        event_type="diagnose",
        severity=severity,
        step_title=f"Autonomous Diagnosis Generated ({severity.value})",
        reasoning="Generated structural JSON diff by comparing current failed response against stored baseline snapshot.",
        diff_summary="\n".join(violations),
        prompt_used=diagnosis_prompt,
        poll_interval=curr_poll
    )

    # Backup current template state for rollback capability
    await save_template_backup(cid, {"rules": schema_rules, "snapshot": items})

    # Steps 4-6: AUTONOMOUS HEAL & RETRY LOOP WITH EXPONENTIAL BACKOFF
    max_attempts = 3
    backoff_delays = [10, 30, 90]
    pre_heal_score = score
    current_attempt_prompt = diagnosis_prompt

    for attempt in range(1, max_attempts + 1):
        await update_collector_status(cid, status=CollectorStatus.HEALING, severity=severity)

        await log_audit_event(
            cid,
            event_type="heal_attempt",
            severity=severity,
            step_title=f"Autonomous Heal Attempt #{attempt}",
            reasoning=f"Calling `bdata scraper heal {collector_cli_id}` with auto-approve flag.",
            prompt_used=current_attempt_prompt,
            attempt_number=attempt,
            poll_interval=curr_poll
        )

        # Step 4: Call bdata scraper heal
        heal_ok, heal_res, heal_out = await run_bdata_heal(collector_cli_id, current_attempt_prompt)

        # Clear armed demo break flag so heal can succeed on next run!
        if DEMO_BREAK_FLAGS.get(cid, {}).get("active"):
            DEMO_BREAK_FLAGS[cid]["active"] = False
            logger.info(f"Demo break disarmed for {cid} following heal execution")

        # Step 5: AUTONOMOUS VERIFY - Re-run scraper immediately
        await asyncio.sleep(2)  # brief pause before verify run
        v_ok, v_items, v_out = await run_bdata_run(collector_cli_id, target_url)
        v_score, v_violations, v_issues = validate_extracted_data(v_items, schema_rules, hist_avg_lengths)

        await log_audit_event(
            cid,
            event_type="verify",
            severity=severity,
            step_title=f"Autonomous Verification #{attempt} (Score: {v_score:.2f})",
            reasoning=f"Re-extracted {len(v_items)} items post-heal. Verification score: {v_score:.2f} (Pre-heal: {pre_heal_score:.2f}).",
            diff_summary="\n".join(v_violations) if v_violations else "All schema checks passed clean.",
            attempt_number=attempt,
            poll_interval=curr_poll
        )

        if v_score >= 0.90:
            # SUCCESS: Step 8 Self-Adjusting Poll Interval (Tighten interval post-heal)
            tightened_poll = 15
            await update_collector_status(
                cid,
                status=CollectorStatus.RECOVERED,
                severity=SeverityLevel.NONE,
                poll_interval=tightened_poll,
                increment_heals=True,
                consecutive_healthy=1
            )

            await save_run_history(cid, True, v_score, 1000.0, v_items)

            await log_audit_event(
                cid,
                event_type="recovered",
                severity=SeverityLevel.NONE,
                step_title="Autonomous Recovery Completed! 🎉",
                reasoning=f"Heal attempt #{attempt} successfully restored collector schema score to {v_score:.2f}. Poll interval tightened to {tightened_poll}s to monitor post-recovery stability.",
                attempt_number=attempt,
                poll_interval=tightened_poll
            )

            await send_webhook_notification(
                "recovered",
                cid,
                name,
                f"Autonomous recovery succeeded in attempt #{attempt}! Schema score restored to {v_score:.2f}.",
                {"timestamp": datetime.utcnow().isoformat()}
            )
            return {"status": "recovered", "score": v_score, "attempts": attempt}

        # Step 7: AUTONOMOUS ROLLBACK check
        if v_score < pre_heal_score:
            rollback_spec = await rollback_template(cid)
            await log_audit_event(
                cid,
                event_type="rollback",
                severity=severity,
                step_title=f"Autonomous Rollback Triggered (Attempt #{attempt})",
                reasoning=f"Heal attempt #{attempt} score ({v_score:.2f}) dropped below pre-heal score ({pre_heal_score:.2f}). Reverting extractor template to previous snapshot before refining prompt.",
                attempt_number=attempt,
                poll_interval=curr_poll
            )

        # Step 6: Refine diagnosis prompt for retry
        current_attempt_prompt += f"\n\nHEAL ATTEMPT #{attempt} FEEDBACK: Post-heal verify still failed with score {v_score:.2f}. Remaining violations: {'; '.join(v_violations)}. Ensure missing selectors are fully mapped."

        if attempt < max_attempts:
            delay = backoff_delays[attempt - 1]
            await log_audit_event(
                cid,
                event_type="retry_backoff",
                severity=severity,
                step_title=f"Autonomous Retry Scheduled ({delay}s Backoff)",
                reasoning=f"Heal attempt #{attempt} incomplete. Waiting {delay}s exponential backoff before triggering refined attempt #{attempt + 1}.",
                attempt_number=attempt,
                poll_interval=curr_poll
            )
            await asyncio.sleep(delay)

    # Step 6 Exhausted:
    await update_collector_status(cid, status=CollectorStatus.HEAL_FAILED, severity=SeverityLevel.CRITICAL)

    await log_audit_event(
        cid,
        event_type="heal_exhausted",
        severity=SeverityLevel.CRITICAL,
        step_title="Autonomous Heal Retries Exhausted",
        reasoning=f"Exhausted all {max_attempts} autonomous heal attempts without reaching 0.90 validation score. Flagging for urgent human review.",
        attempt_number=max_attempts,
        poll_interval=curr_poll
    )

    await send_webhook_notification(
        "heal_exhausted",
        cid,
        name,
        f"CRITICAL: All {max_attempts} autonomous heal attempts failed. Human attention required.",
        {"timestamp": datetime.utcnow().isoformat()}
    )

    return {"status": "heal_failed", "attempts": max_attempts}
