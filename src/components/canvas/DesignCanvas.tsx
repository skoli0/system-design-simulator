"use client";

import { useCallback, useEffect, useMemo, useRef, type DragEvent } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodes/nodeTypes";
import { edgeTypes } from "./edges/edgeTypes";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { getComponentById } from "@/data/components";
import { BookOpen, GraduationCap, Layers, Lock, MousePointer2, Sparkles } from "lucide-react";
import { CanvasTabBar } from "./CanvasTabBar";
import { PenOverlay } from "./PenOverlay";
import { PenToolbar } from "./PenToolbar";

interface DesignCanvasProps {
  onPickProblem?: () => void;
  onLoadReference?: () => void;
  onStartInterview?: () => void;
}

export function DesignCanvas({ onPickProblem, onLoadReference, onStartInterview }: DesignCanvasProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setSelectedEdge = useCanvasStore((s) => s.setSelectedEdge);
  const tabs = useCanvasStore((s) => s.tabs);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const isReadOnly = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
  const penMode = usePenStore((s) => s.mode);
  const penActive = penMode !== "off";

  // Re-fit the viewport whenever the user switches canvas tabs
  const initialTabRef = useRef(true);
  useEffect(() => {
    if (initialTabRef.current) {
      initialTabRef.current = false;
      return; // initial mount already handled by the `fitView` prop
    }
    // Wait one frame so the new tab's nodes are mounted before fitting
    const raf = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTabId, fitView]);

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
          maxQPS: component.maxQPS,
          latencyMs: component.latencyMs,
          scalable: component.scalable,
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode, isReadOnly]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

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

  const isEmpty = nodes.length === 0;

  return (
    <div ref={reactFlowWrapper} className="relative flex-1 flex flex-col">
      <CanvasTabBar />
      <div className="relative flex-1">
      <ReactFlow
        className="h-full w-full bg-zinc-950"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "animated" }}
        fitView
        proOptions={{ hideAttribution: true }}
        panOnDrag={!penActive}
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
          color="rgba(63, 63, 70, 0.5)"
          className="!bg-zinc-950"
        />
        <Controls
          className="!rounded-md !border !border-zinc-800 !bg-zinc-900 !shadow-sm [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-200"
          position="bottom-left"
        />
        <MiniMap
          className="!hidden !rounded-md !border !border-zinc-800 !bg-zinc-900 md:!block"
          maskColor="rgba(9, 9, 11, 0.7)"
          nodeColor={miniMapNodeColor}
          position="bottom-right"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>

        <PenOverlay />
        <PenToolbar />

        {/* Read-only hint for reference tabs */}
        {isReadOnly && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-zinc-900/90 px-3 py-1 text-[11px] font-medium text-cyan-400 shadow-sm backdrop-blur">
            <Lock className="h-3 w-3" />
            Read-only reference
          </div>
        )}
      </div>

      {/* Welcome / empty state */}
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 pb-4 md:pb-0">
          <div className="pointer-events-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-[0_0_40px_-10px_rgba(6,182,212,0.4)]">
              <Layers className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-base font-semibold tracking-tight text-zinc-100 md:text-lg">
                Build an architecture that scales
              </h1>
              <p className="mx-auto max-w-sm text-xs leading-relaxed text-zinc-400 md:text-sm">
                Pick a problem, drop infrastructure components onto the canvas, and get scored the way an interviewer would evaluate you.
              </p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-3">
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
            </div>

            <div className="hidden flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-500 md:flex">
              <span className="flex items-center gap-1.5">
                <MousePointer2 className="h-3 w-3" />
                Drag from the sidebar
              </span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">⌘E</kbd>
                export
              </span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd>
                simulate
              </span>
            </div>
          </div>
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
      className={`group flex flex-col items-start gap-1.5 rounded-lg border bg-zinc-900/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-zinc-900 ${
        accent
          ? "border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_24px_-8px_rgba(6,182,212,0.5)]"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md ${
          accent ? "bg-cyan-500/15 text-cyan-400" : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
        }`}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-zinc-200">{title}</span>
      <span className="text-[11px] leading-tight text-zinc-500">{hint}</span>
    </button>
  );
}
