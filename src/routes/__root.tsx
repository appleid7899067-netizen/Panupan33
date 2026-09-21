import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PluginPermissionGate } from "@/components/plugin-permission-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PuterProvider } from "@/lib/puter-context";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { APP_NAME, MOTTO_EN } from "@/lib/catalog";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: `${MOTTO_EN} AI coding agent for Bossnu SlieLo.` },
      { name: "theme-color", content: "#0b0c0e" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Thai:wght@400;500;600&family=Sora:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="th" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <PuterProvider>
            <TooltipProvider delayDuration={200}>
              <Outlet />
              <PluginPermissionGate />
              <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "#1c2026",
                    border: "1px solid #262b32",
                    color: "#eceef2",
                  },
                }}
              />
            </TooltipProvider>
          </PuterProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
