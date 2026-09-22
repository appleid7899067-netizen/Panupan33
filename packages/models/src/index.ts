export type ModelDescriptor = {
  id: string;
  provider: string;
  name: string;
  capabilities?: string[];
};

export const DEFAULT_MODELS: ModelDescriptor[] = [
  { id: "gpt-5.6-luna", provider: "openai", name: "GPT-5.6 Luna", capabilities: ["chat", "reasoning", "coding"] },
  { id: "gpt-5.6-sol", provider: "openai", name: "GPT-5.6 Sol", capabilities: ["chat", "reasoning", "coding"] },
];

export function registerModels(models: ModelDescriptor[]) {
  return [...DEFAULT_MODELS, ...models];
}
