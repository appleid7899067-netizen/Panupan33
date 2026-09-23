# Architecture

1. API (`src/api.py`) — FastAPI
2. Orchestrator — LLM + plan
3. Sandbox — Docker runner
4. Evidence — SHA256 + HMAC chain
5. Gate — claim verifier
6. Registry — API health

```
User → API → Orchestrator → Registry → LLM → Sandbox → Evidence → Gate → Response
```
