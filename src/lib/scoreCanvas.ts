import type { Node, Edge } from "@xyflow/react";
import { scoreDesign } from "@/scoring/scorer";
import type { ScoreResult } from "@/types/scoring";
import { getProblemById } from "@/data/problems";
import { loadReferenceIntoTab } from "@/lib/loadReference";
import { MY_DESIGN_TAB_ID } from "@/lib/addComponentToCanvas";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";

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
 * Resolve which design to score. Prefers My Design when it has components;
 * otherwise falls back to the reference architecture for the selected problem.
 */
export function getScorableDesign(): ScorableDesign | null {
  const { nodes, edges, tabs, activeTabId } = useCanvasStore.getState();

  const myDesignTab = tabs.find((t) => t.id === MY_DESIGN_TAB_ID);
  const myDesignNodes =
    activeTabId === MY_DESIGN_TAB_ID
      ? componentNodesFrom(nodes)
      : componentNodesFrom(myDesignTab?.nodes ?? []);
  const myDesignEdges =
    activeTabId === MY_DESIGN_TAB_ID ? edges : (myDesignTab?.edges ?? []);

  if (myDesignNodes.length > 0) {
    return {
      nodes: myDesignNodes,
      edges: myDesignEdges,
      source: "active",
      tabId: MY_DESIGN_TAB_ID,
    };
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

  // Score in the panel without switching the canvas away from the user's tab.
  return scoreDesign(design.nodes, design.edges);
}
