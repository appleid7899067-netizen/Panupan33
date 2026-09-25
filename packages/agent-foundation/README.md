# Agent Foundation

This package provides reusable agent infrastructure for the repository. It is a library, not a separate application or sandbox deployment.

The foundation focuses on predictable execution boundaries instead of coupling agent behavior to a specific model provider. A caller can register capabilities as tools and then execute a bounded plan. The runtime records lifecycle events, retains bounded memory, validates inputs, supports retries and cancellation, and applies a timeout to every tool invocation.

## Capabilities

- Explicit tool registry with duplicate-name protection.
- Optional per-tool input validation.
- Ordered multi-step execution with access to prior step results.
- Configurable maximum plan length.
- Configurable per-tool timeout and retry policy.
- `AbortSignal` propagation for cooperative cancellation.
- Bounded in-memory event history to prevent unlimited growth.
- Lifecycle events for observability and integration with logs, persistence, or a UI.
- Provider-independent design: model selection and prompting remain outside the execution core.

## Example

```js
import { createAgentFoundation } from './packages/agent-foundation/index.mjs';

const agent = createAgentFoundation({
  maxSteps: 8,
  toolDefinitions: [
    {
      name: 'search-notes',
      description: 'Search stored notes',
      validate: (input) => typeof input?.query === 'string' || 'query is required',
      execute: async ({ query }, context) => {
        return context.notes.search(query);
      },
    },
  ],
});

const result = await agent.execute(
  [{ tool: 'search-notes', input: { query: 'roadmap' } }],
  { context: { notes: noteRepository } },
);
```

Tools receive a context containing `runId`, `stepIndex`, `attempt`, `signal`, and `previousResults`, in addition to values supplied in the `execute` call's `context`. Long-running tools should observe `signal` so they can stop work when a timeout or external cancellation occurs.

This module intentionally does not execute arbitrary source code, shell commands, or model-generated strings. Repository integrations should expose only the concrete capabilities an agent is permitted to use as registered tools.
