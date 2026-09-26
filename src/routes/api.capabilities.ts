import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/capabilities")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          runtime: "grok-build",
          modelProvider: "puter",
          mcp: ["github", "gitlab", "render"],
        }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
