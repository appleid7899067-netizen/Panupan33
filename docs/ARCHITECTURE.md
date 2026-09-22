# Architecture

## Runtime
```
Chat UI
  ↓
Boss Core
  ├─ Context / Memory
  ├─ Agent Router
  ├─ Skill Router
  ├─ Tool Registry
  ├─ Model Router
  └─ Verification
  ↓
Execution Trace
  ↓
Chat response
```

## Rules
1. Chat is the primary control surface.
2. The user states the goal, Boss selects the execution path.
3. Every action produces traceable activity.
4. Verification is explicit before a successful result is reported.
5. Providers are behind adapters, not embedded in UI components.
