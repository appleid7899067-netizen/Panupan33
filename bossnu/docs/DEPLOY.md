# Deploy

```bash
cp .env.example .env
docker build -f Dockerfile.sandbox -t bossnu-sandbox:latest .
docker-compose up -d
open http://localhost:3000
```

Render: use `render.yaml` + `ANTHROPIC_API_KEY`
