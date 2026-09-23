"""Sandbox Manager — Docker container runner"""
import docker
import json
import uuid
import tarfile
import io
from typing import Optional
from dataclasses import dataclass
from .config import settings

@dataclass
class SandboxResult:
    exit_code: int
    stdout: str
    stderr: str
    traceback: Optional[str]
    duration_ms: int
    http_calls: list
    container_id: str

class SandboxManager:
    def __init__(self, image: str = None):
        self.client = docker.from_env()
        self.image = image or settings.sandbox_image

    def run_code(self, code: str, language: str = "python", timeout: int = None, network: str = "bridge") -> SandboxResult:
        timeout = timeout or settings.sandbox_timeout
        container_name = f"bossnu-sbx-{uuid.uuid4().hex[:8]}"
        container = self.client.containers.create(
            self.image, name=container_name, network_mode=network,
            mem_limit=settings.sandbox_mem_limit, cpu_period=100000, cpu_quota=100000,
            detach=True, command=["sh", "-c", "sleep 120"],
        )
        try:
            container.start()
            filename = "user_code.py" if language == "python" else "user_code.js"
            buf = io.BytesIO()
            with tarfile.open(fileobj=buf, mode="w") as tar:
                data = code.encode()
                info = tarfile.TarInfo(name=filename)
                info.size = len(data)
                info.mode = 0o644
                tar.addfile(info, io.BytesIO(data))
            buf.seek(0)
            container.put_archive("/tmp", buf)
            cmd = ["python", "/app/runner.py"] if language == "python" else ["node", "/app/runner_js.js"]
            exec_result = container.exec_run(cmd, demux=False)
            raw = exec_result.output.decode("utf-8", errors="replace")
            marker = "__BOSS_RESULT__"
            if marker in raw:
                try:
                    result = json.loads(raw.split(marker, 1)[1].strip())
                except json.JSONDecodeError:
                    result = self._error_result(raw)
            else:
                result = self._error_result(raw)
            return SandboxResult(
                exit_code=result.get("exit_code", 1),
                stdout=result.get("stdout", ""),
                stderr=result.get("stderr", ""),
                traceback=result.get("traceback"),
                duration_ms=result.get("duration_ms", 0),
                http_calls=result.get("http_calls", []),
                container_id=container.id[:12],
            )
        finally:
            try:
                container.remove(force=True)
            except Exception:
                pass

    def _error_result(self, raw: str) -> dict:
        return {"exit_code": 1, "stdout": raw, "stderr": "", "traceback": "Runner did not emit result marker", "duration_ms": 0, "http_calls": []}
