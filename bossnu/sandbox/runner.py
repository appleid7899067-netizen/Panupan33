"""Python sandbox runner — captures stdout/stderr/HTTP"""
import sys, time, json, traceback
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path

CODE_PATH = Path("/tmp/user_code.py")
HTTP_LOG = Path("/tmp/http_log.jsonl")

try:
    import requests as _requests
    _orig_request = _requests.sessions.Session.request
    def _logged_request(self, method, url, **kwargs):
        start = time.time()
        entry = {"url": url, "method": method, "timestamp": time.time()}
        try:
            resp = _orig_request(self, method, url, **kwargs)
            entry["status"] = resp.status_code
            entry["snippet"] = (resp.text or "")[:200]
            entry["duration_ms"] = int((time.time() - start) * 1000)
            HTTP_LOG.open("a").write(json.dumps(entry) + "\n")
            return resp
        except Exception as e:
            entry["status"] = None
            entry["error"] = f"{type(e).__name__}: {e}"
            entry["duration_ms"] = int((time.time() - start) * 1000)
            HTTP_LOG.open("a").write(json.dumps(entry) + "\n")
            raise
    _requests.sessions.Session.request = _logged_request
except Exception:
    pass

def main():
    if not CODE_PATH.exists():
        print("__BOSS_RESULT__" + json.dumps({"error": "no code", "exit_code": 1, "stdout": "", "stderr": "", "duration_ms": 0, "http_calls": []}))
        return
    if HTTP_LOG.exists():
        HTTP_LOG.unlink()
    code = CODE_PATH.read_text()
    stdout_buf, stderr_buf = StringIO(), StringIO()
    exit_code, tb = 0, None
    start = time.time()
    try:
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            exec(compile(code, "<user_code>", "exec"), {"__name__": "__main__"})
    except SystemExit as e:
        exit_code = int(e.code) if e.code else 0
    except Exception:
        exit_code = 1
        tb = traceback.format_exc()
    duration_ms = int((time.time() - start) * 1000)
    http_calls = []
    if HTTP_LOG.exists():
        for line in HTTP_LOG.read_text().strip().split("\n"):
            if line:
                try:
                    http_calls.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    print("__BOSS_RESULT__" + json.dumps({"exit_code": exit_code, "stdout": stdout_buf.getvalue(), "stderr": stderr_buf.getvalue(), "traceback": tb, "duration_ms": duration_ms, "http_calls": http_calls}))

if __name__ == "__main__":
    main()
