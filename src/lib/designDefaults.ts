import type { ProblemRequirements } from "@/types/problem";
import { DEFAULT_SIMULATION_LOAD_RPS } from "@/lib/loadScale";

export interface CapacitySettings {
  dau: number;
  reqPerUser: number;
  writeRatio: number;
  dataSizeKB: number;
}

export const DEFAULT_DESIGN_REQUIREMENTS: ProblemRequirements = {
  readsPerSec: DEFAULT_SIMULATION_LOAD_RPS,
  writesPerSec: 1_000,
  storageGB: 1_000,
  latencyMs: 200,
  users: "10M DAU",
};

export const DEFAULT_CAPACITY_SETTINGS: CapacitySettings = {
  dau: 10_000_000,
  reqPerUser: 20,
  writeRatio: 0.2,
  dataSizeKB: 5,
};
