import type { Node, Edge } from "@xyflow/react";
import { scoreDesign } from "@/scoring/scorer";
import type { ScoreResult } from "@/types/scoring";
import { getProblemById } from "@/data/problems";
import { loadReferenceIntoTab } from "@/lib/loadReference";
import { useAppStore } from "@/store/appStore";
import {
  useCanvasStore,
  type ComponentNodeData,
  isEditableDesignTab,
  isHomeView,
} from "@/store/canvasStore";

export type ScorableSource = "active" | "reference";

export interface ScorableDesign {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
  source: ScorableSource;
  /** Canvas tab id to activate when scoring a reference design. */
  tabId?: string;
}

function componentNodesFrom(nodes: Node[]): Node<ComponentNodeData>[] {
  return nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
}

/**
 * Resolve which design to score. Prefers the active editable tab when it has
 * components; otherwise falls back to the reference architecture.
 */
export function getScorableDesign(): ScorableDesign | null {
  const { nodes, edges, tabs, activeTabId } = useCanvasStore.getState();

  const activeTab = activeTabId
    ? tabs.find((t) => t.id === activeTabId)
    : undefined;

  if (isEditableDesignTab(activeTab)) {
    const designNodes =
      activeTabId === activeTab!.id
        ? componentNodesFrom(nodes)
        : componentNodesFrom(activeTab!.nodes);
    const designEdges =
      activeTabId === activeTab!.id ? edges : activeTab!.edges;

    if (designNodes.length > 0) {
      return {
        nodes: designNodes,
        edges: designEdges,
        source: "active",
        tabId: activeTab!.id,
      };
    }
  }

  if (!isHomeView(activeTabId)) {
    for (const tab of tabs.filter((t) => isEditableDesignTab(t))) {
      const designNodes = componentNodesFrom(tab.nodes);
      if (designNodes.length > 0) {
        return {
          nodes: designNodes,
          edges: tab.edges,
          source: "active",
          tabId: tab.id,
        };
      }
    }
  }

  const problemId = useAppStore.getState().selectedProblemId;
  const refTabId = `ref-${problemId}`;

  const refTab =
    tabs.find((t) => t.id === refTabId) ??
    tabs.find((t) => t.readOnly && componentNodesFrom(t.nodes).length > 0);

  if (refTab) {
    const refNodes = componentNodesFrom(refTab.nodes);
    if (refNodes.length > 0) {
      return {
        nodes: refNodes,
        edges: refTab.edges,
        source: "reference",
        tabId: refTab.id,
      };
    }
  }

  return null;
}

/** Ensure a reference tab exists for the current example problem. */
export function ensureReferenceTabLoaded(): void {
  const problemId = useAppStore.getState().selectedProblemId;
  if (problemId.startsWith("custom-")) return;

  const problem = getProblemById(problemId);
  if (!problem?.referenceSolution.nodes.length) return;

  const refTabId = `ref-${problemId}`;
  const { tabs } = useCanvasStore.getState();
  const existing = tabs.find((t) => t.id === refTabId);
  if (existing && componentNodesFrom(existing.nodes).length > 0) return;

  loadReferenceIntoTab(problem, { silent: true, activate: false });
}

/**
 * Score the best available design for the current problem/canvas state.
 * Returns null when there is nothing to score.
 */
export function runScoreForDesign(): ScoreResult | null {
  ensureReferenceTabLoaded();

  const design = getScorableDesign();
  if (!design) return null;

  return scoreDesign(design.nodes, design.edges);
}
