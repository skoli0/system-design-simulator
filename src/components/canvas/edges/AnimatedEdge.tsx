"use client";

import { memo, useCallback } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";
import { useSimulationStore } from "@/store/simulationStore";
import { useConceptSimulationStore } from "@/store/conceptSimulationStore";
import {
  useCanvasStore,
  isEditableDesignTab,
  type CustomEdgeData,
  type EdgePathStyle,
} from "@/store/canvasStore";
import { buildEdgePath, resolveEdgePathStyle } from "@/lib/edgePath";
import { isRequestResponseEdge } from "@/lib/edgeDefaults";
import { EdgePathStylePicker } from "../EdgePathStylePicker";

const protocolBadge: Record<string, { text: string; color: string } | null> = {
  http: null,
  grpc: { text: "gRPC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  websocket: { text: "WS", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  pubsub: { text: "pub/sub", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  tcp: { text: "TCP", color: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30" },
  custom: null,
};

function AnimatedEdgeInner({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  data,
}: EdgeProps) {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const conceptSimActive = useConceptSimulationStore((s) => s.simulationId !== null);
  const conceptActiveEdges = useConceptSimulationStore((s) => s.activeEdgeIds);
  const defaultEdgePathStyle = useCanvasStore((s) => s.defaultEdgePathStyle);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const setDefaultEdgePathStyle = useCanvasStore((s) => s.setDefaultEdgePathStyle);
  const activeTab = useCanvasStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const isEditable = isEditableDesignTab(activeTab);
  const showFlowBase = isRunning || trafficActive;
  const conceptEdgeActive =
    !conceptSimActive ||
    conceptActiveEdges === undefined ||
    conceptActiveEdges.includes(id);
  const showFlow = showFlowBase && conceptEdgeActive;
  const isDimmed = conceptSimActive && showFlowBase && !conceptEdgeActive;

  const edgeData = (data ?? {}) as CustomEdgeData;
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  const sourceComp = sourceNode?.type === "component" ? String(sourceNode.data.componentId) : "";
  const targetComp = targetNode?.type === "component" ? String(targetNode.data.componentId) : "";
  const bidirectional =
    edgeData.bidirectional === true ||
    (sourceComp && targetComp && isRequestResponseEdge(sourceComp, targetComp));

  const pathFallback: EdgePathStyle =
    !isEditable ? "elbow" : defaultEdgePathStyle;
  const pathStyle = resolveEdgePathStyle(edgeData, pathFallback);
  const isAsync = edgeData.async === true;
  const protocol = edgeData.protocol;
  const label =
    edgeData.label === "req / resp" ? "" : (edgeData.label ?? "");

  const [edgePath, labelX, labelY] = buildEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    pathStyle,
  );

  const badge = protocol ? protocolBadge[protocol] : null;
  const showLabel = label || badge;
  const showPathPicker =
    isEditable &&
    selected === true &&
    selectedEdgeIds.length === 1 &&
    selectedEdgeIds[0] === id;

  const handlePathStyleChange = useCallback(
    (next: EdgePathStyle) => {
      updateEdgeData(id, { pathStyle: next });
      setDefaultEdgePathStyle(next);
    },
    [id, updateEdgeData, setDefaultEdgePathStyle],
  );

  const strokeColor = showFlow
    ? "rgb(6, 182, 212)"
    : isDimmed
      ? "rgb(63, 63, 70)"
      : "rgb(82, 82, 91)";

  return (
    <g>
      {showFlow && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: "rgb(6, 182, 212)",
            strokeWidth: 4,
            opacity: 0.15,
            ...(isAsync ? { strokeDasharray: "6 4" } : {}),
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={undefined}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: showFlow ? 2 : 1.5,
          transition: "stroke 0.3s ease, stroke-width 0.3s ease",
          ...(isAsync ? { strokeDasharray: "6 4" } : {}),
        }}
      />

      {showFlow && (
        <>
          {bidirectional ? (
            <circle r="3" fill="rgb(6, 182, 212)" opacity="0.95">
              <animate
                attributeName="fill"
                values="rgb(6,182,212);rgb(6,182,212);rgb(52,211,153);rgb(52,211,153);rgb(6,182,212)"
                keyTimes="0;0.49;0.5;0.99;1"
                dur="3.2s"
                repeatCount="indefinite"
              />
              <animateMotion
                dur="3.2s"
                repeatCount="indefinite"
                path={edgePath}
                keyPoints="0;1;0"
                keyTimes="0;0.5;1"
                calcMode="linear"
              />
            </circle>
          ) : (
            <>
              <circle r="3" fill="rgb(6, 182, 212)" opacity="0.95">
                <animateMotion dur="1.8s" repeatCount="indefinite" path={edgePath} />
              </circle>
              <circle r="2.5" fill="rgb(34, 211, 238)" opacity="0.7">
                <animateMotion
                  dur="1.8s"
                  repeatCount="indefinite"
                  path={edgePath}
                  begin="0.45s"
                />
              </circle>
              <circle r="2" fill="rgb(6, 182, 212)" opacity="0.45">
                <animateMotion
                  dur="1.8s"
                  repeatCount="indefinite"
                  path={edgePath}
                  begin="0.9s"
                />
              </circle>
            </>
          )}
        </>
      )}

      {(showLabel || showPathPicker) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              zIndex: showPathPicker ? 1000 : undefined,
            }}
            className="nodrag nopan flex flex-col items-center gap-1.5"
          >
            {showPathPicker && (
              <EdgePathStylePicker
                value={pathStyle}
                onChange={handlePathStyleChange}
                compact
              />
            )}
            {showLabel && (
              <div className="flex items-center gap-1">
                {label && (
                  <span className="rounded bg-card px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                    {label}
                  </span>
                )}
                {badge && (
                  <span
                    className={`rounded border px-1 py-0.5 text-[9px] font-medium leading-none ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeInner);
