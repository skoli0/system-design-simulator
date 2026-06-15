import { getConceptSimulation } from "@/data/conceptSimulations";
import { useLearnStore } from "@/store/learnStore";
import { useAppStore } from "@/store/appStore";
import { useConceptSimulationStore } from "@/store/conceptSimulationStore";
import { stopConceptSimulationRunner } from "@/lib/conceptSimulationRunner";

/** Open a concept tutorial in the dedicated learn view (not the design canvas). */
export function openConceptTutorial(simulationId: string): boolean {
  const definition = getConceptSimulation(simulationId);
  if (!definition) {
    useAppStore.getState().showToast("Tutorial not found", "info");
    return false;
  }

  stopConceptSimulationRunner();
  useLearnStore.getState().openTutorial(simulationId);
  useConceptSimulationStore.getState().open(definition, 0);
  useAppStore.getState().setActiveLeftTab("learn");

  return true;
}

export function closeConceptTutorial(): void {
  stopConceptSimulationRunner();
  useLearnStore.getState().closeTutorial();
  useConceptSimulationStore.getState().stop();
}

/** @deprecated Use openConceptTutorial */
export function openConceptSimulation(simulationId: string): boolean {
  return openConceptTutorial(simulationId);
}

export function loadConceptSimulation(simulationId: string): boolean {
  return openConceptTutorial(simulationId);
}
