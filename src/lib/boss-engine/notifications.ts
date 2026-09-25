/**
 * Notifications / Shared Thread events
 * In-app event log; push delivery is optional later (Web Push / FCM).
 */

export type NotifyKind =
  | "approval_needed"
  | "job_done"
  | "job_failed"
  | "evidence_ready"
  | "routine_taught"
  | "info";

export type NotifyEvent = {
  id: string;
  kind: NotifyKind;
  title: string;
  body: string;
  threadId?: string;
  createdAt: number;
  read: boolean;
};

export type NotifyBus = {
  events: NotifyEvent[];
};

export function createNotifyBus(): NotifyBus {
  return { events: [] };
}

export function pushNotify(
  bus: NotifyBus,
  input: { kind: NotifyKind; title: string; body: string; threadId?: string },
): NotifyBus {
  const event: NotifyEvent = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: input.kind,
    title: input.title,
    body: input.body,
    threadId: input.threadId,
    createdAt: Date.now(),
    read: false,
  };
  return { events: [event, ...bus.events].slice(0, 100) };
}

export function unreadCount(bus: NotifyBus): number {
  return bus.events.filter((e) => !e.read).length;
}

export function markAllRead(bus: NotifyBus): NotifyBus {
  return { events: bus.events.map((e) => ({ ...e, read: true })) };
}
