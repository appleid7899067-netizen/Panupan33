export type CircuitState = "closed" | "open" | "half-open";

export type CircuitSnapshot = { state: CircuitState; failures: number; openedAt?: number };

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  constructor(private readonly threshold = 5, private readonly cooldownMs = 5 * 60_000) {}

  state(now = Date.now()): CircuitState {
    if (this.openedAt && now - this.openedAt >= this.cooldownMs) return "half-open";
    return this.openedAt ? "open" : "closed";
  }

  allow(now = Date.now()): boolean {
    return this.state(now) !== "open";
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = now;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = 0;
  }

  snapshot(now = Date.now()): CircuitSnapshot {
    return { state: this.state(now), failures: this.failures, openedAt: this.openedAt || undefined };
  }
}
