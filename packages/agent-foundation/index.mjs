import { randomUUID } from 'node:crypto';

const DEFAULT_MAX_STEPS = 12;
const DEFAULT_TIMEOUT_MS = 30_000;

export class AgentFoundationError extends Error {
  constructor(message, { code = 'AGENT_ERROR', cause, details } = {}) {
    super(message, { cause });
    this.name = 'AgentFoundationError';
    this.code = code;
    this.details = details;
  }
}

export class ToolRegistry {
  #tools = new Map();

  register(tool) {
    if (!tool || typeof tool !== 'object') {
      throw new TypeError('Tool must be an object');
    }
    if (!isNonEmptyString(tool.name)) {
      throw new TypeError('Tool name must be a non-empty string');
    }
    if (typeof tool.execute !== 'function') {
      throw new TypeError(`Tool "${tool.name}" must provide an execute function`);
    }
    if (this.#tools.has(tool.name)) {
      throw new AgentFoundationError(`Tool "${tool.name}" is already registered`, {
        code: 'DUPLICATE_TOOL',
      });
    }

    const normalized = Object.freeze({
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description : '',
      validate: typeof tool.validate === 'function' ? tool.validate : null,
      execute: tool.execute,
      timeoutMs: normalizePositiveInteger(tool.timeoutMs, null),
      retries: normalizeNonNegativeInteger(tool.retries, 0),
    });
    this.#tools.set(normalized.name, normalized);
    return this;
  }

  unregister(name) {
    return this.#tools.delete(name);
  }

  get(name) {
    return this.#tools.get(name);
  }

  has(name) {
    return this.#tools.has(name);
  }

  list() {
    return [...this.#tools.values()].map(({ execute: _execute, validate: _validate, ...tool }) => ({
      ...tool,
    }));
  }
}

export class AgentMemory {
  #entries = [];
  #maxEntries;

  constructor({ maxEntries = 200 } = {}) {
    this.#maxEntries = normalizePositiveInteger(maxEntries, 200);
  }

  add(entry) {
    const record = Object.freeze({
      id: entry?.id ?? randomUUID(),
      type: entry?.type ?? 'event',
      content: entry?.content,
      timestamp: entry?.timestamp ?? new Date().toISOString(),
      metadata: entry?.metadata && typeof entry.metadata === 'object' ? { ...entry.metadata } : {},
    });
    this.#entries.push(record);
    if (this.#entries.length > this.#maxEntries) {
      this.#entries.splice(0, this.#entries.length - this.#maxEntries);
    }
    return record;
  }

  list({ type, limit } = {}) {
    let entries = type ? this.#entries.filter((entry) => entry.type === type) : this.#entries;
    if (Number.isInteger(limit) && limit >= 0) entries = entries.slice(-limit);
    return [...entries];
  }

  clear() {
    this.#entries = [];
  }
}

export class AgentRuntime {
  constructor({
    tools = new ToolRegistry(),
    memory = new AgentMemory(),
    maxSteps = DEFAULT_MAX_STEPS,
    toolTimeoutMs = DEFAULT_TIMEOUT_MS,
    onEvent,
  } = {}) {
    if (!(tools instanceof ToolRegistry)) throw new TypeError('tools must be a ToolRegistry');
    if (!(memory instanceof AgentMemory)) throw new TypeError('memory must be an AgentMemory');
    this.tools = tools;
    this.memory = memory;
    this.maxSteps = normalizePositiveInteger(maxSteps, DEFAULT_MAX_STEPS);
    this.toolTimeoutMs = normalizePositiveInteger(toolTimeoutMs, DEFAULT_TIMEOUT_MS);
    this.onEvent = typeof onEvent === 'function' ? onEvent : null;
  }

  async execute(plan, { signal, context = {} } = {}) {
    if (!Array.isArray(plan)) throw new TypeError('Plan must be an array');
    if (plan.length > this.maxSteps) {
      throw new AgentFoundationError(
        `Plan contains ${plan.length} steps; maximum is ${this.maxSteps}`,
        { code: 'STEP_LIMIT' },
      );
    }

    const runId = randomUUID();
    const results = [];
    await this.#emit({ type: 'run.started', runId, steps: plan.length });

    try {
      for (let index = 0; index < plan.length; index += 1) {
        throwIfAborted(signal);
        const step = normalizeStep(plan[index], index);
        const tool = this.tools.get(step.tool);
        if (!tool) {
          throw new AgentFoundationError(`Unknown tool "${step.tool}"`, {
            code: 'UNKNOWN_TOOL',
            details: { step: index, tool: step.tool },
          });
        }

        if (tool.validate) {
          const validation = await tool.validate(step.input, context);
          if (validation === false || typeof validation === 'string') {
            throw new AgentFoundationError(
              typeof validation === 'string' ? validation : `Invalid input for tool "${tool.name}"`,
              { code: 'INVALID_TOOL_INPUT', details: { step: index, tool: tool.name } },
            );
          }
        }

        await this.#emit({ type: 'step.started', runId, index, tool: tool.name });
        const output = await runWithRetries(
          ({ signal: attemptSignal, attempt }) =>
            tool.execute(step.input, {
              ...context,
              runId,
              stepIndex: index,
              attempt,
              signal: attemptSignal,
              previousResults: [...results],
            }),
          {
            retries: step.retries ?? tool.retries,
            timeoutMs: step.timeoutMs ?? tool.timeoutMs ?? this.toolTimeoutMs,
            signal,
          },
        );
        const result = Object.freeze({ index, tool: tool.name, output });
        results.push(result);
        this.memory.add({ type: 'tool.result', content: result, metadata: { runId } });
        await this.#emit({ type: 'step.completed', runId, ...result });
      }

      await this.#emit({ type: 'run.completed', runId, results: [...results] });
      return { runId, status: 'completed', results };
    } catch (error) {
      const normalized = normalizeError(error);
      this.memory.add({
        type: 'run.error',
        content: { message: normalized.message, code: normalized.code },
        metadata: { runId },
      });
      await this.#emit({ type: 'run.failed', runId, error: normalized, results: [...results] });
      throw normalized;
    }
  }

  async #emit(event) {
    this.memory.add({ type: event.type, content: event, metadata: { runId: event.runId } });
    if (this.onEvent) await this.onEvent(event);
  }
}

export function createAgentFoundation(options = {}) {
  const tools = options.tools instanceof ToolRegistry ? options.tools : new ToolRegistry();
  for (const tool of options.toolDefinitions ?? []) tools.register(tool);
  const memory = options.memory instanceof AgentMemory ? options.memory : new AgentMemory(options.memoryOptions);
  return new AgentRuntime({ ...options, tools, memory });
}

async function runWithRetries(execute, { retries, timeoutMs, signal }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    throwIfAborted(signal);
    try {
      return await runWithTimeout(
        (attemptSignal) => execute({ signal: attemptSignal, attempt }),
        timeoutMs,
        signal,
      );
    } catch (error) {
      lastError = error;
      if (signal?.aborted) throw abortError(signal.reason);
    }
  }
  throw lastError;
}

async function runWithTimeout(execute, timeoutMs, parentSignal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(parentSignal.reason);
  if (parentSignal) parentSignal.addEventListener('abort', onAbort, { once: true });

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new AgentFoundationError(`Tool execution timed out after ${timeoutMs}ms`, {
        code: 'TOOL_TIMEOUT',
      });
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  const aborted = new Promise((_, reject) => {
    if (parentSignal?.aborted) reject(abortError(parentSignal.reason));
    else parentSignal?.addEventListener('abort', () => reject(abortError(parentSignal.reason)), { once: true });
  });

  try {
    return await Promise.race([Promise.resolve().then(() => execute(controller.signal)), timeout, aborted]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

function normalizeStep(step, index) {
  if (!step || typeof step !== 'object' || !isNonEmptyString(step.tool)) {
    throw new AgentFoundationError(`Plan step ${index} must specify a tool`, {
      code: 'INVALID_STEP',
      details: { step: index },
    });
  }
  return {
    tool: step.tool,
    input: step.input,
    retries: step.retries === undefined ? undefined : normalizeNonNegativeInteger(step.retries, 0),
    timeoutMs: step.timeoutMs === undefined ? undefined : normalizePositiveInteger(step.timeoutMs, DEFAULT_TIMEOUT_MS),
  };
}

function normalizeError(error) {
  if (error instanceof AgentFoundationError) return error;
  if (error?.name === 'AbortError') return abortError(error);
  return new AgentFoundationError(error instanceof Error ? error.message : String(error), {
    code: 'TOOL_ERROR',
    cause: error instanceof Error ? error : undefined,
  });
}

function abortError(reason) {
  return new AgentFoundationError('Agent execution aborted', {
    code: 'ABORTED',
    cause: reason instanceof Error ? reason : undefined,
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError(signal.reason);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}
