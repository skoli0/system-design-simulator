"use client";

import { useCallback, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Play, Loader2, Square, TrendingUp } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import type { Node } from "@xyflow/react";
import {
  applyBottleneckFixes,
  getBottleneckFixes,
} from "@/engine/bottleneckFix";
import { rerunSimulationAtCurrentLoad } from "@/lib/simulationRunner";
import {
  formatLoadRps,
  LOAD_MAX_RPS,
  LOAD_MIN_RPS,
  LOAD_SLIDER_STEPS,
  rpsToSliderValue,
  sliderValueToRps,
} from "@/lib/loadScale";

const PRESETS = [
  { label: "Light", value: 1000 },
  { label: "Medium", value: 10000 },
  { label: "Heavy", value: 100000 },
  { label: "Stress", value: 500000 },
];

interface SimulationControlsProps {
  onSimulate: () => void;
  onStop: () => void;
}

export function SimulationControls({ onSimulate, onStop }: SimulationControlsProps) {
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const result = useSimulationStore((s) => s.result);
  const nodes = useCanvasStore((s) => s.nodes);

  const simActive = isRunning || trafficActive;
  const hasBottlenecks = (result?.bottleneckNodes.length ?? 0) > 0;
  const hasSimData = trafficActive || result !== null;

  const sliderValue = rpsToSliderValue(config.requestsPerSec);
  const rerunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextRerunRef = useRef(false);

  const scheduleRerun = useCallback(() => {
    if (!hasSimData || isRunning) return;
    if (rerunTimerRef.current) clearTimeout(rerunTimerRef.current);
    rerunTimerRef.current = setTimeout(() => {
      rerunSimulationAtCurrentLoad({ silent: true });
    }, 250);
  }, [hasSimData, isRunning]);

  useEffect(() => {
    if (skipNextRerunRef.current) {
      skipNextRerunRef.current = false;
      return;
    }
    scheduleRerun();
    return () => {
      if (rerunTimerRef.current) clearTimeout(rerunTimerRef.current);
    };
  }, [config.requestsPerSec, scheduleRerun]);

  const setLoadRps = useCallback(
    (rps: number) => {
      setConfig({ requestsPerSec: rps });
    },
    [setConfig]
  );

  const handleSliderChange = (values: number[]) => {
    const next = sliderValueToRps(Array.isArray(values) ? values[0] : values);
    setLoadRps(next);
  };

  const handlePreset = (value: number) => {
    setLoadRps(value);
  };

  const handleFixBottlenecks = () => {
    if (!result) return;

    const componentNodes = nodes.filter(
      (n) => n.type !== "text"
    ) as Node<ComponentNodeData>[];
    const fixes = getBottleneckFixes(componentNodes, result);
    const scalableFixes = fixes.filter((f) => f.action === "scale");

    if (scalableFixes.length === 0) {
      useAppStore
        .getState()
        .showToast(
          "No auto-scalable bottlenecks — see hints in metrics below",
          "info"
        );
      return;
    }

    const applied = applyBottleneckFixes(scalableFixes);
    if (applied > 0) {
      useAppStore
        .getState()
        .showToast(
          `Added capacity to ${applied} component${applied > 1 ? "s" : ""} — re-running simulation`,
          "success"
        );
      skipNextRerunRef.current = true;
      onSimulate();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Simulation Config
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.value)}
            disabled={isRunning}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              config.requestsPerSec === preset.value
                ? "bg-cyan-500/15 text-cyan-500"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground/80"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Requests/sec</label>
            <span className="font-mono text-xs text-cyan-500">
              {formatLoadRps(config.requestsPerSec)}
            </span>
          </div>
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            min={0}
            max={LOAD_SLIDER_STEPS}
            step={1}
            disabled={isRunning}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatLoadRps(LOAD_MIN_RPS)}</span>
            <span>{formatLoadRps(LOAD_MAX_RPS)}</span>
          </div>
        </div>
      </div>

      <Separator className="bg-muted" />

      {isRunning && (
        <div className="flex items-center gap-2 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-500" />
          <p className="text-xs text-cyan-600 dark:text-cyan-400">
            Starting simulation...
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {simActive ? (
          <Button
            onClick={onStop}
            variant="outline"
            className="w-full gap-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Stop simulation
              </>
            ) : (
              <>
                <Square className="h-3 w-3 fill-current" />
                Stop traffic
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={onSimulate}
            className="w-full gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
            size="sm"
          >
            <Play className="h-3 w-3" />
            Run Simulation
          </Button>
        )}

        {hasBottlenecks && !isRunning && (
          <Button
            onClick={handleFixBottlenecks}
            variant="outline"
            className="w-full gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 dark:text-amber-400"
            size="sm"
          >
            <TrendingUp className="h-3 w-3" />
            Scale bottlenecks
          </Button>
        )}
      </div>

      {simActive && !isRunning && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Traffic animation is active on the canvas. Adjust the slider to see load
          and bottlenecks update live.
        </p>
      )}

      {!simActive && !isRunning && result && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Simulation complete. Review metrics below or adjust load and run again.
        </p>
      )}
    </div>
  );
}
