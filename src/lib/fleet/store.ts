import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Conversation,
  CustomSkill,
  Locale,
  VirtualFile,
} from "./types";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type FleetState = {
  locale: Locale;
  enabledSkillIds: string[];
  enabledConnectorIds: string[];
  customSkills: CustomSkill[];
  conversations: Conversation[];
  activeChatId: string;
  files: VirtualFile[];
  webOn: boolean;
  codeOn: boolean;
  agentsOn: boolean;
  setLocale: (locale: Locale) => void;
  toggleSkill: (id: string) => void;
  toggleConnector: (id: string) => void;
  addCustomSkill: (skill: Omit<CustomSkill, "id">) => void;
  removeCustomSkill: (id: string) => void;
  newChat: () => string;
  setActiveChat: (id: string) => void;
  deleteChat: (id: string) => void;
  patchChat: (id: string, patch: Partial<Conversation>) => void;
  addFile: (file: Omit<VirtualFile, "id">) => void;
  removeFile: (id: string) => void;
  setWebOn: (v: boolean) => void;
  setCodeOn: (v: boolean) => void;
  setAgentsOn: (v: boolean) => void;
};

const firstId = "boot";

export const useFleet = create<FleetState>()(
  persist(
    (set, get) => ({
      locale: "th",
      enabledSkillIds: [
        "code-architect",
        "api-client",
        "design-ui",
        "xai-api",
      ],
      enabledConnectorIds: ["github", "web-fetch"],
      customSkills: [],
      conversations: [
        {
          id: firstId,
          title: "boot",
          messages: [],
          updatedAt: Date.now(),
        },
      ],
      activeChatId: firstId,
      files: [],
      webOn: true,
      codeOn: false,
      agentsOn: false,
      setLocale: (locale) => set({ locale }),
      toggleSkill: (id) => {
        const cur = get().enabledSkillIds;
        set({
          enabledSkillIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
        });
      },
      toggleConnector: (id) => {
        const cur = get().enabledConnectorIds;
        set({
          enabledConnectorIds: cur.includes(id)
            ? cur.filter((x) => x !== id)
            : [...cur, id],
        });
      },
      addCustomSkill: (skill) =>
        set({
          customSkills: [...get().customSkills, { ...skill, id: uid() }],
        }),
      removeCustomSkill: (id) =>
        set({
          customSkills: get().customSkills.filter((s) => s.id !== id),
          enabledSkillIds: get().enabledSkillIds.filter((x) => x !== id),
        }),
      newChat: () => {
        const id = uid();
        const chat: Conversation = {
          id,
          title: "untitled",
          messages: [],
          updatedAt: Date.now(),
        };
        set({
          conversations: [chat, ...get().conversations],
          activeChatId: id,
        });
        return id;
      },
      setActiveChat: (id) => set({ activeChatId: id }),
      deleteChat: (id) => {
        const next = get().conversations.filter((c) => c.id !== id);
        const conversations = next.length
          ? next
          : [{ id: uid(), title: "untitled", messages: [], updatedAt: Date.now() }];
        set({
          conversations,
          activeChatId: conversations[0].id,
        });
      },
      patchChat: (id, patch) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
          ),
        }),
      addFile: (file) => set({ files: [...get().files, { ...file, id: uid() }] }),
      removeFile: (id) => set({ files: get().files.filter((f) => f.id !== id) }),
      setWebOn: (webOn) => set({ webOn }),
      setCodeOn: (codeOn) => set({ codeOn }),
      setAgentsOn: (agentsOn) => set({ agentsOn }),
    }),
    { name: "fleetos-v1" },
  ),
);

export { uid };
