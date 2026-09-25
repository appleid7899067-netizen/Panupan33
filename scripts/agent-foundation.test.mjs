import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AgentFoundationError,
  AgentMemory,
  AgentRuntime,
  ToolRegistry,
  createAgentFoundation,
} from '../packages/agent-foundation/index.mjs';

test('ToolRegistry registers and exposes safe tool metadata', () => {
  const registry = new ToolRegistry();
  registry.register({
    name: 'echo',
    description: 'Echo input',
    execute: async (input) => input,
  });

  assert.equal(registry.has('echo'), true);
  assert.deepEqual(registry.list(), [
    { name: 'echo', description: 'Echo input', timeoutMs: null, retries: 0 },
  ]);
  assert.equal('execute' in registry.list()[0], false);
  assert.throws(
    () => registry.register({ name: 'echo', execute: async () => null }),
    (error) => error instanceof AgentFoundationError && error.code === 'DUPLICATE_TOOL',
  );
});

test('AgentRuntime executes ordered tools and exposes previous results', async () => {
  const registry = new ToolRegistry();
  registry.register({ name: 'first', execute: async ({ value }) => value * 2 });
  registry.register({
    name: 'second',
    execute: async ({ increment }, context) => context.previousResults[0].output + increment,
  });
  const runtime = new AgentRuntime({ tools: registry });

  const run = await runtime.execute([
    { tool: 'first', input: { value: 4 } },
    { tool: 'second', input: { increment: 3 } },
  ]);

  assert.equal(run.status, 'completed');
  assert.equal(run.results[0].output, 8);
  assert.equal(run.results[1].output, 11);
  assert.equal(runtime.memory.list({ type: 'tool.result' }).length, 2);
});

test('AgentRuntime validates tool input before execution', async () => {
  let executed = false;
  const runtime = createAgentFoundation({
    toolDefinitions: [
      {
        name: 'positive',
        validate: (input) => input > 0 || 'Input must be positive',
        execute: async () => {
          executed = true;
        },
      },
    ],
  });

  await assert.rejects(
    runtime.execute([{ tool: 'positive', input: -1 }]),
    (error) => error.code === 'INVALID_TOOL_INPUT' && error.message === 'Input must be positive',
  );
  assert.equal(executed, false);
});

test('AgentRuntime retries failed tool calls', async () => {
  let calls = 0;
  const runtime = createAgentFoundation({
    toolDefinitions: [
      {
        name: 'flaky',
        retries: 1,
        execute: async () => {
          calls += 1;
          if (calls === 1) throw new Error('temporary failure');
          return 'recovered';
        },
      },
    ],
  });

  const run = await runtime.execute([{ tool: 'flaky' }]);
  assert.equal(calls, 2);
  assert.equal(run.results[0].output, 'recovered');
});

test('AgentRuntime enforces plan limits and tool timeouts', async () => {
  const runtime = createAgentFoundation({
    maxSteps: 1,
    toolTimeoutMs: 20,
    toolDefinitions: [
      {
        name: 'slow',
        execute: async (_input, { signal }) =>
          new Promise((resolve) => {
            const timer = setTimeout(resolve, 1_000);
            signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
          }),
      },
    ],
  });

  await assert.rejects(
    runtime.execute([{ tool: 'slow' }, { tool: 'slow' }]),
    (error) => error.code === 'STEP_LIMIT',
  );
  await assert.rejects(runtime.execute([{ tool: 'slow' }]), (error) => error.code === 'TOOL_TIMEOUT');
});

test('AgentMemory keeps only its configured bounded history', () => {
  const memory = new AgentMemory({ maxEntries: 2 });
  memory.add({ content: 'one' });
  memory.add({ content: 'two' });
  memory.add({ content: 'three' });

  assert.deepEqual(
    memory.list().map((entry) => entry.content),
    ['two', 'three'],
  );
});
