import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SuperBrain } from "@/components/super-brain";

export const Route = createFileRoute("/models")({ component: ModelsPage });

function ModelsPage() {
  return (
    <AppShell>
      <SuperBrain />
    </AppShell>
  );
}
