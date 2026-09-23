# Bossnu — Dubai-Grade Architecture

```
L9 HUMAN COMMAND
L8 MISSION GATE (rules as code)
L7 ETHICS VETO
L6 VERIFICATION MESH (fact/logic/ethics + consensus)
L5 EVIDENCE VAULT + HSM + multi-region replicate
L4 SANDBOX
L3 AGENT MESH (12 roles, 1-veto)
L2 SENSOR FUSION
L1 SOVEREIGN AI (Ollama local)
```

## Extras
- **Prometheus** `src/observability/metrics.py` → `GET /metrics`
- **OpenTelemetry-style spans** `src/observability/tracing.py`
- **Red Team** `src/redteam/adversary.py` → `POST /redteam/run`
- **Multi-region evidence** `src/evidence/replication.py`
- **HSM signing** `src/hsm/signer.py` (software HMAC + PKCS#11 hook)

## Philosophy
> AI เสนอ, Mesh ตรวจ, Ethics veto, Mission gate อนุมัติ, มนุษย์ตัดสิน

## Tests
```bash
cd bossnu
PYTHONPATH=. python tests/test_ethics_veto.py
PYTHONPATH=. python tests/test_consensus.py
PYTHONPATH=. python tests/test_mission_gate.py
PYTHONPATH=. python tests/test_mesh.py
PYTHONPATH=. python tests/test_hsm.py
PYTHONPATH=. python tests/test_redteam.py
```
