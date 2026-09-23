"""FastAPI — /chat /health /evidence /ws"""
import uuid
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .orchestrator import Orchestrator
from .tool_registry import ToolRegistry
from .evidence import EvidenceVault

app = FastAPI(title="Bossnu Autonomous", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
orch = Orchestrator()
ws_clients: dict[str, list] = {}

class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None

@app.get("/health")
def health():
    reg = ToolRegistry()
    return {"ok": True, "version": "1.0.0", "tools_healthy": reg.healthy_list(), "tools_total": len(reg.tools)}

@app.post("/chat")
def chat(body: ChatIn):
    sid = body.session_id or str(uuid.uuid4())
    return orch.run(body.message, session_id=sid)

@app.get("/evidence/{session_id}")
def evidence(session_id: str):
    vault = EvidenceVault()
    rows = vault.get_session(session_id)
    return {"session_id": session_id, "evidence": rows, "chain_valid": vault.verify_chain(session_id)}

@app.post("/registry/check")
def registry_check():
    return ToolRegistry().check_all()

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    ws_clients.setdefault(session_id, []).append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in ws_clients.get(session_id, []):
            ws_clients[session_id].remove(websocket)
