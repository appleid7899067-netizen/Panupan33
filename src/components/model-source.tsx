import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PUTER_MODEL } from "@/lib/catalog";
import {
  API_KEY_CHANGED_EVENT,
  getCachedOpenRouterModels,
  hasOpenRouterKey,
  type OpenRouterModel,
} from "@/lib/provider-keys";
import { listLivePuterModels, type LivePuterModel } from "@/lib/puter-models";
import { usePuter } from "@/lib/puter-context";
import { useFleet } from "@/lib/store";

export function ModelSource() {
  const { signedIn } = usePuter();
  const modelId = useFleet((s) => s.modelId);
  const gateway = useFleet((s) => s.modelGateway);
  const setModel = useFleet((s) => s.setModel);
  const setGateway = useFleet((s) => s.setModelGateway);
  const [puterModels, setPuterModels] = useState<LivePuterModel[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(() => getCachedOpenRouterModels());
  const [puterError, setPuterError] = useState<string | null>(null);
  const [openRouterOn, setOpenRouterOn] = useState(() => hasOpenRouterKey());

  useEffect(() => {
    const sync = () => {
      setOpenRouterOn(hasOpenRouterKey());
      setOpenRouterModels(getCachedOpenRouterModels());
    };
    window.addEventListener(API_KEY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setPuterModels([]);
      return;
    }
    let cancelled = false;
    listLivePuterModels()
      .then((models) => {
        if (!cancelled) {
          setPuterModels(models);
          setPuterError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setPuterError(err instanceof Error ? err.message : "Could not list Puter models");
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const livePuter = puterModels.length > 0;
  const liveOpenRouter = openRouterOn && openRouterModels.length > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Select
        value={gateway}
        onValueChange={(value) => setGateway(value as "auto" | "puter" | "openrouter")}
      >
        <SelectTrigger className="h-8 w-[9.5rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto</SelectItem>
          <SelectItem value="puter" disabled={!signedIn}>
            Puter{signedIn ? "" : " (sign in)"}
          </SelectItem>
          <SelectItem value="openrouter" disabled={!openRouterOn}>
            OpenRouter{openRouterOn ? "" : " (key)"}
          </SelectItem>
        </SelectContent>
      </Select>

      {gateway === "openrouter" || (gateway === "auto" && liveOpenRouter && !signedIn) ? (
        liveOpenRouter ? (
          <Select value={modelId} onValueChange={setModel}>
            <SelectTrigger className="h-8 w-[min(100%,16rem)] text-xs">
              <SelectValue placeholder="OpenRouter model" />
            </SelectTrigger>
            <SelectContent>
              {openRouterModels.slice(0, 80).map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name || model.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline">OpenRouter: ใส่ key ก่อน ยังไม่มีรายการโมเดล</Badge>
        )
      ) : livePuter ? (
        <Select value={modelId} onValueChange={setModel}>
          <SelectTrigger className="h-8 w-[min(100%,16rem)] text-xs">
            <SelectValue placeholder="Puter model" />
          </SelectTrigger>
          <SelectContent>
            {puterModels.slice(0, 80).map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name || model.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : signedIn ? (
        <Badge variant="outline">{puterError ? "Puter catalog unavailable" : `Puter default ${DEFAULT_PUTER_MODEL}`}</Badge>
      ) : (
        <Badge variant="outline">ยังไม่มีโมเดลที่ยืนยันแล้ว</Badge>
      )}
    </div>
  );
}
