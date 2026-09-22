# Bossnu Unified

Boss workspace architecture for ONE CHAT execution.

## Flow

User goal → Core → Agent → Skill → Tool → Model → Execute → Verify → Trace

The existing Panupan33 UI remains the runtime surface while this structure is introduced incrementally.

## Apps
- web: chat UI
- api: backend/agent API
- bot: bot runtime
- admin: monitoring and administration

## Packages
- core: orchestration contracts
- agents: six specialized agents
- skills: five reusable skills
- tools: tool registry
- models: model registry
- botflow: workflow execution
- auth: Puter/OpenRouter auth boundary
- philosophy: Boss operating principles
