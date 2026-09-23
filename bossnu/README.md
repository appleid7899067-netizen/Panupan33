# Bossnu Autonomous System

> "ไม่ประกาศว่าสำเร็จจนกว่าจะมีหลักฐานจากระบบจริง"

ระบบ AI Agent ที่ **verify ได้จริง** — sandbox, Evidence Vault (SHA256+HMAC), Verification Gate, Tool Registry, WebSocket trace, Frontend

## Quick Start

```bash
cd bossnu
cp .env.example .env
# ใส่ ANTHROPIC_API_KEY
docker build -f Dockerfile.sandbox -t bossnu-sandbox:latest .
docker-compose up -d
open http://localhost:3000
```

## Layout

- `src/` — FastAPI, orchestrator, evidence, gate, registry, sandbox
- `sandbox/` — Python/JS runners + HTTP interceptor
- `frontend/` — chat + trace + evidence UI
- `tests/` — gate / gauntlet
- `docs/` — architecture, philosophy, deploy

License: MIT
