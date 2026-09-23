"""Orchestrator — LLM + planning + sandbox + gate"""
import re
import uuid
from typing import Callable, Optional
from .sandbox import SandboxManager, SandboxResult
from .tool_registry import ToolRegistry
from .evidence import EvidenceVault
from .verify_gate import VerificationGate
from .config import settings

SYSTEM_PROMPT = """You are Bossnu Orchestrator. Use ONLY tools from TOOL REGISTRY. If code is needed, output ONE fenced code block. Do NOT invent results."""

class Orchestrator:
    def __init__(self, db_url: Optional[str] = None):
        self.registry = ToolRegistry()
        self.vault = EvidenceVault(db_url)
        self.gate = VerificationGate()
        self.sandbox = None
        try:
            self.sandbox = SandboxManager()
        except Exception:
            self.sandbox = None
        self._anthropic = None
        if settings.anthropic_api_key:
            try:
                import anthropic
                self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            except Exception:
                pass

    def run(self, message: str, session_id: Optional[str] = None, on_event: Optional[Callable] = None) -> dict:
        session_id = session_id or str(uuid.uuid4())
        events = []
        def emit(event, data):
            events.append({"event": event, "data": data})
            if on_event:
                on_event(event, data)
        emit("plan", {"message": message[:200]})
        tools_ctx = self.registry.context_for_llm()
        emit("registry", {"healthy": self.registry.healthy_list()})
        llm_text = self._call_llm(message, tools_ctx)
        emit("llm", {"preview": llm_text[:300]})
        code, lang = self._extract_code(llm_text)
        execution = None
        if code and self.sandbox:
            emit("sandbox_start", {"language": lang})
            try:
                result: SandboxResult = self.sandbox.run_code(code, language=lang)
                execution = {"exit_code": result.exit_code, "stdout": result.stdout, "stderr": result.stderr, "traceback": result.traceback, "duration_ms": result.duration_ms, "http_calls": result.http_calls, "container_id": result.container_id}
                emit("sandbox_done", {"exit_code": result.exit_code})
                self.vault.store(session_id, 1, "stdout", {"text": result.stdout[:4000], "exit_code": result.exit_code})
                if result.http_calls:
                    self.vault.store(session_id, 2, "http", {"calls": result.http_calls[:20]})
            except Exception as e:
                emit("sandbox_error", {"error": str(e)[:300]})
                execution = {"exit_code": 1, "stdout": "", "stderr": str(e), "http_calls": []}
        elif code and not self.sandbox:
            emit("sandbox_skip", {"reason": "Docker unavailable"})
        chain_ok = self.vault.verify_chain(session_id)
        gate = self.gate.verify(llm_text, execution, chain_ok)
        emit("gate_result", {"approved": gate.approved, "reason": gate.reason})
        return {"session_id": session_id, "response": gate.text, "verified": gate.approved, "reason": gate.reason, "execution": execution, "evidence": self.vault.get_session(session_id), "chain_valid": chain_ok, "events": events}

    def _call_llm(self, message: str, tools_ctx: str) -> str:
        prompt = f"{SYSTEM_PROMPT}\n\n{tools_ctx}\n\nUser: {message}"
        if self._anthropic:
            try:
                msg = self._anthropic.messages.create(model=settings.default_model, max_tokens=2048, messages=[{"role": "user", "content": prompt}])
                return msg.content[0].text if msg.content else ""
            except Exception as e:
                return f"(LLM error: {e})\n\n```python\nprint('bossnu offline demo')\n```"
        if re.search(r"print|รัน|โค้ด|code|python", message, re.I):
            return "```python\nprint('hello bossnu')\n```"
        return "I cannot verify this without an API key. Set ANTHROPIC_API_KEY."

    def _extract_code(self, text: str):
        m = re.search(r"```(?:python|py)?\n([\s\S]*?)```", text, re.I)
        if m:
            return m.group(1).strip(), "python"
        m = re.search(r"```(?:javascript|js)\n([\s\S]*?)```", text, re.I)
        if m:
            return m.group(1).strip(), "javascript"
        return None, "python"
