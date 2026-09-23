from enum import Enum
from .local_llm import LocalLLM

class ModelTier(str, Enum):
    LOCAL = "local"
    EXTERNAL = "external"
    HYBRID = "hybrid"

class ModelRouter:
    def __init__(self, enable_local: bool = True):
        self.local = LocalLLM() if enable_local else None
        self.external = None

    def route(self, task_type: str = "general", sensitivity: str = "low") -> tuple:
        if sensitivity in ("high", "classified"):
            if not self.local:
                raise RuntimeError("Local LLM required")
            return self.local, ModelTier.LOCAL
        if self.local and self.local.available():
            return self.local, ModelTier.LOCAL
        if self.external:
            return self.external, ModelTier.EXTERNAL
        if self.local:
            return self.local, ModelTier.LOCAL
        raise RuntimeError("No LLM available")
