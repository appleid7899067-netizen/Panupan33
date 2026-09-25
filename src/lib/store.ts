import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PUTER_MODEL } from "@/lib/catalog";
import { uid } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  model?: string;
  activity?: string[];
  attachments?: Array<{ name: string; size: number; type: string }>;
  verified?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  messages: ChatMessage[];
};

export type AgentSettings = {
  autonomy: "balanced" | "high" | "supervised";
  maxIterations: 3 | 6 | 8 | 10;
  requireVerification: boolean;
  autoRepair: boolean;
  autoTools: boolean;
  webAccess: boolean;
  sandboxAccess: boolean;
  githubAccess: boolean;
  mcpAccess: boolean;
  showProgress: boolean;
  rememberContext: boolean;
};

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  autonomy: "high",
  maxIterations: 8,
  requireVerification: true,
  autoRepair: true,
  autoTools: true,
  webAccess: true,
  sandboxAccess: true,
  githubAccess: true,
  mcpAccess: true,
  showProgress: true,
  rememberContext: true,
};

export type MemoryNote = {
  id: string;
  text: string;
  createdAt: number;
};

type FleetState = {
  modelId: string;
  modelGateway: "puter" | "openrouter" | "auto";
  threads: ChatThread[];
  activeThreadId: string | null;
  memory: MemoryNote[];
  agentSettings: AgentSettings;
  setModel: (id: string) => void;
  setModelGateway: (gateway: FleetState["modelGateway"]) => void;
  setAgentSettings: (settings: Partial<AgentSettings>) => void;
  resetAgentSettings: () => void;
  newThread: () => string;
  setActiveThread: (id: string) => void;
  pinThread: (id: string) => void;
  deleteThread: (id: string) => void;
  appendMessage: (
    threadId: string,
    msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: string },
  ) => string;
  patchMessage: (threadId: string, messageId: string, content: string) => void;
  patchActivity: (threadId: string, messageId: string, activity: string[]) => void;
  patchVerified: (threadId: string, messageId: string, verified: boolean) => void;
  learnMemory: (text: string) => void;
  removeMemory: (id: string) => void;
};

const seedThread = (): ChatThread => ({
  id: "welcome",
  title: "Welcome",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [
    {
      id: "w1",
      role: "assistant",
      createdAt: Date.now(),
      content:
        "Boss พร้อมแล้ว คุยอย่างเดียว — ไม่ต้องกด Skill\n\nไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้\n\nSign in with Puter เพื่อใช้โมเดลฟรี หรือใส่ OpenRouter key (sk-or-...) เพื่อเรียกโมเดลจาก OpenRouter โดยตรง\n\nลอง:\n- แก้บั๊กจากไฟล์ที่แนบ\n- ตรวจ repo / CI\n- รันโค้ดใน Sandbox แล้วส่ง error กลับมาซ่อม",
    },
  ],
});

export const useFleet = create<FleetState>()(
  persist(
    (set, get) => ({
      modelId: DEFAULT_PUTER_MODEL,
      modelGateway: "auto",
      threads: [seedThread()],
      activeThreadId: "welcome",
      memory: [],
      agentSettings: DEFAULT_AGENT_SETTINGS,
      setModel: (id) => set({ modelId: id }),
      setModelGateway: (modelGateway) => set({ modelGateway }),
      setAgentSettings: (settings) => set({ agentSettings: { ...get().agentSettings, ...settings } }),
      resetAgentSettings: () => set({ agentSettings: DEFAULT_AGENT_SETTINGS }),
      newThread: () => {
        const id = uid("chat");
        const thread: ChatThread = {
          id,
          title: "New chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        set({ threads: [thread, ...get().threads], activeThreadId: id });
        return id;
      },
      setActiveThread: (id) => set({ activeThreadId: id }),
      pinThread: (id) =>
        set({ threads: get().threads.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)) }),
      deleteThread: (id) => {
        const next = get().threads.filter((t) => t.id !== id);
        set({
          threads: next.length ? next : [seedThread()],
          activeThreadId: get().activeThreadId === id ? (next[0]?.id ?? "welcome") : get().activeThreadId,
        });
      },
      appendMessage: (threadId, msg) => {
        const id = msg.id ?? uid("m");
        set({
          threads: get().threads.map((t) => {
            if (t.id !== threadId) return t;
            const message: ChatMessage = {
              id,
              createdAt: Date.now(),
              role: msg.role,
              content: msg.content,
              model: msg.model,
              activity: msg.activity,
              attachments: msg.attachments,
              verified: msg.verified,
            };
            const title =
              t.title === "New chat" && msg.role === "user" ? msg.content.slice(0, 42) || t.title : t.title;
            return { ...t, title, updatedAt: Date.now(), messages: [...t.messages, message] };
          }),
        });
        return id;
      },
      patchMessage: (threadId, messageId, content) =>
        set({
          threads: get().threads.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              updatedAt: Date.now(),
              messages: t.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
            };
          }),
        }),
      patchActivity: (threadId, messageId, activity) =>
        set({
          threads: get().threads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) => (m.id === messageId ? { ...m, activity } : m)),
                },
          ),
        }),
      patchVerified: (threadId, messageId, verified) =>
        set({
          threads: get().threads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) => (m.id === messageId ? { ...m, verified } : m)),
                },
          ),
        }),
      learnMemory: (text) => {
        const normalized = text.trim();
        if (!normalized) return;
        const current = get().memory;
        if (current.some((item) => item.text === normalized)) return;
        set({ memory: [{ id: uid("mem"), text: normalized, createdAt: Date.now() }, ...current].slice(0, 48) });
      },
      removeMemory: (id) => set({ memory: get().memory.filter((m) => m.id !== id) }),
    }),
    { name: "bossnu-slielo-store" },
  ),
);
