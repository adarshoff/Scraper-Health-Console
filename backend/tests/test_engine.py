import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import SeverityLevel
from app.engine import validate_extracted_data, classify_severity

def test_validate_extracted_data_healthy():
    rules = [
        {"name": "title", "required": True, "expected_type": "str"},
        {"name": "price", "required": True, "expected_type": "float"}
    ]
    items = [
        {"title": "Book 1", "price": 19.99},
        {"title": "Book 2", "price": 29.50}
    ]
    score, violations, issues = validate_extracted_data(items, rules, {})
    assert score == 1.0
    assert len(violations) == 0
    assert classify_severity(score, violations, issues) == SeverityLevel.NONE

def test_validate_extracted_data_empty_field():
    rules = [
        {"name": "title", "required": True, "expected_type": "str"},
        {"name": "price", "required": True, "expected_type": "float"}
    ]
    items = [
        {"title": "Book 1", "price": ""},
        {"title": "Book 2", "price": ""}
    ]
    score, violations, issues = validate_extracted_data(items, rules, {})
    assert score < 0.90
    assert len(violations) > 0
    sev = classify_severity(score, violations, issues)
    assert sev in [SeverityLevel.MAJOR, SeverityLevel.CRITICAL]

def test_validate_extracted_data_zero_items():
    rules = [{"name": "title", "required": True, "expected_type": "str"}]
    items = []
    score, violations, issues = validate_extracted_data(items, rules, {})
    assert score == 0.0
    assert classify_severity(score, violations, issues) == SeverityLevel.CRITICAL
