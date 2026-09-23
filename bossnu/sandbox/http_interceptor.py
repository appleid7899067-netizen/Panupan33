"""Optional HTTP interceptor helpers for sandbox"""
import json
from pathlib import Path
LOG = Path("/tmp/http_log.jsonl")

def log_call(url: str, method: str, status=None, snippet="", error=None, duration_ms=0):
    entry = {"url": url, "method": method, "status": status, "snippet": (snippet or "")[:200], "error": error, "duration_ms": duration_ms}
    with LOG.open("a") as f:
        f.write(json.dumps(entry) + "\n")
