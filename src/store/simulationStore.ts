import { create } from "zustand";
import { DEFAULT_SIMULATION_LOAD_RPS } from "@/lib/loadScale";
import type { SimulationResult, SimulationConfig } from "@/types/simulation";
import type { ScoreResult } from "@/types/scoring";

interface SimulationState {
  isRunning: boolean;
  /** Keeps edge traffic animation visible after a run completes. */
  trafficActive: boolean;
  config: SimulationConfig;
  result: SimulationResult | null;
  scoreResult: ScoreResult | null;
  showScore: boolean;

  setRunning: (running: boolean) => void;
  setTrafficActive: (active: boolean) => void;
  setConfig: (config: Partial<SimulationConfig>) => void;
  setResult: (result: SimulationResult | null) => void;
  setScoreResult: (result: ScoreResult | null) => void;
  setShowScore: (show: boolean) => void;
  reset: () => void;
}

const defaultConfig: SimulationConfig = {
  requestsPerSec: DEFAULT_SIMULATION_LOAD_RPS,
  durationSec: 10,
  rampUp: true,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  trafficActive: false,
  config: defaultConfig,
  result: null,
  scoreResult: null,
  showScore: false,

  setRunning: (running) => set({ isRunning: running }),
  setTrafficActive: (active) => set({ trafficActive: active }),
  setConfig: (config) =>
    set((s) => ({ config: { ...s.config, ...config } })),
  setResult: (result) => set({ result }),
  setScoreResult: (result) => set({ scoreResult: result }),
  setShowScore: (show) => set({ showScore: show }),
  reset: () =>
    set({
      isRunning: false,
      trafficActive: false,
      config: defaultConfig,
      result: null,
      scoreResult: null,
      showScore: false,
    }),
}));
