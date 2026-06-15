import { create } from "zustand";
import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";

interface ConceptSimulationState {
  simulationId: string | null;
  definition: ConceptSimulationDefinition | null;
  stepIndex: number;
  isPlaying: boolean;
  activeEdgeIds: string[] | undefined;
  activeNodeIds: string[];

  /** Load definition and show step 0 without starting animation. */
  open: (definition: ConceptSimulationDefinition, stepIndex?: number) => void;
  /** @deprecated Use open + startPlayback */
  start: (definition: ConceptSimulationDefinition, stepIndex?: number) => void;
  startPlayback: () => void;
  stop: () => void;
  setStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPlaying: (playing: boolean) => void;
}

function applyStep(definition: ConceptSimulationDefinition, stepIndex: number) {
  const step = definition.steps[stepIndex];
  if (!step) return { activeEdgeIds: undefined as string[] | undefined, activeNodeIds: [] as string[] };
  return {
    activeEdgeIds: step.activeEdgeIds,
    activeNodeIds: step.activeNodeIds ?? [],
  };
}

export const useConceptSimulationStore = create<ConceptSimulationState>((set, get) => ({
  simulationId: null,
  definition: null,
  stepIndex: 0,
  isPlaying: false,
  activeEdgeIds: undefined,
  activeNodeIds: [],

  open: (definition, stepIndex = 0) => {
    const idx = Math.max(0, Math.min(stepIndex, definition.steps.length - 1));
    const { activeEdgeIds, activeNodeIds } = applyStep(definition, idx);
    set({
      simulationId: definition.id,
      definition,
      stepIndex: idx,
      isPlaying: false,
      activeEdgeIds,
      activeNodeIds,
    });
  },

  start: (definition, stepIndex = 0) => {
    get().open(definition, stepIndex);
    get().startPlayback();
  },

  startPlayback: () => {
    const { definition, stepIndex } = get();
    if (!definition) return;
    set({ isPlaying: true });
    const step = definition.steps[stepIndex];
    if (stepIndex === 0 && step?.activeEdgeIds?.length === 0 && definition.steps.length > 1) {
      get().setStep(1);
    }
  },

  stop: () =>
    set({
      simulationId: null,
      definition: null,
      stepIndex: 0,
      isPlaying: false,
      activeEdgeIds: undefined,
      activeNodeIds: [],
    }),

  setStep: (index) => {
    const { definition } = get();
    if (!definition) return;
    const idx = Math.max(0, Math.min(index, definition.steps.length - 1));
    const { activeEdgeIds, activeNodeIds } = applyStep(definition, idx);
    set({ stepIndex: idx, activeEdgeIds, activeNodeIds });
  },

  nextStep: () => {
    const { definition, stepIndex } = get();
    if (!definition) return;
    const next = stepIndex >= definition.steps.length - 1 ? 0 : stepIndex + 1;
    get().setStep(next);
  },

  prevStep: () => {
    const { definition, stepIndex } = get();
    if (!definition) return;
    const prev = stepIndex <= 0 ? definition.steps.length - 1 : stepIndex - 1;
    get().setStep(prev);
  },

  setPlaying: (playing) => set({ isPlaying: playing }),
}));
