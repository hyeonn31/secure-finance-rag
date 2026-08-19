#!/usr/bin/env python3
"""Local-only financial document masker.

This program never makes a network call. Run it on an approved PC or an
internal server. It preserves file structure and repeated-entity consistency
while replacing sensitive values with deterministic placeholders.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import hmac
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("RRN", re.compile(r"(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)")),
    ("CARD", re.compile(r"(?<!\d)(?:\d{4}[- ]?){3}\d{4}(?!\d)")),
    ("ACCOUNT", re.compile(r"(?<!\d)\d{2,6}[- ]?\d{2,6}[- ]?\d{2,8}(?!\d)")),
    ("PHONE", re.compile(r"(?<!\d)01[0-9][- ]?\d{3,4}[- ]?\d{4}(?!\d)")),
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("BIZ_REG", re.compile(r"(?<!\d)\d{3}-?\d{2}-?\d{5}(?!\d)")),
]

SENSITIVE_FIELD_HINTS = {
    "customer", "client", "name", "account", "card", "email", "phone",
    "resident", "rrn", "address", "birth", "사업자", "고객", "성명",
    "계좌", "카드", "이메일", "전화", "주소", "주민", "생년",
}


class LocalMasker:
    def __init__(self, salt: str, entity_map: dict[str, str] | None = None):
        if not salt:
            raise ValueError("A non-empty --salt is required for deterministic masking.")
        self.salt = salt.encode("utf-8")
        self.entity_map = entity_map or {}
        self.counts: Counter[str] = Counter()

    def token(self, category: str, value: str) -> str:
        digest = hmac.new(self.salt, f"{category}|{value}".encode("utf-8"), hashlib.sha256).hexdigest()[:8].upper()
        self.counts[category] += 1
        return f"[{category}_{digest}]"

    def mask_text(self, text: str) -> str:
        for source, replacement in sorted(self.entity_map.items(), key=lambda item: len(item[0]), reverse=True):
            if source in text:
                text = text.replace(source, replacement)
                self.counts["ENTITY_ALIAS"] += 1
        for category, pattern in PATTERNS:
            text = pattern.sub(lambda match: self.token(category, match.group(0)), text)
        return text

    def mask_value(self, value: Any, field_name: str = "") -> Any:
        if isinstance(value, dict):
            return {key: self.mask_value(item, key) for key, item in value.items()}
        if isinstance(value, list):
            return [self.mask_value(item, field_name) for item in value]
        if isinstance(value, str):
            if any(hint in field_name.lower() for hint in SENSITIVE_FIELD_HINTS) and value.strip():
                return self.token("FIELD", value)
            return self.mask_text(value)
        return value


def read_config(config_path: Path | None) -> dict[str, Any]:
    if not config_path:
        return {}
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(config, dict):
        raise ValueError("Config must be a JSON object.")
    return config


def mask_csv(source: Path, target: Path, masker: LocalMasker) -> None:
    with source.open("r", encoding="utf-8-sig", newline="") as read_file:
        reader = csv.DictReader(read_file)
        fieldnames = reader.fieldnames
        if not fieldnames:
            raise ValueError("CSV header row is required to preserve its schema.")
        rows = [{key: masker.mask_value(value, key) for key, value in row.items()} for row in reader]
    with target.open("w", encoding="utf-8", newline="") as write_file:
        writer = csv.DictWriter(write_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a locally masked, format-preserving sample for RAG workflow development.")
    parser.add_argument("input", type=Path, help="Input TXT, CSV, or JSON file. This file stays on the local machine.")
    parser.add_argument("--output", type=Path, required=True, help="Masked output file path.")
    parser.add_argument("--salt", required=True, help="Local secret used only to keep the same entity token consistent across runs.")
    parser.add_argument("--config", type=Path, help="Optional local JSON config with an entities mapping.")
    args = parser.parse_args()

    source = args.input.resolve()
    target = args.output.resolve()
    if source == target:
        raise ValueError("Input and output paths must be different.")
    if not source.exists():
        raise FileNotFoundError(f"Input not found: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    config = read_config(args.config)
    masker = LocalMasker(args.salt, config.get("entities"))
    extension = source.suffix.lower()
    if extension == ".json":
        payload = json.loads(source.read_text(encoding="utf-8"))
        target.write_text(json.dumps(masker.mask_value(payload), ensure_ascii=False, indent=2), encoding="utf-8")
    elif extension == ".csv":
        mask_csv(source, target, masker)
    elif extension in {".txt", ".md"}:
        target.write_text(masker.mask_text(source.read_text(encoding="utf-8")), encoding="utf-8")
    else:
        raise ValueError("Supported formats are TXT, MD, CSV, and JSON. Extract PDF/DOCX/XLSX/PPTX text locally first, then mask the export.")

    audit_path = target.with_suffix(target.suffix + ".mask-audit.json")
    audit = {
        "tool": "local_masker",
        "network_calls": 0,
        "input_format": extension.lstrip("."),
        "output_format": target.suffix.lstrip("."),
        "replacement_counts": dict(sorted(masker.counts.items())),
        "notice": "No raw values, token mappings, or salt are written to this audit file.",
    }
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(target), "audit": str(audit_path), "replacement_counts": audit["replacement_counts"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"local_masker error: {error}", file=sys.stderr)
        raise SystemExit(2)
