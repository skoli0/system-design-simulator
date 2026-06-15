"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, useConnection, useUpdateNodeInternals, type NodeProps, type Node } from "@xyflow/react";
import { motion } from "framer-motion";
import type { ComponentNodeData } from "@/store/canvasStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSimulationStore } from "@/store/simulationStore";
import { Server } from "lucide-react";
import { ICON_MAP } from "@/lib/icons";
import { sanitizeShards, supportsDbScaling } from "@/engine/dbScaling";
import { useIsCoarsePointer } from "@/hooks/useBreakpoint";

type ComponentNode = Node<ComponentNodeData, "component">;

// Each category gets a crisp, tinted icon "chip" so node types are
// distinguishable at a glance — the identity lives in the chip, not a heavy
// border, keeping the canvas calm (Linear/Railway-style).
const CATEGORY_COLORS: Record<string, { chip: string; icon: string; ring: string }> = {
  networking: { chip: "bg-blue-500/10", icon: "text-blue-400", ring: "ring-blue-500/25" },
  compute: { chip: "bg-violet-500/10", icon: "text-violet-400", ring: "ring-violet-500/25" },
  storage: { chip: "bg-amber-500/10", icon: "text-amber-400", ring: "ring-amber-500/25" },
  messaging: { chip: "bg-emerald-500/10", icon: "text-emerald-400", ring: "ring-emerald-500/25" },
  infrastructure: { chip: "bg-cyan-500/10", icon: "text-cyan-400", ring: "ring-cyan-500/25" },
};

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  idle: "bg-muted-foreground/40",
};

function ComponentNodeInner({ id, data, selected }: NodeProps<ComponentNode>) {
  const nodeData = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const Icon = ICON_MAP[nodeData.icon] ?? Server;
  const colors = CATEGORY_COLORS[nodeData.category] ?? CATEGORY_COLORS.compute;
  const status = (nodeData.status as string) ?? "idle";
  const statusDot = STATUS_DOT[status] ?? STATUS_DOT.idle;
  const isBottleneck = nodeData.isBottleneck ?? false;
  const replicas = nodeData.replicas ?? 1;
  const shards = sanitizeShards(nodeData.shards);
  const showDbScaling = supportsDbScaling(nodeData.componentId);
  const utilization = nodeData.utilization ?? 0;
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const isSimulating = useSimulationStore((s) => s.isRunning);
  const showTraffic = trafficActive || isSimulating;

  const isCustom = nodeData.componentId === "custom";
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const isCoarse = useIsCoarsePointer();
  const { connectionInProgress, fromNodeId } = useConnection((s) => ({
    connectionInProgress: s.inProgress,
    fromNodeId: s.fromNode?.id,
  }));
  const showHandles = selected || (connectionInProgress && fromNodeId !== id);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Keep handle positions in sync when simulation metrics change node height.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, utilization, status, isBottleneck, replicas, shards, updateNodeInternals]);

  const commitLabel = useCallback(() => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== nodeData.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setEditLabel(nodeData.label);
    }
    setEditing(false);
  }, [editLabel, nodeData.label, id, updateNodeData]);

  const handleDoubleClick = useCallback(() => {
    if (!isCustom) return;
    setEditLabel(nodeData.label);
    setEditing(true);
  }, [isCustom, nodeData.label]);

  // Touch devices have no double-click: a tap on the label of an
  // already-selected custom node enters rename mode.
  const handleLabelClick = useCallback(() => {
    if (!isCoarse || !selected || !isCustom || editing) return;
    setEditLabel(nodeData.label);
    setEditing(true);
  }, [isCoarse, selected, isCustom, editing, nodeData.label]);

  return (
    <div
      className={`
        group relative flex w-[148px] min-h-[104px] flex-col items-center justify-center gap-1 rounded-xl border bg-card/95 px-4 py-3
        shadow-[var(--shadow-e2)] backdrop-blur-sm transition-all duration-150
        ${isBottleneck && showTraffic
          ? "border-rose-500/60 ring-2 ring-rose-500/20"
          : selected
            ? "border-cyan-500/80 ring-2 ring-cyan-500/30"
            : showTraffic && status === "healthy"
              ? "border-cyan-500/40 shadow-[0_0_20px_-6px_rgba(6,182,212,0.45)]"
              : "border-border/70 hover:border-border"}
      `}
    >
      {/* Status indicator dot — only during / after an active simulation run */}
      {showTraffic && (
        <div
          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-card ${statusDot}`}
          style={{ animation: status !== "idle" ? "status-pulse 2s infinite" : "none" }}
        />
      )}

      {/* Icon + Label row */}
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${colors.chip} ${colors.icon} ${colors.ring}`}>
          <Icon className="h-4 w-4" />
        </div>
        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLabel();
              if (e.key === "Escape") {
                setEditLabel(nodeData.label);
                setEditing(false);
              }
            }}
            className="nodrag max-w-[80px] bg-transparent text-[11px] font-medium text-foreground outline-none border-b border-cyan-500"
          />
        ) : (
          <span
            className={`max-w-[96px] whitespace-normal break-words text-center text-[11px] font-medium leading-tight text-foreground ${isCustom ? "cursor-text" : ""}`}
            onDoubleClick={handleDoubleClick}
            onClick={handleLabelClick}
          >
            {nodeData.label}
          </span>
        )}
      </div>

      {/* Stats */}
      <span className="font-mono text-[9px] text-muted-foreground">
        {nodeData.maxQPS === Infinity ? '\u221e' : ((nodeData.maxQPS ?? 0)/1000).toFixed(0) + 'k'} qps
      </span>

      {/* Capacity badges */}
      {replicas > 1 && (
        <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[8px] font-bold text-white">
          ×{replicas}
        </span>
      )}
      {showDbScaling && shards > 1 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[8px] font-bold text-white">
          S{shards}
        </span>
      )}

      {/* Utilization bar — fixed height slot so edges stay aligned during simulation */}
      <div className="mt-0.5 flex h-[14px] w-full items-center gap-1">
        {showTraffic && utilization > 0 ? (
          <>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${
                  utilization > 0.8 ? "bg-rose-500" : utilization > 0.5 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className={`font-mono text-[8px] ${
              utilization > 0.8 ? "text-rose-400" : utilization > 0.5 ? "text-amber-400" : "text-emerald-400"
            }`}>{(utilization * 100).toFixed(0)}%</span>
          </>
        ) : null}
      </div>

      {/* Handles — visible when selected (or on targets while dragging a connection) */}
      {(() => {
        const handleClass = [
          isCoarse ? "!h-5 !w-5" : "!h-2 !w-2",
          "!rounded-full !border !border-border !bg-muted-foreground",
          "!transition-opacity !duration-150",
          showHandles ? "!opacity-100" : "!opacity-0 !pointer-events-none",
        ].join(" ");
        return (
          <>
            <Handle type="target" position={Position.Left} id="left" className={handleClass} />
            <Handle type="source" position={Position.Right} id="right" className={handleClass} />
            <Handle type="target" position={Position.Top} id="top" className={handleClass} />
            <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" className={handleClass} />
            <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
            <Handle type="target" position={Position.Right} id="right-target" className={handleClass} />
          </>
        );
      })()}
    </div>
  );
}

function areComponentNodePropsEqual(
  prev: NodeProps<ComponentNode>,
  next: NodeProps<ComponentNode>
): boolean {
  if (prev.selected !== next.selected) return false;
  const p = prev.data;
  const n = next.data;
  return (
    p.componentId === n.componentId &&
    p.label === n.label &&
    p.status === n.status &&
    p.replicas === n.replicas &&
    p.shards === n.shards &&
    p.utilization === n.utilization &&
    p.maxQPS === n.maxQPS &&
    p.latencyMs === n.latencyMs &&
    p.category === n.category &&
    p.icon === n.icon &&
    p.isBottleneck === n.isBottleneck
  );
}

export const ComponentNode = memo(ComponentNodeInner, areComponentNodePropsEqual);
