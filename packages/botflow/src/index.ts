export type BotFlowStep = {
  id: string;
  label: string;
  run: () => Promise<void>;
};

export async function runBotFlow(steps: BotFlowStep[], onStep?: (step: BotFlowStep) => void) {
  for (const step of steps) {
    onStep?.(step);
    await step.run();
  }
}
