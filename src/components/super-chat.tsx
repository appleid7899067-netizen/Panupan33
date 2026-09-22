/**
 * TEMPORARY: super-chat was partially overwritten during BotStatusMd integration.
 *
 * To restore + enable Markdown status:
 * 1. Restore this file from commit afaea36dca5b2ab21880419c7c6b4341d5b954d6
 *    git checkout afaea36 -- src/components/super-chat.tsx
 * 2. Add: import { BotStatusMd } from "@/components/bot-status-md";
 * 3. Replace the Boss Live activity block with:
 *
 *    {m.role === "assistant" && m.activity && m.activity.length > 0 && (
 *      <BotStatusMd
 *        steps={m.id === liveStream.id ? liveStream.steps : (m.activity ?? [])}
 *        active={m.id === liveStream.id && liveStream.active}
 *        verified={m.verified === true}
 *        open={traceOpen}
 *        onToggle={() => setTraceOpen((v) => !v)}
 *      />
 *    )}
 *
 * Component ready: src/components/bot-status-md.tsx
 */
export function SuperChat() {
  return (
    <div className="p-8 text-zinc-300 text-sm">
      <p className="mb-2 font-medium text-zinc-100">Boss Chat — กำลังกู้คืน</p>
      <p>รันคำสั่งด้านล่างใน repo แล้ว push:</p>
      <pre className="mt-3 rounded-lg bg-zinc-900 p-3 text-xs text-emerald-400 overflow-x-auto">{`git checkout afaea36 -- src/components/super-chat.tsx`}</pre>
      <p className="mt-3 text-zinc-500">จากนั้นเพิ่ม import BotStatusMd และแทนที่บล็อก Boss Live ตามคอมเมนต์ด้านบน</p>
    </div>
  );
}
