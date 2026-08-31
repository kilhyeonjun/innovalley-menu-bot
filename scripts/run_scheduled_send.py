#!/usr/bin/env python3
"""Idempotent scheduled trigger for the menu bot HTTP endpoint."""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
DEFAULT_URL = os.environ.get("MENU_BOT_SEND_URL", "http://127.0.0.1:3001/api/menu/send")
LOCK_PATH = os.environ.get("MENU_BOT_SEND_LOCK", "/tmp/innovalley-menu-send.lock")


def parse_now(value: str | None) -> dt.datetime:
    return dt.datetime.fromisoformat(value).astimezone(KST) if value else dt.datetime.now(KST)


def is_send_window(now: dt.datetime) -> bool:
    return now.weekday() < 5 and 9 <= now.hour < 16


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--now")
    parser.add_argument("--url", default=DEFAULT_URL)
    args = parser.parse_args()
    now = parse_now(args.now)
    if not is_send_window(now):
        print(json.dumps({"ok": True, "result": "outside_window", "now": now.isoformat()}))
        return 0
    if args.dry_run:
        print(json.dumps({"ok": True, "result": "would_send", "now": now.isoformat()}))
        return 0
    try:
        with open(LOCK_PATH, "w", encoding="utf-8") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print(json.dumps({"ok": True, "result": "already_running"}))
                return 0
            request = urllib.request.Request(args.url, method="POST")
            with urllib.request.urlopen(request, timeout=120) as response:
                body = response.read().decode("utf-8")
        payload = json.loads(body)
        data = payload.get("data")
        if not payload.get("success") or not isinstance(data, dict) or data.get("success") is not True:
            raise RuntimeError("menu send endpoint reported failure")
        print(json.dumps({"ok": True, "result": "sent_or_skipped"}))
        return 0
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
        print(json.dumps({"ok": False, "error": type(exc).__name__}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
