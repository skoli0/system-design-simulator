"use client";

import { useMemo } from "react";
import { useStore, useViewport } from "@xyflow/react";
import type { AlignmentGuide } from "@/lib/nodeAlignment";

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

/** Renders Figma-style alignment guides in flow coordinates. */
export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  const viewport = useViewport();
  const translateExtent = useStore((s) => s.translateExtent);

  const lines = useMemo(() => {
    if (guides.length === 0) return null;

    const pad = 4000;
    const extent = translateExtent ?? [
      [-Infinity, -Infinity],
      [Infinity, Infinity],
    ];
    const [[minX, minY], [maxX, maxY]] = extent;
    const x0 = Number.isFinite(minX) ? minX - pad : -pad;
    const y0 = Number.isFinite(minY) ? minY - pad : -pad;
    const x1 = Number.isFinite(maxX) ? maxX + pad : pad;
    const y1 = Number.isFinite(maxY) ? maxY + pad : pad;

    return guides.map((g, i) =>
      g.type === "vertical" ? (
        <line
          key={`v-${g.value}-${i}`}
          x1={g.value}
          y1={y0}
          x2={g.value}
          y2={y1}
          stroke="rgb(6, 182, 212)"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
        />
      ) : (
        <line
          key={`h-${g.value}-${i}`}
          x1={x0}
          y1={g.value}
          x2={x1}
          y2={g.value}
          stroke="rgb(6, 182, 212)"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
        />
      ),
    );
  }, [guides, translateExtent, viewport.zoom]);

  if (!lines) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
      style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}
    >
      {lines}
    </svg>
  );
}
