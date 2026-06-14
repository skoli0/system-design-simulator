"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Loader2,
  ChevronDown,
  PanelLeft,
  PanelRight,
  Trash2,
  Download,
  ImageIcon,
  FileCode2,
  FileJson,
  Save,
  FolderOpen,
  StickyNote,
  GraduationCap,
  Plus,
  MoreHorizontal,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSimulationStore } from "@/store/simulationStore";
import { usePenStore } from "@/store/penStore";
import { PROBLEMS, getProblemById } from "@/data/problems";
import { useCustomProblemsStore } from "@/store/customProblemsStore";
import { type Node, useReactFlow } from "@xyflow/react";
import { loadReferenceIntoTab, selectProblemWithReference } from "@/lib/loadReference";
import { exportAsPng, exportAsSvg, exportAsJSON } from "@/lib/exportCanvas";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

interface TopBarProps {
  onSimulate: () => void;
  onStopSimulation: () => void;
  onClearCanvas: () => void;
  onSave: () => void;
  onLoad: () => void;
  onStartInterview: () => void;
  onCreateProblem: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function TopBar({ onSimulate, onStopSimulation, onClearCanvas, onSave, onLoad, onStartInterview, onCreateProblem, onToggleLeft, onToggleRight }: TopBarProps) {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const trafficActive = useSimulationStore((s) => s.trafficActive);
  const simActive = isRunning || trafficActive;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);

  // Undo/redo — subscribe to stack lengths so the buttons enable/disable reactively
  const canUndo = useCanvasStore((s) => s.history.length > 0);
  const canRedo = useCanvasStore((s) => s.future.length > 0);
  const activeTabReadOnly = useCanvasStore(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.readOnly === true,
  );
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const customProblems = useCustomProblemsStore((s) => s.problems);
  const currentProblem =
    PROBLEMS.find((p) => p.id === selectedProblemId) ??
    customProblems.find((p) => p.id === selectedProblemId);

  const addTextNote = useCallback(() => {
    if (activeTabReadOnly) return;
    // Center of the visible canvas (not the window — sidebars offset it)
    const wrapper = document.querySelector(".react-flow");
    const rect = wrapper?.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });

    const newNode: Node = {
      id: `text-${crypto.randomUUID()}`,
      type: "text",
      position,
      data: { text: "" },
      connectable: false,
    };
    addNode(newNode);
  }, [screenToFlowPosition, addNode, activeTabReadOnly]);

  const handleExportPng = useCallback(async () => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsPng(name);
      useAppStore.getState().showToast("Exported as PNG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportSvg = useCallback(async () => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsSvg(name);
      useAppStore.getState().showToast("Exported as SVG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportJson = useCallback(() => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    const { nodes, edges } = useCanvasStore.getState();
    const { strokes } = usePenStore.getState();
    if (nodes.length === 0 && strokes.length === 0) {
      useAppStore.getState().showToast("Nothing to export", "info");
      return;
    }
    exportAsJSON(nodes, edges, name, strokes);
    useAppStore.getState().showToast("Exported as JSON", "success");
  }, [currentProblem]);

  // Keyboard shortcut: Ctrl/Cmd+E → Export as PNG
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "e" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handleExportPng();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExportPng]);

  const loadReference = useCallback(() => {
    const problem = getProblemById(selectedProblemId);
    if (!problem?.referenceSolution.nodes.length) return;
    loadReferenceIntoTab(problem);
  }, [selectedProblemId]);

  return (
    <>
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 md:gap-3 md:px-3">
      {/* Left section */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button
          onClick={onToggleLeft}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-500" />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            SystemSim
          </span>
          <span className="hidden rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400 md:inline">
            beta
          </span>
        </div>

        <div className="mx-1 hidden h-4 w-px bg-muted md:block" />

        {/* Problem selector */}
        <div className="relative min-w-0 flex-shrink">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="max-w-[120px] truncate md:max-w-none">
              {currentProblem?.title ?? "Select Problem"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded-md border border-border bg-muted py-1 shadow-lg">
                {/* Create custom problem */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreateProblem();
                  }}
                  className="flex w-full items-center gap-1.5 border-b border-border px-3 py-1.5 text-left text-xs font-medium text-violet-400 transition-colors hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                  Create Custom Problem
                </button>

                {/* Custom problems */}
                {customProblems.map((problem) => (
                  <button
                    key={problem.id}
                    onClick={() => {
                      selectProblemWithReference(problem.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                      problem.id === selectedProblemId
                        ? "text-cyan-500"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex-1 truncate">{problem.title}</span>
                    <span className="shrink-0 rounded bg-violet-500/10 px-1 py-0.5 text-[9px] font-medium text-violet-400">
                      Custom
                    </span>
                  </button>
                ))}

                {customProblems.length > 0 && (
                  <div className="my-0.5 h-px bg-accent" />
                )}

                {/* Predefined problems */}
                {PROBLEMS.map((problem) => (
                  <button
                    key={problem.id}
                    onClick={() => {
                      selectProblemWithReference(problem.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                      problem.id === selectedProblemId
                        ? "text-cyan-500"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {problem.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!selectedProblemId.startsWith("custom-") && (
          <button
            onClick={loadReference}
            className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground/80 md:flex"
            title="Load reference solution"
          >
            <Download className="h-3 w-3" />
            Reference
          </button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-muted md:block" />

        <button
          onClick={addTextNote}
          className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          title="Add text note to canvas"
        >
          <StickyNote className="h-3 w-3" />
          Add Note
        </button>

        <div className="mx-1 hidden h-4 w-px bg-muted md:block" />

        <button
          onClick={undo}
          disabled={!canUndo || activeTabReadOnly}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:flex"
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo || activeTabReadOnly}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:flex"
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 hidden h-4 w-px bg-muted md:block" />

        <button
          onClick={onStartInterview}
          className="hidden shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground md:flex"
          title="Start a guided interview practice"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Practice Interview
        </button>

        {/* Mobile-only overflow menu */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMobileMoreOpen((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {mobileMoreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMoreOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-md border border-border bg-card py-1 shadow-lg">
                {/* Design actions */}
                {!selectedProblemId.startsWith("custom-") && (
                  <button
                    onClick={() => { setMobileMoreOpen(false); loadReference(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    Load reference solution
                  </button>
                )}
                <button
                  onClick={() => { setMobileMoreOpen(false); addTextNote(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                  Add text note
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); onStartInterview(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  Practice interview
                </button>

                <div className="my-1 h-px bg-muted" />

                {/* File */}
                <button
                  onClick={() => { setMobileMoreOpen(false); onSave(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <Save className="h-3.5 w-3.5 text-muted-foreground" />
                  Save design
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); onLoad(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  Load design
                </button>

                <div className="my-1 h-px bg-muted" />

                {/* Export */}
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportPng(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Export as PNG
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportSvg(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Export as SVG
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportJson(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                  Export as JSON
                </button>

                <div className="my-1 h-px bg-border" />

                <button
                  onClick={() => { setMobileMoreOpen(false); toggleTheme(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  {theme === "dark" ? (
                    <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {theme === "dark" ? "Light theme" : "Dark theme"}
                </button>

                <div className="my-1 h-px bg-border" />

                {/* Danger */}
                <button
                  onClick={() => { setMobileMoreOpen(false); setClearConfirmOpen(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-rose-400 transition-colors hover:bg-muted"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear canvas
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={onSave}
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          title="Save design (Ctrl+S)"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button
          onClick={onLoad}
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          title="Load design (Ctrl+O)"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Load</span>
        </button>

        <div className="hidden h-4 w-px bg-muted md:block" />

        {/* Export dropdown — desktop only; mobile goes through overflow menu */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Export design (Ctrl+E)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>

          {exportOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={handleExportPng}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Export as PNG
                  <kbd className="ml-auto rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {"\u2318"}E
                  </kbd>
                </button>
                <button
                  onClick={handleExportSvg}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  Export as SVG
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Export as JSON
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden h-4 w-px bg-muted md:block" />

        <button
          onClick={() => {
            if (activeTabReadOnly) return;
            setClearConfirmOpen(true);
          }}
          disabled={activeTabReadOnly}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-400 disabled:pointer-events-none disabled:opacity-40 md:flex"
          title="Clear canvas"
          aria-label="Clear canvas"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {simActive ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onStopSimulation}
            className="h-7 gap-1.5 border-rose-500/40 px-3 text-xs font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3 w-3 fill-current" />
            )}
            <span className="hidden sm:inline">{isRunning ? "Stop" : "Stop traffic"}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onSimulate}
            className="h-7 gap-1.5 bg-cyan-500 px-3 text-xs font-medium text-white hover:bg-cyan-400"
          >
            <Play className="h-3 w-3" />
            <span className="hidden sm:inline">Simulate</span>
          </Button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={onToggleRight}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Toggle panel"
          aria-label="Toggle properties panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>

    <ConfirmDialog
      open={clearConfirmOpen}
      title="Clear canvas?"
      message="All components and connections on the current tab will be removed. This can't be undone."
      confirmText="Clear canvas"
      danger
      onConfirm={onClearCanvas}
      onClose={() => setClearConfirmOpen(false)}
    />
    </>
  );
}
