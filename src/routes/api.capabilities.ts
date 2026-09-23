import { createFileRoute } from "@tanstack/react-router";
import { getCapabilitySnapshot } from "@/lib/boss-engine/capabilities";

export const Route = createFileRoute("/api/capabilities")({
  server: {
    handlers: {
      GET: () =>
        Response.json(getCapabilitySnapshot(), {
          headers: {
            "cache-control": "no-store",
          },
        }),
    },
  },
});
