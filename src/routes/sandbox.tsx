import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SuperSandbox } from "@/components/super-sandbox";

export const Route = createFileRoute("/sandbox")({ component: SandboxPage });

function SandboxPage() {
  return (
    <AppShell>
      <SuperSandbox />
    </AppShell>
  );
}
