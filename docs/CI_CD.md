# GitHub Actions CI/CD — Panupan33

## Workflows (connected)

| Workflow | File | Trigger | What it does |
|----------|------|---------|--------------|
| **CI** | `ci.yml` | push / PR / manual | typecheck → test → lint → **build** |
| **CD · Render health ping** | `cd-render-ping.yml` | after CI success on `main` | ping production `/api/capabilities` |
| **Boss MVP** | `boss-mvp.yml` | push/PR `main` + `boss/**` | quality gate |
| **Boss Commit Bridge** | `boss-commit-bridge.yml` | `repository_dispatch` | agent commit path |

## Agent tools (implemented)

| Tool | Action |
|------|--------|
| `github_actions` | list runs |
| `github_dispatch_workflow` | start `ci.yml` etc. |
| `github_wait_for_workflow` | wait for conclusion |
| `github_workflow_diagnostics` | failed log tail |

Code: `src/lib/github-agent-tools.server.ts` · contract: `src/lib/boss-engine/ci-cd-tools.ts`

### Example prompts for Boss

```
ดู CI ล่าสุดของ Panupan33 บน branch main
```

```
dispatch workflow ci.yml บน branch boss/super1-skills-usable
```

```
CI fail รัน #12345 — เปิด diagnostics แล้วสรุปเป็นภาษาไทย
```

## Render CD (hosting)

1. Render → connect repo → branch `main`
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. After merge to `main`, CI green → Render auto-deploy → CD ping confirms live

Optional repo variable: `PRODUCTION_URL` (default `https://panupanboss.onrender.com`)

## Badge

[![CI](https://github.com/appleid7899067-netizen/Panupan33/actions/workflows/ci.yml/badge.svg)](https://github.com/appleid7899067-netizen/Panupan33/actions/workflows/ci.yml)
