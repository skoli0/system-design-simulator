import type { Node } from "@xyflow/react";
import { runSimulation } from "@/engine/simulator";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useAppStore } from "@/store/appStore";
import type { SimulationResult } from "@/types/simulation";

let activeIntervalId: number | null = null;

export function isSimulationActive(): boolean {
  const { isRunning, trafficActive } = useSimulationStore.getState();
  return isRunning || trafficActive;
}

export function clearSimulationOverlay(): void {
  const { nodes, updateAllNodeData } = useCanvasStore.getState();
  const updates = new Map<string, Record<string, unknown>>();

  for (const n of nodes) {
    if (n.type === "text") continue;
    updates.set(n.id, {
      utilization: 0,
      status: "idle",
      isBottleneck: false,
    });
  }

  if (updates.size > 0) updateAllNodeData(updates);
}

export function applyMetricsToCanvas(result: SimulationResult): void {
  const updates = new Map<string, Record<string, unknown>>();
  for (const [nodeId, metrics] of result.nodeMetrics) {
    updates.set(nodeId, {
      utilization: metrics.utilization,
      status: metrics.status,
      isBottleneck: metrics.isBottleneck,
    });
  }
  useCanvasStore.getState().updateAllNodeData(updates);
}

export function stopSimulation(options?: {
  clearOverlay?: boolean;
  keepResult?: boolean;
  silent?: boolean;
}): void {
  if (activeIntervalId !== null) {
    window.clearInterval(activeIntervalId);
    activeIntervalId = null;
  }

  const sim = useSimulationStore.getState();
  const wasRunning = sim.isRunning;
  const hadResult = sim.result !== null;

  sim.setRunning(false);
  sim.setTrafficActive(false);

  // Mid-run stop clears everything; post-run "stop traffic" keeps metrics visible
  const clearOverlay = options?.clearOverlay ?? wasRunning;
  const keepResult = options?.keepResult ?? (!wasRunning && hadResult);

  if (clearOverlay) {
    clearSimulationOverlay();
  }

  if (!keepResult) {
    sim.setResult(null);
  }

  if (!options?.silent) {
    useAppStore
      .getState()
      .showToast(wasRunning ? "Simulation stopped" : "Traffic stopped", "info");
  }
}

export interface RunSimulationOptions {
  /** Top-bar Simulate vs panel Run Simulation — affects tab focus and toasts. */
  source?: "topbar" | "panel";
  /** Called when bottlenecks are detected (top-bar flow switches to Simulate tab). */
  onBottlenecks?: () => void;
  /** Skip ramp-up animation and apply metrics immediately (slider / preset updates). */
  instant?: boolean;
  /** Suppress completion toasts (live load tweaks). */
  silent?: boolean;
}

export function runSimulationWithAnimation(
  options?: RunSimulationOptions
): boolean {
  const { nodes, edges } = useCanvasStore.getState();
  const { config } = useSimulationStore.getState();

  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];

  if (componentNodes.length === 0) {
    useAppStore.getState().showToast("No components to simulate", "info");
    return false;
  }

  // Cancel any in-flight or post-run traffic before starting fresh
  stopSimulation({ clearOverlay: true, keepResult: false, silent: true });

  const sim = useSimulationStore.getState();
  const result = runSimulation(componentNodes, edges, config.requestsPerSec);

  if (options?.instant) {
    sim.setRunning(false);
    sim.setTrafficActive(true);
    sim.setResult(result);
    applyMetricsToCanvas(result);
    if (!options.silent) {
      const bottleneckCount = result.bottleneckNodes.length;
      if (bottleneckCount > 0) {
        useAppStore
          .getState()
          .showToast(
            `${bottleneckCount} bottleneck${bottleneckCount > 1 ? "s" : ""} detected`,
            "info"
          );
      }
    }
    return true;
  }

  sim.setRunning(true);
  sim.setTrafficActive(false);
  sim.setResult(null);

  const steps = 24;
  const stepMs = 80;
  let step = 0;

  activeIntervalId = window.setInterval(() => {
    step += 1;
    const progress = Math.min(step / steps, 1);

    const updates = new Map<string, Record<string, unknown>>();
    for (const [nodeId, metrics] of result.nodeMetrics) {
      updates.set(nodeId, {
        utilization: metrics.utilization * progress,
        status: progress >= 1 ? metrics.status : "healthy",
        isBottleneck: progress >= 1 ? metrics.isBottleneck : false,
      });
    }
    useCanvasStore.getState().updateAllNodeData(updates);

    if (step >= steps) {
      if (activeIntervalId !== null) {
        window.clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      sim.setResult(result);
      sim.setRunning(false);
      sim.setTrafficActive(true);
      applyMetricsToCanvas(result);

      const bottleneckCount = result.bottleneckNodes.length;
      const fromTopBar = options?.source === "topbar";

      if (bottleneckCount > 0) {
        if (fromTopBar) {
          options?.onBottlenecks?.();
          useAppStore
            .getState()
            .showToast(
              `${bottleneckCount} bottleneck${bottleneckCount > 1 ? "s" : ""} detected — review and scale below`,
              "info"
            );
        } else {
          useAppStore
            .getState()
            .showToast(
              `Simulation complete — ${bottleneckCount} bottleneck${bottleneckCount > 1 ? "s" : ""} detected`,
              "info"
            );
        }
      } else {
        useAppStore
          .getState()
          .showToast("Simulation complete — no bottlenecks!", "success");
      }
    }
  }, stepMs);

  return true;
}

/** Re-run simulation at the current slider load without ramp-up animation. */
export function rerunSimulationAtCurrentLoad(options?: { silent?: boolean }): boolean {
  const { nodes, edges } = useCanvasStore.getState();
  const { config, trafficActive, result, isRunning } = useSimulationStore.getState();

  if (!trafficActive && !result) return false;

  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];

  if (componentNodes.length === 0) return false;

  if (activeIntervalId !== null) {
    window.clearInterval(activeIntervalId);
    activeIntervalId = null;
  }

  const sim = useSimulationStore.getState();
  const nextResult = runSimulation(componentNodes, edges, config.requestsPerSec);

  sim.setRunning(false);
  sim.setTrafficActive(true);
  sim.setResult(nextResult);
  applyMetricsToCanvas(nextResult);

  if (!options?.silent && !isRunning) {
    const bottleneckCount = nextResult.bottleneckNodes.length;
    if (bottleneckCount > 0) {
      useAppStore
        .getState()
        .showToast(
          `${bottleneckCount} bottleneck${bottleneckCount > 1 ? "s" : ""} at this load`,
          "info"
        );
    }
  }

  return true;
}
