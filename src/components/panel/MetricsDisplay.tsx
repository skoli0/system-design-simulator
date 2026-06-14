"use client";

import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { Activity, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import {
  applySingleBottleneckFix,
  describeBottleneckScale,
  getBottleneckFixes,
  type BottleneckFix,
} from "@/engine/bottleneckFix";

const STATUS_COLOR: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  idle: "bg-muted-foreground/40",
};

interface MetricsDisplayProps {
  onSimulate?: () => void;
  className?: string;
}

export function MetricsDisplay({ onSimulate, className }: MetricsDisplayProps) {
  const result = useSimulationStore((s) => s.result);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);

  const componentNodes = useMemo(
    () => nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[],
    [nodes]
  );

  const bottleneckFixes = useMemo(
    () => (result ? getBottleneckFixes(componentNodes, result, edges) : []),
    [componentNodes, result, edges]
  );

  const scalableFixCount = bottleneckFixes.filter((f) => f.action === "scale").length;

  if (isRunning) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/80">Starting simulation...</p>
          <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
            Propagating load through your design — metrics will appear when the run
            finishes
          </p>
        </div>
      </div>
    );
  }

  if (!result || !(result.nodeMetrics instanceof Map)) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/80">No simulation data</p>
          <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
            Configure load above and click{" "}
            <span className="text-cyan-500">Run Simulation</span> to see metrics
          </p>
        </div>
      </div>
    );
  }

  const sortedMetrics = [...result.nodeMetrics.values()].sort(
    (a, b) => b.utilization - a.utilization
  );

  const handleFixOne = (fix: BottleneckFix) => {
    if (applySingleBottleneckFix(fix)) {
      useAppStore
        .getState()
        .showToast(`${fix.label}: ${describeBottleneckScale(fix)}`, "success");
      onSimulate?.();
    }
  };

  const handleFixAll = () => {
    let applied = 0;
    for (const fix of bottleneckFixes) {
      if (applySingleBottleneckFix(fix)) applied += 1;
    }
    if (applied > 0) {
      useAppStore
        .getState()
        .showToast(`Scaled ${applied} component${applied > 1 ? "s" : ""}`, "success");
      onSimulate?.();
    }
  };

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className ?? ""}`}>
      {/* Summary */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <div className="rounded-md bg-muted px-2.5 py-2">
          <p className="text-[11px] text-muted-foreground">Throughput</p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {new Intl.NumberFormat("en-US").format(result.throughput)}
          </p>
          <p className="text-[11px] text-muted-foreground">req/s delivered</p>
        </div>
        <div className="rounded-md bg-muted px-2.5 py-2">
          <p className="text-[11px] text-muted-foreground">Total Latency</p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {result.totalLatencyMs.toFixed(0)}
          </p>
          <p className="text-[11px] text-muted-foreground">ms (longest path)</p>
        </div>
      </div>

      {bottleneckFixes.length > 0 && (
        <div className="shrink-0 space-y-2 rounded-md border border-rose-500/25 bg-rose-500/5 px-2.5 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {bottleneckFixes.length} Bottleneck
                {bottleneckFixes.length > 1 ? "s" : ""} Detected
              </p>
              {scalableFixCount > 0 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {scalableFixCount} can be fixed by adding replicas or shards
                </p>
              )}
            </div>
            {scalableFixCount > 0 && onSimulate && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFixAll}
                className="h-7 shrink-0 gap-1 border-amber-500/40 px-2 text-[11px] text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              >
                <TrendingUp className="h-3 w-3" />
                Fix all
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            {bottleneckFixes.map((fix) => (
              <div
                key={fix.nodeId}
                className="rounded-md border border-border/60 bg-card/80 px-2 py-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNode(fix.nodeId)}
                    className="text-left text-xs font-medium text-foreground hover:text-cyan-500"
                  >
                    {fix.label}
                  </button>
                  {fix.action === "scale" && onSimulate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFixOne(fix)}
                      className="h-6 shrink-0 gap-1 px-1.5 text-[10px] text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                    >
                      {describeBottleneckScale(fix)}
                    </Button>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {new Intl.NumberFormat("en-US").format(Math.round(fix.incomingQPS))}{" "}
                  req/s incoming
                  {fix.perReplicaQPS !== Infinity &&
                    ` · ${new Intl.NumberFormat("en-US").format(fix.perReplicaQPS)}/${fix.scaleShards ? "shard" : "replica"}`}
                </p>
                {fix.hint && (
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {fix.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-node metrics — fills remaining panel height */}
      <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Per-Node Metrics
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-1.5">
          {sortedMetrics.map((m) => {
            const node = nodes.find((n) => n.id === m.nodeId);
            const label =
              ((node?.data as Record<string, unknown>)?.label as string) ??
              m.nodeId;
            return (
              <div key={m.nodeId} className="rounded-md bg-muted px-2.5 py-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[m.status]}`}
                  />
                  <span className="text-xs font-medium text-foreground/80">
                    {label}
                  </span>
                  {m.isBottleneck && (
                    <span
                      className="ml-auto text-[11px] font-medium text-rose-500 dark:text-rose-400"
                      style={{ animation: "status-pulse 2s infinite" }}
                    >
                      BOTTLENECK
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">QPS</p>
                    <p className="font-mono text-xs text-foreground/80">
                      {m.incomingQPS.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Util</p>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-8 overflow-hidden rounded-full bg-accent">
                        <div
                          className={`h-full rounded-full ${
                            m.utilization > 0.8
                              ? "bg-rose-500"
                              : m.utilization > 0.5
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(m.utilization * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`font-mono text-xs ${
                          m.utilization > 0.8
                            ? "text-rose-500 dark:text-rose-400"
                            : m.utilization > 0.5
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {(m.utilization * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Latency</p>
                    <p className="font-mono text-xs text-foreground/80">
                      {m.latencyMs.toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
