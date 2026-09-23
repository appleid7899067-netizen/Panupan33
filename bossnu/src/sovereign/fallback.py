from typing import Optional
from .model_router import ModelRouter, ModelTier

class FallbackLLM:
    def __init__(self, enable_local: bool = True):
        self.router = ModelRouter(enable_local=enable_local)

    def chat(self, messages: list, system: Optional[str] = None, task_type: str = "general", sensitivity: str = "low") -> str:
        primary, tier = self.router.route(task_type, sensitivity)
        try:
            return primary.chat(messages, system=system)
        except Exception:
            if tier != ModelTier.LOCAL and self.router.local:
                return self.router.local.chat(messages, system=system)
            raise
