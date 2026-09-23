import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildModelPlan,
  parseToolCalls,
  runModelGateway,
  stripVendorPrefix,
  type ModelCompleter,
} from "./model-gateway.server.ts";

const SAVED_ENV = {
  PUTER_AUTH_TOKEN: process.env.PUTER_AUTH_TOKEN,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

after(() => {
  for (const [key, value] of Object.entries(SAVED_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setEnv(opts: { puterServer?: string; openrouter?: string }) {
  if (opts.puterServer === undefined) delete process.env.PUTER_AUTH_TOKEN;
  else process.env.PUTER_AUTH_TOKEN = opts.puterServer;
  if (opts.openrouter === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = opts.openrouter;
}

const NO_TOOLS: Array<never> = [];

function completingProvider(models: Set<string>): ModelCompleter {
  return async ({ model }) => {
    if (!models.has(model)) throw new Error(`model not found: ${model}`);
    return { text: `hello from ${model}`, toolCalls: [], model, provider: "openrouter" };
  };
}

function puterProvider(models: Set<string>): ModelCompleter {
  return async ({ model }) => {
    if (!models.has(model)) throw new Error(`puter: model not found: ${model}`);
    return {
      text: `hello from puter ${model}`,
      toolCalls: [{ id: "tc-1", name: "web_check", arguments: { url: "https://example.com" } }],
      model,
      provider: "puter",
    };
  };
}

/* ------------------------------------------------------------------ */
/* Pure selection logic                                                */
/* ------------------------------------------------------------------ */

describe("stripVendorPrefix", () => {
  it("strips OpenRouter-style vendor prefixes", () => {
    assert.equal(stripVendorPrefix("openai/gpt-5.6-luna"), "gpt-5.6-luna");
    assert.equal(stripVendorPrefix("gpt-5.6-luna"), "gpt-5.6-luna");
    assert.equal(stripVendorPrefix("deepseek/deepseek-chat"), "deepseek-chat");
  });
});

describe("buildModelPlan — Puter first, OpenRouter fallback", () => {
  it("puts user Puter attempts before OpenRouter, requested id first", () => {
    setEnv({ openrouter: "sk-or-test" });
    const plan = buildModelPlan({ requested: "openai/gpt-5.6-luna", puterUserToken: "user-token", openrouterKey: "sk-or-test" });
    assert.equal(plan.length, 6);
    assert.deepEqual(
      plan.map((p) => `${p.provider}:${p.tokenScope}:${p.model}`),
      [
        "puter:user:openai/gpt-5.6-luna",
        "puter:user:gpt-5.6-luna",
        "puter:user:deepseek/deepseek-chat",
        "openrouter:server:openai/gpt-5.6-luna",
        "openrouter:server:nex-agi/nex-n2.5-pro:free",
        "openrouter:server:nex-agi/nex-n2.5-mini:free",
      ],
    );
  });

  it("prefers the user token over the server Puter token", () => {
    setEnv({ puterServer: "server-puter" });
    const plan = buildModelPlan({ puterUserToken: "user-token", puterServerToken: "server-puter" });
    assert.ok(plan.length > 0);
    assert.ok(plan.every((p) => p.provider === "puter"));
    assert.ok(plan.every((p) => p.tokenScope === "user"));
  });

  it("uses the server Puter token when the user is not signed in", () => {
    setEnv({ puterServer: "server-puter" });
    const plan = buildModelPlan({ puterServerToken: "server-puter" });
    assert.ok(plan.length > 0);
    assert.ok(plan.every((p) => p.provider === "puter"));
    assert.ok(plan.every((p) => p.tokenScope === "server"));
  });

  it("falls back to OpenRouter only when no Puter token exists", () => {
    setEnv({ openrouter: "sk-or-test" });
    const plan = buildModelPlan({ openrouterKey: "sk-or-test" });
    assert.ok(plan.length > 0);
    assert.ok(plan.every((p) => p.provider === "openrouter"));
  });

  it("returns an empty plan when nothing is configured", () => {
    setEnv({});
    assert.deepEqual(buildModelPlan({}), []);
  });

  it("respects maxAttempts", () => {
    setEnv({ openrouter: "sk-or-test" });
    const plan = buildModelPlan({ puterUserToken: "u", openrouterKey: "k", maxAttempts: 2 });
    assert.equal(plan.length, 2);
  });
});

/* ------------------------------------------------------------------ */
/* Gateway runner                                                      */
/* ------------------------------------------------------------------ */

describe("runModelGateway", () => {
  it("walks Puter pool failures into the OpenRouter fallback", async () => {
    setEnv({ openrouter: "sk-or-test" });
    const puter = puterProvider(new Set<string>()); // rejects every model
    const openrouter = completingProvider(new Set(["nex-agi/nex-n2.5-pro:free"]));
    const labels: string[] = [];
    const gw = await runModelGateway({
      messages: [{ role: "user", content: "hi" }],
      tools: NO_TOOLS,
      puterToken: "user-token",
      puterCompleter: puter,
      openrouterCompleter: openrouter,
      onAttempt: (l) => labels.push(l),
    });
    assert.equal(gw.ok, true);
    if (!gw.ok) return;
    assert.equal(gw.result.provider, "openrouter");
    assert.equal(gw.attempt.model, "nex-agi/nex-n2.5-pro:free");
    assert.equal(labels.length, 3); // 2 puter attempts + 1 openrouter
    assert.match(labels[0], /^puter:user /);
    assert.match(labels[2], /^openrouter:server /);
  });

  it("wins on Puter (user token) and parses tool calls", async () => {
    setEnv({});
    const puter = puterProvider(new Set(["gpt-5.6-luna"]));
    const gw = await runModelGateway({
      messages: [{ role: "user", content: "hi" }],
      tools: NO_TOOLS,
      puterToken: "user-token",
      puterCompleter: puter,
    });
    assert.equal(gw.ok, true);
    if (!gw.ok) return;
    assert.equal(gw.result.provider, "puter");
    assert.equal(gw.attempt.tokenScope, "user");
    assert.equal(gw.attempt.model, "gpt-5.6-luna");
    assert.equal(gw.result.toolCalls.length, 1);
    assert.equal(gw.result.toolCalls[0].name, "web_check");
  });

  it("tries the vendor-stripped variant when Puter rejects the OpenRouter id", async () => {
    setEnv({});
    // "openai/gpt-5.6-luna" is not a Puter id, "gpt-5.6-luna" is.
    const puter = puterProvider(new Set(["gpt-5.6-luna"]));
    const gw = await runModelGateway({
      messages: [{ role: "user", content: "hi" }],
      tools: NO_TOOLS,
      puterToken: "user-token",
      requestedModel: "openai/gpt-5.6-luna",
      puterCompleter: puter,
    });
    assert.equal(gw.ok, true);
    if (!gw.ok) return;
    assert.equal(gw.attempt.model, "gpt-5.6-luna");
  });

  it("fails with a clear message when no provider is configured", async () => {
    setEnv({});
    const gw = await runModelGateway({ messages: [{ role: "user", content: "hi" }], tools: NO_TOOLS });
    assert.equal(gw.ok, false);
    if (gw.ok) return;
    assert.match(gw.error, /Puter|OPENROUTER_API_KEY/);
    assert.deepEqual(gw.attempts, []);
  });

  it("reports all attempts when every provider fails", async () => {
    setEnv({ openrouter: "sk-or-test" });
    const failing: ModelCompleter = async ({ model }) => {
      throw new Error(`boom ${model}`);
    };
    const gw = await runModelGateway({
      messages: [{ role: "user", content: "hi" }],
      tools: NO_TOOLS,
      puterToken: "user-token",
      puterCompleter: failing,
      openrouterCompleter: failing,
      maxAttempts: 4,
    });
    assert.equal(gw.ok, false);
    if (gw.ok) return;
    assert.equal(gw.attempts.length, 4);
    assert.match(gw.error, /boom/);
  });
});

describe("parseToolCalls", () => {
  it("parses OpenAI-shaped tool calls with JSON string arguments", () => {
    const calls = parseToolCalls({
      message: { tool_calls: [{ id: "a", function: { name: "web_check", arguments: '{"url":"https://x.com"}' } }] },
    });
    assert.deepEqual(calls, [{ id: "a", name: "web_check", arguments: { url: "https://x.com" } }]);
  });
  it("returns [] for plain text responses", () => {
    assert.deepEqual(parseToolCalls({ message: { content: "hello" } }), []);
    assert.deepEqual(parseToolCalls(undefined), []);
  });
});
