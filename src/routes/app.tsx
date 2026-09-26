import { createFileRoute } from "@tanstack/react-router";
import { MobileChat } from "@/components/mobile-chat";

export const Route = createFileRoute("/app")({ component: AppPage });

function AppPage() {
  return <MobileChat />;
}
