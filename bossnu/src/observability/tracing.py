"""OpenTelemetry-style tracing"""
import time, uuid
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

@dataclass
class Span:
    name: str
    span_id: str
    parent_id: Optional[str]
    start_ms: float
    end_ms: Optional[float] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    status: str = "ok"

    @property
    def duration_ms(self) -> float:
        return 0 if self.end_ms is None else self.end_ms - self.start_ms

class Tracer:
    def __init__(self):
        self.spans: List[Span] = []
        self._stack: List[str] = []

    @contextmanager
    def span(self, name: str, **attrs):
        sid = uuid.uuid4().hex[:12]
        parent = self._stack[-1] if self._stack else None
        s = Span(name, sid, parent, time.perf_counter() * 1000, attributes=dict(attrs))
        self._stack.append(sid)
        try:
            yield s
            s.status = "ok"
        except Exception as e:
            s.status = "error"
            s.attributes["error"] = str(e)[:300]
            raise
        finally:
            s.end_ms = time.perf_counter() * 1000
            self._stack.pop()
            self.spans.append(s)

    def export_otlp_like(self) -> list:
        return [{"name": s.name, "span_id": s.span_id, "parent_id": s.parent_id,
                 "duration_ms": round(s.duration_ms, 3), "status": s.status, "attributes": s.attributes}
                for s in self.spans[-200:]]

tracer = Tracer()
