# GitHub Actions CI/CD — Panupan33

## Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | push / PR / manual | typecheck → test → lint → build |
| **CD · Render health ping** | `cd-render-ping.yml` | after CI success on `main` | ping production `/api/capabilities` |
| **Boss MVP** | `boss-mvp.yml` | push/PR `main` + `boss/**` | quality gate |
| **Boss Commit Bridge** | `boss-commit-bridge.yml` | `repository_dispatch` | agent commit path |

## Agent tools

| Tool | Action |
|------|--------|
| `github_actions` | list runs |
| `github_dispatch_workflow` | start workflow |
| `github_wait_for_workflow` | wait for conclusion |
| `github_workflow_diagnostics` | failed log tail |

## Render CD

1. Connect repo branch `main`
2. Build: `npm install && npm run build`
3. Start: `npm start`

Optional variable: `PRODUCTION_URL`
