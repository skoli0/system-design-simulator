import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useAppStore } from "./appStore";
import { useCanvasStore } from "./canvasStore";
import { useCustomProblemsStore } from "./customProblemsStore";
import { indexedDbStorage } from "@/lib/indexedDbStorage";
import { PROBLEMS } from "@/data/problems";
import {
  captureActiveDesignSnapshot,
  restoreSnapshotToCanvas,
  type DesignSnapshot,
} from "@/lib/designSnapshot";
import type { Stroke } from "./penStore";

export interface SerializedComponentData {
  componentId: string;
  label: string;
  icon: string;
  category: string;
  replicas: number;
  maxQPS: number;
  latencyMs: number;
  scalable: boolean;
}

export interface SerializedTextData {
  text: string;
  fontSize?: "sm" | "base" | "lg";
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: SerializedComponentData | SerializedTextData;
}

export interface SerializedEdge {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: { label?: string; protocol?: string; async?: boolean };
}

export interface DesignVersion extends DesignSnapshot {
  version: number;
  savedAt: string;
  label?: string;
}

export interface SavedDesign {
  id: string;
  name: string;
  currentVersion: number;
  versions: DesignVersion[];
  createdAt: string;
  updatedAt: string;
}

interface LegacySavedDesign {
  id: string;
  name: string;
  problemId: string | null;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  strokes: Stroke[];
  createdAt: string;
  updatedAt: string;
}

export type ImportResult = { ok: true } | { ok: false; error: string };

export interface SaveDesignOptions {
  designId?: string;
  label?: string;
}

interface SavedDesignsState {
  designs: SavedDesign[];
  activeDesignId: string | null;
  saveDesign: (name: string, options?: SaveDesignOptions) => string;
  loadDesign: (id: string, version?: number) => void;
  deleteDesign: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  exportDesign: (id: string) => string;
  importDesign: (json: string) => ImportResult;
  setActiveDesignId: (id: string | null) => void;
  getDesignVersions: (id: string) => DesignVersion[];
}

export function getDesignVersion(
  design: SavedDesign,
  version?: number
): DesignVersion | undefined {
  const v = version ?? design.currentVersion;
  return (
    design.versions.find((entry) => entry.version === v) ??
    design.versions[design.versions.length - 1]
  );
}

export function designNodeCount(design: SavedDesign): number {
  return getDesignVersion(design)?.nodes.length ?? 0;
}

function createVersionFromSnapshot(
  snapshot: DesignSnapshot,
  version: number,
  label?: string
): DesignVersion {
  return {
    version,
    savedAt: new Date().toISOString(),
    label,
    ...snapshot,
  };
}

function migrateLegacyDesign(d: LegacySavedDesign): SavedDesign {
  const version = createVersionFromSnapshot(
    {
      problemId: d.problemId,
      nodes: d.nodes,
      edges: d.edges,
      strokes: d.strokes ?? [],
    },
    1
  );
  return {
    id: d.id,
    name: d.name,
    currentVersion: 1,
    versions: [version],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function serializeNodes(
  nodes: ReturnType<typeof useCanvasStore.getState>["nodes"]
): SerializedNode[] {
  return nodes.map((n) => {
    const base = {
      id: n.id,
      type: n.type ?? "component",
      position: { x: n.position.x, y: n.position.y },
    };

    if (n.type === "text") {
      return {
        ...base,
        data: {
          text: (n.data.text as string) ?? "",
          fontSize: (n.data.fontSize as "sm" | "base" | "lg") ?? undefined,
        } as SerializedTextData,
      };
    }

    return {
      ...base,
      data: {
        componentId: n.data.componentId,
        label: n.data.label,
        icon: n.data.icon,
        category: n.data.category,
        replicas: n.data.replicas,
        maxQPS: n.data.maxQPS,
        latencyMs: n.data.latencyMs,
        scalable: n.data.scalable,
      } as SerializedComponentData,
    };
  });
}

export function serializeEdges(
  edges: ReturnType<typeof useCanvasStore.getState>["edges"]
): SerializedEdge[] {
  return edges.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    data: {
      label: typeof e.data?.label === "string" ? e.data.label : "",
      protocol: typeof e.data?.protocol === "string" ? e.data.protocol : "http",
      async: e.data?.async === true,
    },
  }));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function parseStrokes(raw: unknown): Stroke[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter((s): s is Stroke => {
    if (!isRecord(s)) return false;
    if (typeof s.id !== "string") return false;
    if (typeof s.color !== "string") return false;
    if (typeof s.width !== "number" || !Number.isFinite(s.width)) return false;
    return (
      Array.isArray(s.points) &&
      s.points.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 2 &&
          typeof p[0] === "number" &&
          typeof p[1] === "number" &&
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1])
      )
    );
  });
}

function parseNodesArray(parsedNodes: unknown[]):
  | { ok: true; nodes: SerializedNode[] }
  | { ok: false; error: string } {
  const nodes: SerializedNode[] = [];
  const nodeIds = new Set<string>();
  for (let i = 0; i < parsedNodes.length; i++) {
    const raw = parsedNodes[i];
    if (!isRecord(raw)) {
      return { ok: false, error: `Node ${i} is not an object` };
    }
    if (typeof raw.id !== "string" || raw.id.length === 0) {
      return { ok: false, error: `Node ${i} has no string id` };
    }
    if (nodeIds.has(raw.id)) {
      return { ok: false, error: `Duplicate node id "${raw.id}"` };
    }
    const pos = raw.position;
    if (
      !isRecord(pos) ||
      typeof pos.x !== "number" ||
      typeof pos.y !== "number" ||
      !Number.isFinite(pos.x) ||
      !Number.isFinite(pos.y)
    ) {
      return { ok: false, error: `Node "${raw.id}" has an invalid position` };
    }
    if (!isRecord(raw.data)) {
      return { ok: false, error: `Node "${raw.id}" has no data object` };
    }

    const type = str(raw.type, "component");
    const d = raw.data;
    if (type === "text") {
      const fontSize = d.fontSize;
      nodes.push({
        id: raw.id,
        type,
        position: { x: pos.x, y: pos.y },
        data: {
          text: str(d.text, ""),
          fontSize:
            fontSize === "sm" || fontSize === "base" || fontSize === "lg"
              ? fontSize
              : undefined,
        },
      });
    } else {
      nodes.push({
        id: raw.id,
        type,
        position: { x: pos.x, y: pos.y },
        data: {
          componentId: str(d.componentId, "custom"),
          label: str(d.label, "Component"),
          icon: str(d.icon, "Box"),
          category: str(d.category, "compute"),
          replicas: num(d.replicas, 1),
          maxQPS: num(d.maxQPS, 1000),
          latencyMs: num(d.latencyMs, 10),
          scalable: d.scalable !== false,
        },
      });
    }
    nodeIds.add(raw.id);
  }
  return { ok: true, nodes };
}

function parseEdgesArray(
  parsedEdges: unknown[],
  nodeIds: Set<string>
): { ok: true; edges: SerializedEdge[] } | { ok: false; error: string } {
  const edges: SerializedEdge[] = [];
  for (let i = 0; i < parsedEdges.length; i++) {
    const raw = parsedEdges[i];
    if (!isRecord(raw)) {
      return { ok: false, error: `Edge ${i} is not an object` };
    }
    const source = raw.source;
    const target = raw.target;
    if (typeof source !== "string" || !nodeIds.has(source)) {
      return { ok: false, error: `Edge ${i} has an unknown source node` };
    }
    if (typeof target !== "string" || !nodeIds.has(target)) {
      return { ok: false, error: `Edge ${i} has an unknown target node` };
    }
    const data = isRecord(raw.data) ? raw.data : {};
    edges.push({
      id: str(raw.id, `e-${source}-${target}-${i}`),
      type: str(raw.type, "animated"),
      source,
      target,
      sourceHandle: typeof raw.sourceHandle === "string" ? raw.sourceHandle : null,
      targetHandle: typeof raw.targetHandle === "string" ? raw.targetHandle : null,
      data: {
        label: str(data.label, ""),
        protocol: str(data.protocol, "http"),
        async: data.async === true,
      },
    });
  }
  return { ok: true, edges };
}

function normalizeImportedDesign(parsed: unknown):
  | {
      ok: true;
      name: string;
      versions: DesignVersion[];
      currentVersion: number;
    }
  | { ok: false; error: string } {
  if (!isRecord(parsed)) {
    return { ok: false, error: "File is not a design object" };
  }

  const name = str(parsed.name, "Untitled design");

  if (Array.isArray(parsed.versions) && parsed.versions.length > 0) {
    const versions: DesignVersion[] = [];
    for (let i = 0; i < parsed.versions.length; i++) {
      const raw = parsed.versions[i];
      if (!isRecord(raw)) {
        return { ok: false, error: `Version ${i} is not an object` };
      }
      if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
        return { ok: false, error: `Version ${i} is missing nodes or edges` };
      }
      const nodesResult = parseNodesArray(raw.nodes as unknown[]);
      if (!nodesResult.ok) return nodesResult;
      const nodeIds = new Set(nodesResult.nodes.map((n) => n.id));
      const edgesResult = parseEdgesArray(raw.edges as unknown[], nodeIds);
      if (!edgesResult.ok) return edgesResult;

      versions.push({
        version: num(raw.version, i + 1),
        savedAt: str(raw.savedAt, new Date().toISOString()),
        label: typeof raw.label === "string" ? raw.label : undefined,
        problemId: typeof raw.problemId === "string" ? raw.problemId : null,
        nodes: nodesResult.nodes,
        edges: edgesResult.edges,
        strokes: parseStrokes(raw.strokes),
      });
    }

    const currentVersion =
      typeof parsed.currentVersion === "number"
        ? parsed.currentVersion
        : versions[versions.length - 1].version;

    return { ok: true, name, versions, currentVersion };
  }

  if (!Array.isArray(parsed.nodes)) {
    return { ok: false, error: 'Missing or invalid "nodes" array' };
  }
  if (!Array.isArray(parsed.edges)) {
    return { ok: false, error: 'Missing or invalid "edges" array' };
  }

  const nodesResult = parseNodesArray(parsed.nodes as unknown[]);
  if (!nodesResult.ok) return nodesResult;
  const nodeIds = new Set(nodesResult.nodes.map((n) => n.id));
  const edgesResult = parseEdgesArray(parsed.edges as unknown[], nodeIds);
  if (!edgesResult.ok) return edgesResult;

  const version = createVersionFromSnapshot(
    {
      problemId: typeof parsed.problemId === "string" ? parsed.problemId : null,
      nodes: nodesResult.nodes,
      edges: edgesResult.edges,
      strokes: parseStrokes(parsed.strokes),
    },
    1
  );

  return { ok: true, name, versions: [version], currentVersion: 1 };
}

export const useSavedDesignsStore = create<SavedDesignsState>()(
  persist(
    (set, get) => ({
      designs: [],
      activeDesignId: null,

      saveDesign: (name: string, options?: SaveDesignOptions) => {
        const snapshot = captureActiveDesignSnapshot();
        const now = new Date().toISOString();
        const existingId = options?.designId ?? get().activeDesignId;

        if (existingId) {
          const existing = get().designs.find((d) => d.id === existingId);
          if (existing) {
            const nextVersion =
              Math.max(...existing.versions.map((v) => v.version), 0) + 1;
            const version = createVersionFromSnapshot(
              snapshot,
              nextVersion,
              options?.label
            );

            set((s) => ({
              activeDesignId: existingId,
              designs: s.designs.map((d) =>
                d.id === existingId
                  ? {
                      ...d,
                      name: name.trim() || d.name,
                      currentVersion: nextVersion,
                      versions: [...d.versions, version],
                      updatedAt: now,
                    }
                  : d
              ),
            }));

            useAppStore
              .getState()
              .showToast(
                `"${existing.name}" saved as version ${nextVersion}`,
                "success"
              );
            return existingId;
          }
        }

        const id = `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const version = createVersionFromSnapshot(snapshot, 1, options?.label);
        const design: SavedDesign = {
          id,
          name,
          currentVersion: 1,
          versions: [version],
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          activeDesignId: id,
          designs: [design, ...s.designs],
        }));
        useAppStore.getState().showToast(`Design "${name}" saved`, "success");
        return id;
      },

      loadDesign: (id: string, version?: number) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design) return;

        const entry = getDesignVersion(design, version);
        if (!entry) return;

        restoreSnapshotToCanvas(entry);
        set({ activeDesignId: id });

        useAppStore
          .getState()
          .showToast(
            version
              ? `Loaded "${design.name}" (v${version})`
              : `Loaded "${design.name}"`,
            "success"
          );
      },

      deleteDesign: (id: string) => {
        set((s) => ({
          designs: s.designs.filter((d) => d.id !== id),
          activeDesignId: s.activeDesignId === id ? null : s.activeDesignId,
        }));
      },

      renameDesign: (id: string, name: string) => {
        set((s) => ({
          designs: s.designs.map((d) =>
            d.id === id
              ? { ...d, name, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      exportDesign: (id: string) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design) return "{}";
        return JSON.stringify({ schemaVersion: 2, ...design }, null, 2);
      },

      importDesign: (json: string): ImportResult => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          useAppStore.getState().showToast("Failed to parse JSON", "error");
          return { ok: false, error: "Failed to parse JSON" };
        }

        const result = normalizeImportedDesign(parsed);
        if (!result.ok) {
          useAppStore
            .getState()
            .showToast(`Invalid design file: ${result.error}`, "error");
          return result;
        }

        const now = new Date().toISOString();
        const design: SavedDesign = {
          id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: `${result.name} (imported)`,
          currentVersion: result.currentVersion,
          versions: result.versions,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ designs: [design, ...s.designs] }));
        useAppStore.getState().showToast("Design imported", "success");
        return { ok: true };
      },

      setActiveDesignId: (id: string | null) => set({ activeDesignId: id }),

      getDesignVersions: (id: string) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design) return [];
        return [...design.versions].sort((a, b) => b.version - a.version);
      },
    }),
    {
      name: "systemsim-saved-designs",
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => indexedDbStorage),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2 && Array.isArray(state.designs)) {
          state.designs = (state.designs as unknown[]).map((raw) => {
            const d = raw as Record<string, unknown>;
            if (Array.isArray(d.versions) && typeof d.currentVersion === "number") {
              return raw as SavedDesign;
            }
            return migrateLegacyDesign(raw as LegacySavedDesign);
          });
        }
        if (state.activeDesignId === undefined) {
          state.activeDesignId = null;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return state as any;
      },
    }
  )
);

export function getProblemTitle(problemId: string | null): string {
  if (!problemId) return "No problem";
  const builtin = PROBLEMS.find((p) => p.id === problemId)?.title;
  if (builtin) return builtin;
  const custom = useCustomProblemsStore
    .getState()
    .problems.find((p) => p.id === problemId)?.title;
  return custom ?? problemId;
}
