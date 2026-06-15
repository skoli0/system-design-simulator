"use client";

import { useCallback, useEffect, useMemo, useRef, type DragEvent } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  CANVAS_FIT_VIEW_OPTIONS,
  CANVAS_LAYOUT_SETTLE_MS,
} from "@/lib/canvasFitView";
import { useHasHydrated } from "@/store/hydration";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodes/nodeTypes";
import { edgeTypes } from "./edges/edgeTypes";
import {
  useCanvasStore,
  type ComponentNodeData,
  isEditableDesignTab,
  isHomeView,
} from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { useAppStore } from "@/store/appStore";
import { useSimulationStore } from "@/store/simulationStore";
import { getComponentById } from "@/data/components";
import { wireDroppedNode } from "@/lib/insertNodeOnEdge";
import { BookOpen, GraduationCap, Layers, Lock, MousePointer2, Sparkles, Copy } from "lucide-react";
import { motion } from "framer-motion";

// Orchestrated staggered reveal for the empty state — one deliberate page-load
// moment rather than scattered micro-animations.
const emptyContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const emptyItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};
import { CanvasTabBar } from "./CanvasTabBar";
import { PenOverlay } from "./PenOverlay";
import { PenToolbar } from "./PenToolbar";
import { AlignmentGuides } from "./AlignmentGuides";
import { copyReferenceToDesignTab } from "@/lib/loadReference";

interface DesignCanvasProps {
  onPickProblem?: () => void;
  onLoadReference?: () => void;
  onStartInterview?: () => void;
}

export function DesignCanvas({ onPickProblem, onLoadReference, onStartInterview }: DesignCanvasProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const onReconnect = useCanvasStore((s) => s.onReconnect);
  const alignmentGuides = useCanvasStore((s) => s.alignmentGuides);
  const addNode = useCanvasStore((s) => s.addNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setSelection = useCanvasStore((s) => s.setSelection);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const tabs = useCanvasStore((s) => s.tabs);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isReadOnly = activeTab?.readOnly === true;
  const isEditable = isEditableDesignTab(activeTab);
  const penMode = usePenStore((s) => s.mode);
  const penActive = penMode !== "off";
  const theme = useAppStore((s) => s.theme);
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const hasHydrated = useHasHydrated();
  const isDark = theme === "dark";
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const simRunning = useSimulationStore((s) => s.isRunning);
  const simResult = useSimulationStore((s) => s.result);

  // Recompute edge paths when simulation metrics change node dimensions.
  useEffect(() => {
    if (!trafficActive && !simRunning && !simResult) return;
    const raf = requestAnimationFrame(() => {
      for (const n of nodes) {
        if (n.type !== "text") updateNodeInternals(n.id);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [trafficActive, simRunning, simResult, nodes, updateNodeInternals]);

  const runFitView = useCallback(() => {
    if (nodes.length === 0) return;
    requestAnimationFrame(() => {
      fitView(CANVAS_FIT_VIEW_OPTIONS);
    });
  }, [fitView, nodes.length]);

  const scheduleFitView = useCallback(
    (delayMs = CANVAS_LAYOUT_SETTLE_MS) => {
      if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
      fitTimerRef.current = setTimeout(runFitView, delayMs);
    },
    [runFitView]
  );

  // Re-fit when the canvas area resizes (panel collapse, window resize).
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      scheduleFitView();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
    };
  }, [scheduleFitView]);

  // Re-fit after sidebar / right panel toggle once the slide animation finishes.
  const prevPanelsRef = useRef({ left: leftSidebarOpen, right: rightPanelOpen });
  useEffect(() => {
    const prev = prevPanelsRef.current;
    if (prev.left === leftSidebarOpen && prev.right === rightPanelOpen) return;
    prevPanelsRef.current = { left: leftSidebarOpen, right: rightPanelOpen };
    scheduleFitView();
  }, [leftSidebarOpen, rightPanelOpen, scheduleFitView]);

  // Re-fit once persisted nodes are available on first app open.
  const openedFitRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated || openedFitRef.current || nodes.length === 0) return;
    openedFitRef.current = true;
    scheduleFitView(CANVAS_LAYOUT_SETTLE_MS + 80);
  }, [hasHydrated, nodes.length, scheduleFitView]);

  // Re-fit the viewport when switching tabs
  const initialTabRef = useRef(true);
  useEffect(() => {
    if (initialTabRef.current) {
      initialTabRef.current = false;
      return;
    }
    scheduleFitView(0);
  }, [activeTabId, scheduleFitView]);

  useEffect(() => {
    function handleFitView() {
      runFitView();
    }
    window.addEventListener("canvas:fitview", handleFitView);
    return () => window.removeEventListener("canvas:fitview", handleFitView);
  }, [runFitView]);

  // Listen for text node edits and persist them to the store
  useEffect(() => {
    function handleTextNodeUpdate(e: Event) {
      const { id, text } = (e as CustomEvent).detail;
      updateNodeData(id, { text } as Record<string, unknown>);
    }
    window.addEventListener("textnode:update", handleTextNodeUpdate);
    return () => window.removeEventListener("textnode:update", handleTextNodeUpdate);
  }, [updateNodeData]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (isReadOnly) return;

      const componentId = event.dataTransfer.getData(
        "application/systemsim-component"
      );
      if (!componentId) return;

      const component = getComponentById(componentId);
      if (!component) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<ComponentNodeData> = {
        id: `${componentId}-${crypto.randomUUID()}`,
        type: "component",
        position,
        data: {
          componentId: component.id,
          label: component.label,
          icon: component.icon,
          category: component.category,
          replicas: 1,
          shards: 1,
          maxQPS: component.maxQPS,
          latencyMs: component.latencyMs,
          scalable: component.scalable,
        },
      };

      addNode(newNode);
      wireDroppedNode(newNode.id);
    },
    [screenToFlowPosition, addNode, isReadOnly]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      setSelection(
        selNodes.map((n) => n.id),
        selEdges.map((e) => e.id),
      );
    },
    [setSelection],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const miniMapNodeColor = useMemo(
    () => (node: Node) => {
      const data = node.data as ComponentNodeData;
      const status = data.status as string;
      if (status === "critical") return "#ef4444";
      if (status === "warning") return "#f59e0b";
      if (status === "healthy") return "#10b981";
      return "#52525b";
    },
    []
  );

  const isHome = isHomeView(activeTabId);
  const isEmpty =
    !isHome &&
    isEditable &&
    nodes.filter((n) => n.type !== "text").length === 0;

  return (
    <div ref={reactFlowWrapper} className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {tabs.length > 0 && <CanvasTabBar />}

      {isHome ? (
        <div className="relative flex flex-1 items-center justify-center px-4 pb-4 md:pb-0">
          <motion.div
            variants={emptyContainer}
            initial="hidden"
            animate="show"
            className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
          >
            <motion.div
              variants={emptyItem}
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-[0_0_40px_-10px_rgba(6,182,212,0.4)]"
            >
              <Layers className="h-6 w-6 text-cyan-400" />
            </motion.div>
            <motion.div variants={emptyItem} className="space-y-1.5">
              <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                Build an architecture that scales
              </h1>
              <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground md:text-sm">
                Pick a problem, drop infrastructure components onto the canvas, and get scored the way an interviewer would evaluate you.
              </p>
            </motion.div>

            <motion.div variants={emptyItem} className="grid w-full gap-2 sm:grid-cols-2">
              <QuickStartCard
                icon={<BookOpen className="h-3.5 w-3.5" />}
                title="Pick a problem"
                hint="35 real interview questions"
                onClick={onPickProblem}
              />
              <QuickStartCard
                icon={<Sparkles className="h-3.5 w-3.5" />}
                title="Load reference"
                hint="Open a sample solution"
                onClick={onLoadReference}
              />
              <QuickStartCard
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                title="Practice interview"
                hint="Timed 6-phase mock"
                onClick={onStartInterview}
                accent
              />
              <QuickStartCard
                icon={<Layers className="h-3.5 w-3.5" />}
                title="+ New"
                hint="Build an architecture that scales"
                onClick={() => {
                  useCanvasStore.getState().createNewDesignTab();
                  useAppStore.getState().showToast("New design canvas created", "success");
                }}
              />
            </motion.div>

            <motion.div variants={emptyItem} className="hidden flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground md:flex">
              <span className="flex items-center gap-1.5">
                <MousePointer2 className="h-3 w-3" />
                Drag from the sidebar
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘E</kbd>
                export
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd>
                simulate
              </span>
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={canvasAreaRef} className="relative flex-1">
      <ReactFlow
        key={activeTabId}
        className="h-full w-full bg-muted/30 dark:bg-zinc-950"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onReconnect={isReadOnly ? undefined : onReconnect}
        edgesReconnectable={!isReadOnly}
        reconnectRadius={12}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "animated" }}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag={!penActive && !isReadOnly}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnDrag={penActive ? false : true}
        zoomOnScroll={!penActive}
        zoomOnPinch={!penActive}
        nodesDraggable={!penActive && !isReadOnly}
        nodesConnectable={!penActive && !isReadOnly}
        elementsSelectable={!penActive}
        connectionRadius={30}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? "rgba(63, 63, 70, 0.5)" : "rgba(0, 0, 0, 0.10)"}
        />
        <Controls
          className="!rounded-md !border !border-border !bg-card !shadow-sm [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent [&>button:hover]:!text-foreground"
          position="bottom-left"
        />
        <MiniMap
          className="!hidden !rounded-md !border !border-border !bg-card md:!block"
          maskColor={isDark ? "rgba(9, 9, 11, 0.7)" : "rgba(255, 255, 255, 0.75)"}
          nodeColor={miniMapNodeColor}
          position="bottom-right"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>

        <PenOverlay />
        <PenToolbar />

        {!isReadOnly && <AlignmentGuides guides={alignmentGuides} />}

        {/* Read-only hint for reference tabs */}
        {isReadOnly && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-card/90 px-3 py-1 text-[11px] font-medium text-cyan-400 shadow-sm backdrop-blur">
              <Lock className="h-3 w-3" />
              Read-only reference
            </div>
            <button
              type="button"
              onClick={() => copyReferenceToDesignTab()}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
              title="Copy this reference into a new editable design tab"
            >
              <Copy className="h-3 w-3" />
              Copy to design
            </button>
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-2 text-center">
            <Layers className="h-5 w-5 text-cyan-400" />
            <p className="text-sm font-medium text-foreground">
              {activeTab?.label ?? "Design"}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag components from the sidebar or paste with{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘V</kbd>
            </p>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

function QuickStartCard({
  icon,
  title,
  hint,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-1.5 rounded-lg border bg-card/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-card ${
        accent
          ? "border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_24px_-8px_rgba(6,182,212,0.5)]"
          : "border-border hover:border-border"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md ${
          accent ? "bg-cyan-500/15 text-cyan-400" : "bg-muted text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-foreground">{title}</span>
      <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
    </button>
  );
}
