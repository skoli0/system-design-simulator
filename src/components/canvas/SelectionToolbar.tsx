"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvasStore";

export function SelectionToolbar() {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const nodeCount = selectedNodeIds.length;
  const edgeCount = selectedEdgeIds.length;
  const total = nodeCount + edgeCount;

  if (total === 0) return null;

  const label =
    nodeCount > 0 && edgeCount > 0
      ? `${nodeCount} component${nodeCount === 1 ? "" : "s"}, ${edgeCount} connection${edgeCount === 1 ? "" : "s"}`
      : nodeCount > 0
        ? `${nodeCount} component${nodeCount === 1 ? "" : "s"} selected`
        : `${edgeCount} connection${edgeCount === 1 ? "" : "s"} selected`;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-md backdrop-blur">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={deleteSelected}
        className="h-6 gap-1 border-border px-2 text-[10px] text-rose-400 hover:bg-muted hover:text-rose-300"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </Button>
      <button
        type="button"
        onClick={clearSelection}
        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Clear selection"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
