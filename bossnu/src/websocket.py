"""WebSocket helpers for real-time trace"""
from typing import Dict, List, Any

class TraceBus:
    def __init__(self):
        self._subs: Dict[str, List[Any]] = {}

    def subscribe(self, session_id: str, ws):
        self._subs.setdefault(session_id, []).append(ws)

    def unsubscribe(self, session_id: str, ws):
        if session_id in self._subs and ws in self._subs[session_id]:
            self._subs[session_id].remove(ws)

    async def publish(self, session_id: str, event: str, data: dict):
        import json
        payload = json.dumps({"event": event, "data": data})
        for ws in list(self._subs.get(session_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                pass

trace_bus = TraceBus()
