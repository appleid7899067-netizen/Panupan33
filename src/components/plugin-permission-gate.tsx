import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  setPluginPermissionAskHandler,
  type PluginPermissionRequest,
} from "@/lib/plugin-permission";

type Pending = {
  request: PluginPermissionRequest;
  resolve: (allowed: boolean) => void;
};

export function PluginPermissionGate() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setPluginPermissionAskHandler(
      (request) =>
        new Promise<boolean>((resolve) => {
          setPending({ request, resolve });
        }),
    );
    return () => setPluginPermissionAskHandler(null);
  }, []);

  function decide(allowed: boolean) {
    pending?.resolve(allowed);
    setPending(null);
  }

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) decide(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plugin ขออนุญาต</DialogTitle>
          <DialogDescription>
            นโยบายระบบคือ Always Ask — Boss จะไม่เรียกปลั๊กอินจนกว่าคุณจะอนุมัติครั้งนี้
          </DialogDescription>
        </DialogHeader>
        {pending ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted">Plugin</span> {pending.request.pluginName}
            </p>
            <p>
              <span className="text-muted">Tool</span> {pending.request.toolName}
            </p>
            <p className="break-all">
              <span className="text-muted">{pending.request.method}</span> {pending.request.endpoint}
            </p>
            <pre className="max-h-40 overflow-auto rounded-md bg-elevated p-3 font-mono text-xs text-muted">
              {JSON.stringify(pending.request.args, null, 2)}
            </pre>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => decide(false)}>
                ปฏิเสธ
              </Button>
              <Button onClick={() => decide(true)}>อนุญาตครั้งนี้</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
