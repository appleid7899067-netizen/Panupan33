import type { ResourceAdapter, BorrowedResource } from "./resource-adapters";
import type { ResourcePlan, ResourceRequest } from "./resource-broker";

export type BrowserRuntime = "playwright-container" | "remote-browser";

export type BrowserResource = BorrowedResource & {
  kind: "browser";
  runtime: BrowserRuntime;
  launch: {
    image: string;
    command: string;
  };
};

export const PLAYWRIGHT_CONTAINER_ADAPTER: ResourceAdapter = {
  kind: "browser" as never,
  canProvide: (request: ResourceRequest) =>
    request.kind === ("browser" as never) && /browser|scrap|render|page|website|web/i.test(request.goal),
  acquire: async (request: ResourceRequest, plan: ResourcePlan) => ({
    id: "browser-lease-" + Date.now().toString(36),
    kind: "browser" as never,
    mode: "borrow",
    provider: "docker-playwright",
    leaseMinutes: plan.expiresAfterMinutes,
    goal: request.goal,
    status: "active",
  }),
  release: async () => undefined,
};

export const PLAYWRIGHT_DOCKER = {
  image: "mcr.microsoft.com/playwright:v1.40.0-jammy",
  shell: "docker run --rm -it mcr.microsoft.com/playwright:v1.40.0-jammy bash",
  browserServer:
    "docker run --rm -p 9222:9222 mcr.microsoft.com/playwright:v1.40.0-jammy npx playwright launch-server --browser chromium --port 9222",
  runtime: "playwright-container" as const,
};
