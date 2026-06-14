import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { pickEdgeHandles, normalizeConnection, assignHandlesToEdges } from "@/lib/edgeHandles";
import { edgeDataForComponents } from "@/lib/edgeDefaults";
import {
  snapNodeAlignment,
  resolveNodePosition,
  maybeAlignNodesForConnection,
  type AlignmentGuide,
} from "@/lib/nodeAlignment";
import {
  DEFAULT_CAPACITY_SETTINGS,
  DEFAULT_DESIGN_REQUIREMENTS,
  type CapacitySettings,
} from "@/lib/designDefaults";
import { loadFromProblemRequirements } from "@/lib/loadScale";
import {
  buildClipboardFromSelection,
  getCanvasClipboard,
  pasteClipboardPayload,
  setCanvasClipboard,
} from "@/lib/canvasClipboard";
import { nextDesignTabLabel } from "@/lib/designTabNames";
import { migrateLegacyTabs } from "@/lib/tabMigration";
import { indexedDbStorage } from "@/lib/indexedDbStorage";
import { useSimulationStore } from "./simulationStore";
import { useTradeoffStore, type TradeoffEntry } from "./tradeoffStore";
import type { ScoreResult } from "@/types/scoring";
import type { ProblemRequirements } from "@/types/problem";

export interface ComponentNodeData {
  componentId: string;
  label: string;
  icon: string;
  category: string;
  replicas: number;
  /** Horizontal partitions for databases (default 1). Multiplies effective QPS with replicas. */
  shards?: number;
  maxQPS: number;
  latencyMs: number;
  scalable: boolean;
  utilization?: number;
  status?: string;
  isBottleneck?: boolean;
  // ReactFlow v12 requires an index signature on custom node data types
  [key: string]: unknown;
}

export interface TextNodeData {
  text: string;
  fontSize?: "sm" | "base" | "lg";
  [key: string]: unknown;
}

export type EdgePathStyle = "straight" | "curved" | "elbow";

export interface CustomEdgeData {
  label?: string;
  protocol?: 'http' | 'grpc' | 'websocket' | 'pubsub' | 'tcp' | 'custom';
  async?: boolean;
  /** Request out + response back on the same hop (e.g. client ↔ DNS/CDN). */
  bidirectional?: boolean;
  pathStyle?: EdgePathStyle;
  [key: string]: unknown;
}

function defaultEdgeData(pathStyle: EdgePathStyle): CustomEdgeData {
  return { label: "", protocol: "http", async: false, pathStyle };
}

function edgeDataForNodes(
  sourceNode: Node | undefined,
  targetNode: Node | undefined,
  defaultPathStyle: EdgePathStyle,
  overrides?: Partial<CustomEdgeData>,
): CustomEdgeData {
  if (sourceNode?.type === "component" && targetNode?.type === "component") {
    return edgeDataForComponents(
      String(sourceNode.data.componentId),
      String(targetNode.data.componentId),
      defaultPathStyle,
      overrides,
    );
  }
  return { ...defaultEdgeData(defaultPathStyle), ...overrides };
}

export interface CanvasTab {
  id: string;
  label: string;
  nodes: Node[];
  edges: Edge[];
  readOnly?: boolean;
  /** Editable design tabs carry their own requirements (My Design uses the selected problem). */
  requirements?: ProblemRequirements;
  constraints?: string[];
  capacity?: CapacitySettings;
  tradeoffEntries?: TradeoffEntry[];
  scoreResult?: ScoreResult | null;
  createdAt?: string;
  updatedAt?: string;
}

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

/** Cheap deep snapshot of just the structural canvas state. */
function snapshot(state: { nodes: Node[]; edges: Edge[] }): HistoryEntry {
  return JSON.parse(
    JSON.stringify({ nodes: state.nodes, edges: state.edges })
  ) as HistoryEntry;
}

/**
 * Push the CURRENT (pre-mutation) state onto the undo stack and clear the
 * redo stack. Call this from inside `set` BEFORE applying a structural
 * mutation so that `undo()` restores the pre-change state.
 */
function pushedHistory(state: {
  nodes: Node[];
  edges: Edge[];
  history: HistoryEntry[];
}): HistoryEntry[] {
  return [...state.history, snapshot(state)].slice(-MAX_HISTORY);
}

/** Strip simulation runtime fields so persisted nodes don't glow on reload. */
function stripRuntimeFields(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.type === "text") return n;
    const data = { ...n.data };
    delete data.utilization;
    delete data.status;
    delete data.isBottleneck;
    return { ...n, data };
  });
}

function resetSimulation(): void {
  // Clear live simulation metrics only — keep score until the canvas changes.
  const sim = useSimulationStore.getState();
  sim.setRunning(false);
  sim.setTrafficActive(false);
  sim.setResult(null);
}

function clearScore(): void {
  const sim = useSimulationStore.getState();
  sim.setScoreResult(null);
  sim.setShowScore(false);
}

function syncSimulationFromRequirements(requirements: ProblemRequirements): void {
  const rps = loadFromProblemRequirements(requirements.readsPerSec);
  useSimulationStore.getState().setConfig({ requestsPerSec: rps });
}

/** Persist score + tradeoffs onto the active tab snapshot before switching away. */
function snapshotActiveTabExtras(
  tabs: CanvasTab[],
  activeTabId: string | null,
  nodes: Node[],
  edges: Edge[],
): CanvasTab[] {
  if (activeTabId == null) return tabs;
  const score = useSimulationStore.getState().scoreResult;
  const tradeoffs = useTradeoffStore.getState().entries;
  return tabs.map((t) =>
    t.id === activeTabId
      ? { ...t, nodes, edges, scoreResult: score, tradeoffEntries: tradeoffs }
      : t,
  );
}

function restoreTabExtras(tab: CanvasTab): void {
  useSimulationStore.getState().setScoreResult(tab.scoreResult ?? null);
  useTradeoffStore.getState().replaceEntries(tab.tradeoffEntries ?? []);
  if (tab.requirements && !tab.readOnly) {
    syncSimulationFromRequirements(tab.requirements);
  }
}

export function isEditableDesignTab(tab: CanvasTab | undefined): boolean {
  return tab != null && tab.readOnly !== true;
}

export function isHomeView(activeTabId: string | null | undefined): boolean {
  return activeTabId == null;
}

function clearedSelectionState() {
  return {
    selectedNodeId: null as string | null,
    selectedEdgeId: null as string | null,
    selectedNodeIds: [] as string[],
    selectedEdgeIds: [] as string[],
  };
}

function homeCanvasState() {
  return {
    activeTabId: null as string | null,
    nodes: [] as Node[],
    edges: [] as Edge[],
    ...clearedSelectionState(),
    history: [] as HistoryEntry[],
    future: [] as HistoryEntry[],
    isDragging: false,
    alignmentGuides: [] as AlignmentGuide[],
  };
}

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Tab system
  tabs: CanvasTab[];
  activeTabId: string | null;
  addTab: (tab: CanvasTab, options?: { activate?: boolean }) => void;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, label: string) => void;
  createNewDesignTab: (label?: string) => void;
  ensureActiveDesignTab: () => string;
  updateTabRequirements: (updates: Partial<ProblemRequirements>) => void;
  updateTabCapacity: (updates: Partial<CapacitySettings>) => void;
  getActiveTab: () => CanvasTab | undefined;

  // Undo/redo (not persisted)
  history: HistoryEntry[];
  future: HistoryEntry[];
  /** Internal: true while a node drag is in progress (dedupes history pushes). */
  isDragging: boolean;
  alignmentGuides: AlignmentGuide[];
  /** Default line style for newly created connections. */
  defaultEdgePathStyle: EdgePathStyle;
  setDefaultEdgePathStyle: (style: EdgePathStyle) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  addEdgeDirect: (
    source: string,
    target: string,
    data?: CustomEdgeData
  ) => void;
  /** Replace edge A→B with A→inserted→B in one undo step. */
  spliceNodeIntoEdge: (insertedNodeId: string, edgeId: string) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  clearSelection: () => void;
  selectAllNodes: () => void;
  deleteSelected: () => void;
  copySelection: () => boolean;
  pasteSelection: () => boolean;
  pasteSelectionToNewTab: () => boolean;
  updateNodeData: (nodeId: string, data: Partial<ComponentNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<CustomEdgeData>) => void;
  updateAllNodeData: (
    updates: Map<string, Partial<ComponentNodeData>>
  ) => void;
  clearCanvas: () => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  /** Replace My Design canvas content (used when seeding reference or relayouting). */
  loadMyDesignContent: (nodes: Node[], edges: Edge[]) => void;
  /** Replace the active editable tab canvas content. */
  loadActiveTabContent: (nodes: Node[], edges: Edge[]) => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],

      // No default tab — home welcome screen until the user opens Design 1+
      tabs: [],
      activeTabId: null,

      history: [],
      future: [],
      isDragging: false,
      alignmentGuides: [],
      defaultEdgePathStyle: "straight" as EdgePathStyle,

      setDefaultEdgePathStyle: (style) => set({ defaultEdgePathStyle: style }),

      addTab: (tab, options) => {
        const activate = options?.activate !== false;
        set((state) => {
          let updatedTabs = snapshotActiveTabExtras(
            state.tabs,
            state.activeTabId,
            state.nodes,
            state.edges,
          );
          const existing = updatedTabs.find((t) => t.id === tab.id);
          updatedTabs = existing
            ? updatedTabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t))
            : [...updatedTabs, tab];

          if (!activate) {
            return { tabs: updatedTabs };
          }

          const target = updatedTabs.find((t) => t.id === tab.id)!;
          restoreTabExtras(target);
          resetSimulation();

          return {
            tabs: updatedTabs,
            activeTabId: tab.id,
            nodes: tab.nodes,
            edges: tab.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            history: [],
            future: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });
      },

      switchTab: (tabId) => {
        const before = get().activeTabId;
        set((state) => {
          const target = state.tabs.find((t) => t.id === tabId);
          if (!target || tabId === state.activeTabId) return state;

          const updatedTabs = snapshotActiveTabExtras(
            state.tabs,
            state.activeTabId,
            state.nodes,
            state.edges,
          );
          const refreshedTarget = updatedTabs.find((t) => t.id === tabId)!;
          restoreTabExtras(refreshedTarget);
          resetSimulation();

          return {
            tabs: updatedTabs,
            activeTabId: tabId,
            nodes: refreshedTarget.nodes,
            edges: refreshedTarget.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            history: [],
            future: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });
        if (get().activeTabId !== before) resetSimulation();
      },

      closeTab: (tabId) => {
        const before = get().activeTabId;
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          let updatedTabs = snapshotActiveTabExtras(
            state.tabs,
            state.activeTabId,
            state.nodes,
            state.edges,
          );
          updatedTabs = updatedTabs.filter((t) => t.id !== tabId);

          if (state.activeTabId !== tabId) {
            return { tabs: updatedTabs };
          }

          if (updatedTabs.length === 0) {
            resetSimulation();
            return { tabs: [], ...homeCanvasState() };
          }

          const editableRemaining = updatedTabs.filter((t) => !t.readOnly);
          if (editableRemaining.length === 0) {
            resetSimulation();
            return { tabs: updatedTabs, ...homeCanvasState() };
          }

          const fallback = editableRemaining[0];
          restoreTabExtras(fallback);
          resetSimulation();
          return {
            tabs: updatedTabs,
            activeTabId: fallback.id,
            nodes: fallback.nodes,
            edges: fallback.edges,
            ...clearedSelectionState(),
            history: [],
            future: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });
        if (get().activeTabId !== before) resetSimulation();
      },

      renameTab: (tabId, label) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, label } : t)),
        }));
      },

      createNewDesignTab: (label) => {
        const state = get();
        const tabLabel = label?.trim() || nextDesignTabLabel(state.tabs);
        const id = `design-${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date().toISOString();
        const tab: CanvasTab = {
          id,
          label: tabLabel,
          nodes: [],
          edges: [],
          requirements: { ...DEFAULT_DESIGN_REQUIREMENTS },
          constraints: [],
          capacity: { ...DEFAULT_CAPACITY_SETTINGS },
          tradeoffEntries: [],
          scoreResult: null,
          createdAt: now,
          updatedAt: now,
        };

        // Save current tab, then switch to a fresh empty canvas
        set((s) => {
          const updatedTabs = s.activeTabId
            ? snapshotActiveTabExtras(
                s.tabs,
                s.activeTabId,
                s.nodes,
                s.edges,
              )
            : s.tabs;
          return {
            tabs: [...updatedTabs, tab],
            activeTabId: tab.id,
            nodes: [],
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            history: [],
            future: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });

        resetSimulation();
        clearScore();
        syncSimulationFromRequirements(tab.requirements!);
        useTradeoffStore.getState().replaceEntries([]);
      },

      ensureActiveDesignTab: () => {
        const state = get();
        if (state.activeTabId != null) {
          const tab = state.tabs.find((t) => t.id === state.activeTabId);
          if (tab && isEditableDesignTab(tab)) return state.activeTabId;
        }
        get().createNewDesignTab();
        return get().activeTabId as string;
      },

      updateTabRequirements: (updates) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!tab || tab.readOnly || !tab.requirements) return state;
          const requirements = { ...tab.requirements, ...updates };
          syncSimulationFromRequirements(requirements);
          return {
            tabs: state.tabs.map((t) =>
              t.id === state.activeTabId ? { ...t, requirements } : t,
            ),
          };
        });
      },

      updateTabCapacity: (updates) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!tab || tab.readOnly) return state;
          const capacity = { ...(tab.capacity ?? DEFAULT_CAPACITY_SETTINGS), ...updates };
          return {
            tabs: state.tabs.map((t) =>
              t.id === state.activeTabId ? { ...t, capacity } : t,
            ),
          };
        });
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        if (activeTabId == null) return undefined;
        return tabs.find((t) => t.id === activeTabId);
      },

      undo: () => {
        set((state) => {
          const prev = state.history[state.history.length - 1];
          if (!prev) return state;
          return {
            history: state.history.slice(0, -1),
            future: [...state.future, snapshot(state)].slice(-MAX_HISTORY),
            nodes: prev.nodes,
            edges: prev.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });
      },

      redo: () => {
        set((state) => {
          const next = state.future[state.future.length - 1];
          if (!next) return state;
          return {
            future: state.future.slice(0, -1),
            history: [...state.history, snapshot(state)].slice(-MAX_HISTORY),
            nodes: next.nodes,
            edges: next.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            isDragging: false,
            alignmentGuides: [],
          };
        });
      },

      canUndo: () => get().history.length > 0,
      canRedo: () => get().future.length > 0,

      clearHistory: () => set({ history: [], future: [], isDragging: false, alignmentGuides: [] }),

      onNodesChange: (changes) => {
        set((state) => {
          const dragStart = changes.some(
            (c) => c.type === "position" && c.dragging === true
          );
          const dragEnd = changes.some(
            (c) => c.type === "position" && c.dragging === false
          );
          const hasRemove = changes.some((c) => c.type === "remove");

          let history = state.history;
          let future = state.future;
          if ((dragStart && !state.isDragging) || hasRemove) {
            history = pushedHistory(state);
            future = [];
          }

          let nodes = applyNodeChanges(changes, state.nodes) as Node[];
          let alignmentGuides = state.alignmentGuides;
          let edges = state.edges;

          const activeDrag = changes.find(
            (c) => c.type === "position" && c.dragging === true,
          );
          if (activeDrag && activeDrag.type === "position") {
            const dragged = nodes.find((n) => n.id === activeDrag.id);
            if (dragged?.type === "component") {
              const { position, guides } = snapNodeAlignment(dragged, nodes);
              nodes = nodes.map((n) =>
                n.id === dragged.id ? { ...n, position } : n,
              );
              alignmentGuides = guides;
            }
          }

          if (dragEnd) {
            alignmentGuides = [];
            const movedIds = changes
              .filter((c) => c.type === "position")
              .map((c) => c.id);
            nodes = nodes.map((n) => {
              if (!movedIds.includes(n.id) || n.type !== "component") return n;
              return { ...n, position: resolveNodePosition(n, nodes) };
            });
            edges = assignHandlesToEdges(nodes, state.edges);
          }

          return {
            nodes,
            edges,
            alignmentGuides,
            history,
            future,
            isDragging: dragStart ? true : dragEnd ? false : state.isDragging,
          };
        });
      },
      onEdgesChange: (changes) => {
        set((state) => {
          const hasRemove = changes.some((c) => c.type === "remove");
          return {
            edges: applyEdgeChanges(changes, state.edges),
            ...(hasRemove
              ? { history: pushedHistory(state), future: [] }
              : null),
          };
        });
      },
      onConnect: (connection) => {
        set((state) => {
          const normalized = normalizeConnection(connection, state.nodes);
          if (!normalized.source || !normalized.target) return state;

          let nodes = maybeAlignNodesForConnection(
            normalized.source,
            normalized.target,
            state.nodes,
            state.defaultEdgePathStyle,
          );
          const sourceNode = nodes.find((n) => n.id === normalized.source);
          const targetNode = nodes.find((n) => n.id === normalized.target);
          const edges = assignHandlesToEdges(
            nodes,
            addEdge(
              {
                ...normalized,
                type: "animated",
                data: edgeDataForNodes(sourceNode, targetNode, state.defaultEdgePathStyle),
              },
              state.edges,
            ),
          );

          return {
            history: pushedHistory(state),
            future: [],
            nodes,
            edges,
          };
        });
      },
      addNode: (node) => {
        set((state) => {
          const position = resolveNodePosition(node, state.nodes);
          const alignedNode = { ...node, position };
          return {
            history: pushedHistory(state),
            future: [],
            nodes: [...state.nodes, alignedNode],
          };
        });
      },
      addEdgeDirect: (source, target, data) => {
        set((state) => {
          if (state.edges.some((e) => e.source === source && e.target === target)) {
            return state;
          }
          const nodes = state.nodes;
          const sourceNode = nodes.find((n) => n.id === source);
          const targetNode = nodes.find((n) => n.id === target);
          const handles =
            sourceNode && targetNode
              ? pickEdgeHandles(sourceNode.position, targetNode.position)
              : {};
          const edgeData =
            data ??
            edgeDataForNodes(sourceNode, targetNode, state.defaultEdgePathStyle);
          const edges = assignHandlesToEdges(
            nodes,
            addEdge(
              {
                id: `e-${source}-${target}-${crypto.randomUUID().slice(0, 6)}`,
                source,
                target,
                ...handles,
                type: "animated",
                data: edgeData,
              },
              state.edges,
            ),
          );
          return {
            history: pushedHistory(state),
            future: [],
            nodes,
            edges,
          };
        });
      },
      spliceNodeIntoEdge: (insertedNodeId, edgeId) => {
        set((state) => {
          const edge = state.edges.find((e) => e.id === edgeId);
          if (!edge || edge.source === insertedNodeId || edge.target === insertedNodeId) {
            return state;
          }

          const edgeData = (edge.data as CustomEdgeData | undefined) ?? defaultEdgeData(state.defaultEdgePathStyle);
          const inheritedPathStyle = edgeData.pathStyle ?? state.defaultEdgePathStyle;

          const nodes = state.nodes;
          const inserted = nodes.find((n) => n.id === insertedNodeId);
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!inserted || !sourceNode || !targetNode) return state;

          const without = state.edges.filter((e) => e.id !== edgeId);
          const handlesIn = pickEdgeHandles(sourceNode.position, inserted.position);
          const handlesOut = pickEdgeHandles(inserted.position, targetNode.position);

          const idSuffix = crypto.randomUUID().slice(0, 6);
          let edges = addEdge(
            {
              id: `e-${edge.source}-${insertedNodeId}-${idSuffix}`,
              source: edge.source,
              target: insertedNodeId,
              ...handlesIn,
              type: "animated",
              data: edgeDataForNodes(sourceNode, inserted, inheritedPathStyle),
            },
            without,
          );
          edges = addEdge(
            {
              id: `e-${insertedNodeId}-${edge.target}-${idSuffix}`,
              source: insertedNodeId,
              target: edge.target,
              ...handlesOut,
              type: "animated",
              data: edgeDataForNodes(inserted, targetNode, inheritedPathStyle),
            },
            edges,
          );
          edges = assignHandlesToEdges(nodes, edges);

          return {
            history: pushedHistory(state),
            future: [],
            nodes,
            edges,
          };
        });
      },
      setSelectedNode: (id) => {
        set({
          selectedNodeId: id,
          selectedEdgeId: null,
          selectedNodeIds: id ? [id] : [],
          selectedEdgeIds: [],
        });
      },
      setSelectedEdge: (id) => {
        set({
          selectedEdgeId: id,
          selectedNodeId: null,
          selectedNodeIds: [],
          selectedEdgeIds: id ? [id] : [],
        });
      },
      setSelection: (nodeIds, edgeIds) => {
        set({
          selectedNodeIds: nodeIds,
          selectedEdgeIds: edgeIds,
          selectedNodeId: nodeIds[0] ?? null,
          selectedEdgeId: edgeIds[0] ?? null,
        });
      },
      clearSelection: () => {
        set((state) => ({
          selectedNodeId: null,
          selectedEdgeId: null,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          nodes: state.nodes.map((n) => ({ ...n, selected: false })),
          edges: state.edges.map((e) => ({ ...e, selected: false })),
        }));
      },
      selectAllNodes: () => {
        set((state) => {
          const ids = state.nodes.map((n) => n.id);
          return {
            nodes: state.nodes.map((n) => ({ ...n, selected: true })),
            edges: state.edges.map((e) => ({ ...e, selected: false })),
            selectedNodeIds: ids,
            selectedEdgeIds: [],
            selectedNodeId: ids[0] ?? null,
            selectedEdgeId: null,
          };
        });
      },
      deleteSelected: () => {
        set((state) => {
          const nodeIds = new Set(
            state.selectedNodeIds.length > 0
              ? state.selectedNodeIds
              : state.selectedNodeId
                ? [state.selectedNodeId]
                : [],
          );
          const edgeIds = new Set(
            state.selectedEdgeIds.length > 0
              ? state.selectedEdgeIds
              : state.selectedEdgeId
                ? [state.selectedEdgeId]
                : [],
          );
          if (nodeIds.size === 0 && edgeIds.size === 0) return state;

          const nextNodes = state.nodes.filter((n) => !nodeIds.has(n.id));
          const nextEdges = state.edges.filter(
            (e) =>
              !edgeIds.has(e.id) &&
              !nodeIds.has(e.source) &&
              !nodeIds.has(e.target),
          );

          return {
            history: pushedHistory(state),
            future: [],
            nodes: nextNodes,
            edges: nextEdges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
          };
        });
        resetSimulation();
        clearScore();
      },
      copySelection: () => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!isEditableDesignTab(tab)) return false;

        const selectedIds =
          state.selectedNodeIds.length > 0
            ? state.selectedNodeIds
            : state.selectedNodeId
              ? [state.selectedNodeId]
              : [];
        const payload = buildClipboardFromSelection(
          state.nodes,
          state.edges,
          selectedIds,
        );
        if (!payload) return false;
        setCanvasClipboard(payload);
        return true;
      },
      pasteSelection: () => {
        const payload = getCanvasClipboard();
        if (!payload) return false;

        const state = get();
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!isEditableDesignTab(tab)) return false;

        const { nodes: pastedNodes, edges: pastedEdges } =
          pasteClipboardPayload(payload);
        const allNodes = [
          ...state.nodes.map((n) => ({ ...n, selected: false })),
          ...pastedNodes,
        ];
        const allEdges = assignHandlesToEdges(allNodes, [
          ...state.edges.map((e) => ({ ...e, selected: false })),
          ...pastedEdges,
        ]);

        set((s) => ({
          history: pushedHistory(s),
          future: [],
          nodes: allNodes,
          edges: allEdges,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          selectedNodeId: null,
          selectedEdgeId: null,
        }));
        resetSimulation();
        clearScore();
        return true;
      },
      pasteSelectionToNewTab: () => {
        const payload = getCanvasClipboard();
        if (!payload) return false;

        get().createNewDesignTab();
        return get().pasteSelection();
      },
      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }));
      },
      updateEdgeData: (edgeId, data) => {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
          ),
        }));
      },
      updateAllNodeData: (updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) => {
            const update = updates.get(n.id);
            return update ? { ...n, data: { ...n.data, ...update } } : n;
          }),
        }));
      },
      clearCanvas: () => {
        set((state) => ({
          history: pushedHistory(state),
          future: [],
          nodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeId: null,
          selectedNodeIds: [],
          selectedEdgeIds: [],
        }));
        resetSimulation();
        clearScore();
      },
      deleteNode: (nodeId) => {
        set((state) => ({
          history: pushedHistory(state),
          future: [],
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          selectedEdgeId: state.edges.some(
            (e) =>
              e.id === state.selectedEdgeId &&
              (e.source === nodeId || e.target === nodeId)
          )
            ? null
            : state.selectedEdgeId,
          selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
          selectedEdgeIds:
            state.selectedEdgeId &&
            state.edges.some(
              (e) =>
                e.id === state.selectedEdgeId &&
                (e.source === nodeId || e.target === nodeId)
            )
              ? []
              : state.selectedEdgeIds,
        }));
        resetSimulation();
        clearScore();
      },
      deleteEdge: (edgeId) => {
        set((state) => ({
          history: pushedHistory(state),
          future: [],
          edges: state.edges.filter((e) => e.id !== edgeId),
          selectedEdgeId:
            state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        }));
      },
      loadMyDesignContent: (nodes, edges) => {
        get().ensureActiveDesignTab();
        get().loadActiveTabContent(nodes, edges);
      },
      loadActiveTabContent: (nodes, edges) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!tab || tab.readOnly || state.activeTabId == null) return state;

          const tabs = snapshotActiveTabExtras(
            state.tabs,
            state.activeTabId,
            state.nodes,
            state.edges,
          ).map((t) =>
            t.id === state.activeTabId
              ? { ...t, nodes, edges, updatedAt: new Date().toISOString() }
              : t,
          );

          return {
            tabs,
            nodes,
            edges,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedNodeIds: [],
            selectedEdgeIds: [],
            history: pushedHistory(state),
            future: [],
            isDragging: false,
          };
        });
        resetSimulation();
      },
    }),
    {
      name: "systemsim-canvas",
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => indexedDbStorage),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const tabs = (state.tabs as CanvasTab[] | undefined) ?? [];
          const activeTabId =
            typeof state.activeTabId === "string" ? state.activeTabId : null;
          const nodes = (state.nodes as Node[] | undefined) ?? [];
          const edges = (state.edges as Edge[] | undefined) ?? [];
          const migrated = migrateLegacyTabs(tabs, activeTabId, nodes, edges);
          return { ...state, ...migrated };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return state as any;
      },
      partialize: (state) => ({
        nodes: state.activeTabId ? stripRuntimeFields(state.nodes) : [],
        edges: state.activeTabId ? state.edges : [],
        tabs: state.tabs.map((t) =>
          t.id === state.activeTabId && state.activeTabId
            ? {
                ...t,
                nodes: [],
                edges: [],
                scoreResult: useSimulationStore.getState().scoreResult,
                tradeoffEntries: useTradeoffStore.getState().entries,
              }
            : { ...t, nodes: stripRuntimeFields(t.nodes) }
        ),
        activeTabId: state.activeTabId,
        defaultEdgePathStyle: state.defaultEdgePathStyle,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<
          Pick<CanvasState, "nodes" | "edges" | "tabs" | "activeTabId" | "defaultEdgePathStyle">
        >;
        const merged: CanvasState = { ...currentState, ...persisted };

        const tabs = merged.tabs ?? [];
        const activeTabId = merged.activeTabId ?? null;
        const migrated = migrateLegacyTabs(
          tabs,
          activeTabId,
          merged.nodes ?? [],
          merged.edges ?? [],
        );

        merged.tabs = migrated.tabs.map((t) => ({
          ...t,
          capacity: t.capacity ?? { ...DEFAULT_CAPACITY_SETTINGS },
          tradeoffEntries: t.tradeoffEntries ?? [],
          scoreResult: t.scoreResult ?? null,
          ...(t.id === migrated.activeTabId && migrated.activeTabId
            ? { nodes: migrated.nodes, edges: migrated.edges }
            : {}),
        }));
        merged.activeTabId = migrated.activeTabId;
        merged.nodes = migrated.activeTabId ? migrated.nodes : [];
        merged.edges = migrated.activeTabId ? migrated.edges : [];

        merged.selectedNodeIds = merged.selectedNodeIds ?? [];
        merged.selectedEdgeIds = merged.selectedEdgeIds ?? [];
        merged.alignmentGuides = merged.alignmentGuides ?? [];

        const activeTab = merged.activeTabId
          ? merged.tabs.find((t) => t.id === merged.activeTabId)
          : undefined;
        if (activeTab) {
          restoreTabExtras(activeTab);
        }
        return merged;
      },
    }
  )
);
