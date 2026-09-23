import httpx
from typing import Optional
from dataclasses import dataclass

@dataclass
class LocalLLMConfig:
    endpoint: str = "http://ollama:11434"
    model: str = "qwen2.5:14b"
    timeout: int = 120

class LocalLLM:
    def __init__(self, config: Optional[LocalLLMConfig] = None):
        self.cfg = config or LocalLLMConfig()
        self.client = httpx.Client(timeout=self.cfg.timeout)

    def chat(self, messages: list, system: Optional[str] = None, temperature: float = 0.0) -> str:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.extend(messages)
        r = self.client.post(f"{self.cfg.endpoint}/api/chat", json={"model": self.cfg.model, "messages": msgs, "stream": False, "options": {"temperature": temperature}})
        r.raise_for_status()
        return r.json()["message"]["content"]

    def available(self) -> bool:
        try:
            return self.client.get(f"{self.cfg.endpoint}/api/tags").status_code == 200
        except Exception:
            return False
