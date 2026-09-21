import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SuperChat } from "@/components/super-chat";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  return (
    <AppShell>
      <SuperChat />
    </AppShell>
  );
}
