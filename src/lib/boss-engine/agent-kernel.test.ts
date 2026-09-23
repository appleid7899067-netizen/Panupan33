import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAgentKernel,
  recordAction,
  recordFailure,
  recordObservation,
  shouldAvoidAction,
  decideNext,
  finalVerificationGate,
} from "./agent-kernel.ts";

describe("agent-kernel", () => {
  it("requires real evidence before completing a mutation", () => {
    let state = createAgentKernel("แก้ bug ใน owner/repo แล้วตรวจให้ผ่าน");
    state = recordAction(state, "act", "github_get_file", { path: "src/main.ts" });
    assert.equal(decideNext(state).kind, "verify");
    assert.equal(finalVerificationGate(state).ok, false);

    state = recordObservation(state, "github_write_file", true, "commit created", true);
    state = recordObservation(state, "ci", true, "workflow passed", true);
    assert.equal(finalVerificationGate(state).ok, true);
  });

  it("detects repeated actions and pushes recovery", () => {
    let state = createAgentKernel("แก้ error ใน repo");
    state = recordAction(state, "act", "github_get_file", { path: "src/main.ts" });
    state = recordAction(state, "act", "github_get_file", { path: "src/main.ts" });
    assert.equal(shouldAvoidAction(state, "github_get_file", { path: "src/main.ts" }), true);

    state = recordFailure(state, "github_get_file");
    state = recordFailure(state, "github_get_file");
    assert.equal(decideNext(state).kind, "recover");
  });

  it("requires live evidence for deployment goals", () => {
    let state = createAgentKernel("deploy https://example.com");
    state = recordObservation(state, "github_commit", true, "commit pushed", true);
    assert.equal(finalVerificationGate(state).ok, false);

    state = recordObservation(state, "web_check", true, "HTTP 200", true);
    assert.equal(finalVerificationGate(state).ok, true);
  });
});
