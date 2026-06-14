"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useSimulationStore } from "@/store/simulationStore";
import type { CustomEdgeData } from "@/store/canvasStore";

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
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const showFlow = isRunning || trafficActive;

  const edgeData = (data ?? {}) as CustomEdgeData;
  const isAsync = edgeData.async === true;
  const protocol = edgeData.protocol;
  const label = edgeData.label;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const badge = protocol ? protocolBadge[protocol] : null;
  const showLabel = label || badge;
  const strokeColor = showFlow ? "rgb(6, 182, 212)" : "rgb(82, 82, 91)";

  return (
    <g>
      {/* Glow underlay while traffic is flowing */}
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
        markerEnd={markerEnd}
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

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan flex items-center gap-1"
          >
            {label && (
              <span className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground leading-none">
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
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeInner);
