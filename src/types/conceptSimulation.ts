import type { Node, Edge } from "@xyflow/react";

export interface ConceptSimulationStep {
  id: string;
  title: string;
  description: string;
  /** Edge ids to animate; undefined = all edges, [] = none */
  activeEdgeIds?: string[];
  /** Nodes to emphasize with a highlight ring */
  activeNodeIds?: string[];
}

export interface ConceptSimulationDefinition {
  id: string;
  title: string;
  description: string;
  topicId: string;
  conceptId: string;
  build: () => { nodes: Node[]; edges: Edge[] };
  steps: ConceptSimulationStep[];
  /** Auto-advance interval in ms (0 = manual only) */
  autoPlayMs?: number;
}
