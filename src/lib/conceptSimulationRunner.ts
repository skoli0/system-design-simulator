import { useConceptSimulationStore } from "@/store/conceptSimulationStore";

let intervalId: ReturnType<typeof setInterval> | null = null;

export function stopConceptSimulationRunner(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function startConceptSimulationRunner(): void {
  stopConceptSimulationRunner();

  const { definition, isPlaying } = useConceptSimulationStore.getState();
  if (!definition || !isPlaying || !definition.autoPlayMs) return;

  intervalId = setInterval(() => {
    const state = useConceptSimulationStore.getState();
    if (!state.definition || !state.isPlaying) return;
    state.nextStep();
  }, definition.autoPlayMs);
}
