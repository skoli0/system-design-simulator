/**
 * Connectivity context computed once per scoring run and shared by all rules.
 * Built from component nodes only — edges referencing unknown nodes (e.g. text
 * annotations) and self-loops are excluded, and parallel edges are deduped.
 */
export interface ScoringGraph {
  /** Directed adjacency between component nodes. */
  adjacency: Map<string, string[]>;
  /**
   * Node ids reachable from entry nodes (in-degree 0 with at least one
   * outgoing edge). Empty when the canvas has no edges, unless the canvas
   * holds exactly one node.
   */
  reachable: Set<string>;
}

export interface CategoryScore {
  category: string;
  score: number; // 0-20
  maxScore: number; // 20
  feedback: string[];
  passed: string[];
}

export interface ScoreResult {
  total: number; // 0-100
  categories: CategoryScore[];
  verdict: string;
  verdictColor: string;
  summary: string;
}
