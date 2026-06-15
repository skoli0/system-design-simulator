import type { Node, Edge } from "@xyflow/react";
import { componentNode, textLabel, conceptEdge, finalizeGraph } from "./graphBuilder";

/** Standard column positions for left-to-right tutorial pipelines. */
export const COL = {
  x0: 40,
  x1: 220,
  x2: 400,
  x3: 580,
  x4: 760,
  x5: 940,
} as const;

export const ROW = {
  h: 130,
  titleY: -90,
  subtitleY: -58,
  sectionLabelY: -28,
} as const;

export function tutorialTitle(
  id: string,
  title: string,
  subtitle?: string,
  interviewBrief?: string,
): Node[] {
  const nodes: Node[] = [
    textLabel(`${id}-title`, title, COL.x0, ROW.titleY, "base"),
  ];
  if (subtitle) {
    nodes.push(textLabel(`${id}-sub`, subtitle, COL.x0, ROW.subtitleY, "sm"));
  }
  if (interviewBrief) {
    nodes.push(
      textLabel(
        `${id}-interview`,
        `Interview: ${interviewBrief}`,
        COL.x0,
        interviewBrief.length > 80 ? ROW.subtitleY + 36 : ROW.subtitleY + 28,
        "sm",
      ),
    );
  }
  return nodes;
}

export function sectionLabel(id: string, text: string, y: number): Node {
  return textLabel(id, text, COL.x0, y + ROW.sectionLabelY, "sm");
}

export function note(id: string, text: string, x: number, y: number): Node {
  return textLabel(id, text, x, y, "sm");
}

/** Wide annotation for interview talking points on the diagram. */
export function interviewNote(id: string, text: string, y = ROW.subtitleY + 32): Node {
  return {
    ...textLabel(id, text, COL.x0, y, "sm"),
    style: { width: 520 },
  };
}

export function enrichWithInterviewBrief(
  simulationId: string,
  nodes: Node[],
  brief: string,
): Node[] {
  if (nodes.some((n) => n.id.endsWith("-interview") || n.id.endsWith("-interview-inject"))) {
    return nodes;
  }
  return [...nodes, interviewNote(`${simulationId}-interview-inject`, `Key idea: ${brief}`)];
}

export function cn(
  id: string,
  componentId: string,
  col: number,
  row: number,
  label?: string,
): Node {
  const x = col === 0 ? COL.x0 : col === 1 ? COL.x1 : col === 2 ? COL.x2 : col === 3 ? COL.x3 : col === 4 ? COL.x4 : COL.x5;
  return componentNode(id, componentId, x, row * ROW.h, label);
}

export function ce(
  id: string,
  source: string,
  target: string,
  label?: string,
  overrides?: Parameters<typeof conceptEdge>[3],
): Edge {
  return conceptEdge(id, source, target, { label: label ?? "", ...overrides });
}

export function buildTutorial(nodes: Node[], edges: Edge[]) {
  return finalizeGraph(nodes, edges);
}

export function defineSteps(
  steps: Array<{
    id: string;
    title: string;
    description: string;
    edges?: string[];
    nodes?: string[];
  }>,
) {
  return steps.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    activeEdgeIds: s.edges ?? [],
    activeNodeIds: s.nodes ?? [],
  }));
}
