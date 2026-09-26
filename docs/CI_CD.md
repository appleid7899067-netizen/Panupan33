# GitHub Actions CI/CD — Panupan33

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** (`.github/workflows/ci.yml`) | push / PR / `workflow_dispatch` | typecheck → test → lint → build |
| **CD · Render health ping** | after CI success on `main` | ping `https://panupanboss.onrender.com/api/capabilities` |
| **Boss MVP Verification** | push/PR (legacy) | full dev server + auth invariant |
| **Boss Commit Bridge** | `repository_dispatch` | agent-driven commit from Boss |

## Agent tools (already in GitHub Agent)

| Tool | Use |
|------|-----|
| `github_actions` | list recent workflow runs |
| `github_dispatch_workflow` | start workflow by file name (e.g. `ci.yml`) |
| `github_wait_for_workflow` | poll until run finishes |
| `github_workflow_diagnostics` | failed job log tail |

Example Boss prompt after push:

```
ดู CI บน appleid7899067-netizen/Panupan33 branch boss/super1-skills-usable
ถ้า fail เปิด diagnostics แล้วสรุปสาเหตุภาษาไทย
```

Dispatch CI manually:

```
dispatch workflow ci.yml on main for Panupan33
```

## Secrets / vars (optional)

| Name | Where | Purpose |
|------|--------|---------|
| `PRODUCTION_URL` | repo **Variables** | override health ping URL |
| `GITHUB_TOKEN` | auto in Actions | default for checkout/API |
| User PAT in Boss chat | client | agent `github_*` tools |

## Connect Render (CD)

1. Render Dashboard → service → **Settings → Build & Deploy**
2. Connect repo `Panupan33`, branch `main`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. After merge to `main`, Render deploys; CD ping confirms live API

## Badge

```markdown
[![CI](https://github.com/appleid7899067-netizen/Panupan33/actions/workflows/ci.yml/badge.svg)](https://github.com/appleid7899067-netizen/Panupan33/actions/workflows/ci.yml)
```
