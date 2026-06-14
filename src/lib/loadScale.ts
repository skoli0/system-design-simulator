export const LOAD_MIN_RPS = 100;
export const LOAD_MAX_RPS = 500_000;
export const LOAD_SLIDER_STEPS = 1000;

export function clampLoadRps(rps: number): number {
  if (!Number.isFinite(rps) || rps <= 0) return LOAD_MIN_RPS;
  return Math.max(LOAD_MIN_RPS, Math.min(LOAD_MAX_RPS, rps));
}

function snapLoadRps(rps: number): number {
  if (rps < 1_000) return Math.round(rps / 10) * 10;
  if (rps < 10_000) return Math.round(rps / 100) * 100;
  if (rps < 100_000) return Math.round(rps / 1_000) * 1_000;
  return Math.round(rps / 5_000) * 5_000;
}

export function rpsToSliderValue(rps: number): number {
  const clamped = clampLoadRps(rps);
  const minLog = Math.log10(LOAD_MIN_RPS);
  const maxLog = Math.log10(LOAD_MAX_RPS);
  const log = Math.log10(clamped);
  return Math.round(((log - minLog) / (maxLog - minLog)) * LOAD_SLIDER_STEPS);
}

export function sliderValueToRps(slider: number): number {
  const t = Math.max(0, Math.min(1, slider / LOAD_SLIDER_STEPS));
  const minLog = Math.log10(LOAD_MIN_RPS);
  const maxLog = Math.log10(LOAD_MAX_RPS);
  const log = minLog + t * (maxLog - minLog);
  return clampLoadRps(snapLoadRps(Math.pow(10, log)));
}

export function loadFromProblemRequirements(readsPerSec: number): number {
  return clampLoadRps(readsPerSec);
}

export function formatLoadRps(rps: number): string {
  return new Intl.NumberFormat("en-US").format(rps);
}
