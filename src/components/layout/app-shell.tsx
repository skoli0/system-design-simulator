"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { X } from "lucide-react";
import { TopBar } from "./top-bar";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { RightPanel } from "@/components/panel/RightPanel";
import { DesignCanvas } from "@/components/canvas/DesignCanvas";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import {
  runSimulationWithAnimation,
  stopSimulation,
} from "@/lib/simulationRunner";
import { loadReferenceIntoTab, syncSimulationLoadForProblem } from "@/lib/loadReference";
import { getProblemById } from "@/data/problems";
import { rehydrateAllStores } from "@/store/hydration";
import { requestCanvasFitView, CANVAS_LAYOUT_SETTLE_MS } from "@/lib/canvasFitView";
import { useDesignAutoSave } from "@/hooks/useDesignAutoSave";
import { Toast } from "@/components/ui/Toast";
import { SaveDialog } from "@/components/dialogs/SaveDialog";
import { LoadDialog } from "@/components/dialogs/LoadDialog";
import { InterviewBar } from "@/components/interview/InterviewBar";
import { InterviewStartDialog } from "@/components/interview/InterviewStartDialog";
import { CreateProblemDialog } from "@/components/dialogs/CreateProblemDialog";
import { CreateComponentDialog } from "@/components/dialogs/CreateComponentDialog";
import { useInterviewStore } from "@/store/interviewStore";
import { useIsMobile } from "@/hooks/useBreakpoint";

export function AppShell() {
  const isMobile = useIsMobile();
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);

  // Mobile drawer state — local, does not persist
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [createProblemDialogOpen, setCreateProblemDialogOpen] = useState(false);
  const [createComponentDialogOpen, setCreateComponentDialogOpen] = useState(false);

  const interviewMode = useInterviewStore((s) => s.mode);
  const timerRunning = useInterviewStore((s) => s.timerRunning);
  const tickTimer = useInterviewStore((s) => s.tickTimer);

  useDesignAutoSave();

  const handleToggleLeft = useCallback(() => {
    if (isMobile) setMobileSidebarOpen((v) => !v);
    else toggleLeftSidebar();
  }, [isMobile, toggleLeftSidebar]);

  const handleToggleRight = useCallback(() => {
    if (isMobile) setMobileRightOpen((v) => !v);
    else toggleRightPanel();
  }, [isMobile, toggleRightPanel]);

  // Close mobile drawers when transitioning to desktop
  useEffect(() => {
    if (!isMobile && (mobileSidebarOpen || mobileRightOpen)) {
      setMobileSidebarOpen(false);
      setMobileRightOpen(false);
    }
  }, [isMobile, mobileSidebarOpen, mobileRightOpen]);

  // On tablets (768–1023px) default the right panel to closed on first load
  // so the canvas gets the space. Runs once; the user can still toggle it.
  useEffect(() => {
    if (
      window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches &&
      useAppStore.getState().rightPanelOpen
    ) {
      useAppStore.getState().toggleRightPanel();
    }
  }, []);

  const handleSave = useCallback(() => setSaveDialogOpen(true), []);
  const handleLoad = useCallback(() => setLoadDialogOpen(true), []);

  const focusSimulationPanel = useCallback(() => {
    useAppStore.getState().setActiveRightTab("simulation");
    if (isMobile) {
      setMobileRightOpen(true);
    } else if (!useAppStore.getState().rightPanelOpen) {
      useAppStore.getState().toggleRightPanel();
    }
  }, [isMobile]);

  const handleSimulateFromTopBar = useCallback(() => {
    focusSimulationPanel();
    runSimulationWithAnimation({
      source: "topbar",
      onBottlenecks: focusSimulationPanel,
    });
  }, [focusSimulationPanel]);

  const handleSimulateFromPanel = useCallback(() => {
    runSimulationWithAnimation({ source: "panel" });
  }, []);

  const handleStopSimulation = useCallback(() => {
    stopSimulation();
  }, []);

  const handleOpenScoreTab = useCallback(() => {
    useAppStore.getState().setActiveRightTab("score");
    if (isMobile) {
      setMobileRightOpen(true);
    } else if (!useAppStore.getState().rightPanelOpen) {
      useAppStore.getState().toggleRightPanel();
    }
  }, [isMobile]);

  const handleClearCanvas = useCallback(() => {
    useCanvasStore.getState().clearCanvas();
    useAppStore.getState().showToast("Canvas cleared", "info");
  }, []);

  const handlePickProblem = useCallback(() => {
    useAppStore.getState().setActiveLeftTab("problems");
    if (isMobile) setMobileSidebarOpen(true);
    else useAppStore.getState().setLeftSidebarOpen(true);
  }, [isMobile]);

  const handleLoadReference = useCallback(() => {
    const problemId = useAppStore.getState().selectedProblemId;
    const problem = getProblemById(problemId);
    if (!problem?.referenceSolution.nodes.length) {
      useAppStore.getState().showToast("Pick a problem with a reference solution", "info");
      handlePickProblem();
      return;
    }
    loadReferenceIntoTab(problem);
  }, [handlePickProblem]);

  // Restore persisted state; fresh visits land on the home welcome screen
  const initialLoadDone = useRef(false);
  useEffect(() => {
    rehydrateAllStores().then(() => {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;
      const problem = getProblemById(useAppStore.getState().selectedProblemId);
      if (problem) syncSimulationLoadForProblem(problem);
      requestCanvasFitView(CANVAS_LAYOUT_SETTLE_MS + 100);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // e.key is "S" (uppercase) when Shift is held — normalize for shortcuts
      const key = e.key.toLowerCase();

      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedNodeIds, selectedEdgeIds, selectedNodeId, selectedEdgeId, deleteSelected, tabs, activeTabId } =
          useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (isReadOnlyTab) return;
        const hasSelection =
          selectedNodeIds.length > 0 ||
          selectedEdgeIds.length > 0 ||
          selectedNodeId ||
          selectedEdgeId;
        if (hasSelection) {
          e.preventDefault();
          deleteSelected();
        }
      }

      if (key === "a" && (e.metaKey || e.ctrlKey)) {
        const { tabs, activeTabId, selectAllNodes } = useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (!isReadOnlyTab) {
          e.preventDefault();
          selectAllNodes();
        }
      }

      if (key === "c" && (e.metaKey || e.ctrlKey)) {
        const { tabs, activeTabId, copySelection } = useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (!isReadOnlyTab) {
          const copied = copySelection();
          if (copied) e.preventDefault();
        }
      }

      if (key === "v" && (e.metaKey || e.ctrlKey)) {
        const { tabs, activeTabId, pasteSelection, pasteSelectionToNewTab } =
          useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (!isReadOnlyTab) {
          e.preventDefault();
          if (e.shiftKey) pasteSelectionToNewTab();
          else pasteSelection();
        }
      }

      // Undo / Redo — Cmd/Ctrl+Z, redo via Shift+Z or Ctrl+Y. Disabled on read-only tabs.
      if (key === "z" && (e.metaKey || e.ctrlKey)) {
        const { tabs, activeTabId, undo, redo } = useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (!isReadOnlyTab) {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      }
      if (key === "y" && (e.metaKey || e.ctrlKey)) {
        const { tabs, activeTabId, redo } = useCanvasStore.getState();
        const isReadOnlyTab = tabs.find((t) => t.id === activeTabId)?.readOnly === true;
        if (!isReadOnlyTab) {
          e.preventDefault();
          redo();
        }
      }

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSimulateFromTopBar();
      }

      if (key === "s" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handleOpenScoreTab();
      }

      if (key === "s" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setSaveDialogOpen(true);
      }

      if (key === "o" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setLoadDialogOpen(true);
      }

      if (e.key === "Escape") {
        if (mobileSidebarOpen) setMobileSidebarOpen(false);
        else if (mobileRightOpen) setMobileRightOpen(false);
        else {
          useCanvasStore.getState().clearSelection();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSimulateFromTopBar, handleOpenScoreTab, mobileSidebarOpen, mobileRightOpen]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, tickTimer]);

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        {interviewMode === "interview" && <InterviewBar />}
        <TopBar
          onSimulate={handleSimulateFromTopBar}
          onStopSimulation={handleStopSimulation}
          onClearCanvas={handleClearCanvas}
          onSave={handleSave}
          onLoad={handleLoad}
          onStartInterview={() => setInterviewDialogOpen(true)}
          onCreateProblem={() => setCreateProblemDialogOpen(true)}
          onToggleLeft={handleToggleLeft}
          onToggleRight={handleToggleRight}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {/* Desktop inline sidebar (hidden on mobile) */}
          <Sidebar
            open={leftSidebarOpen}
            onCreateProblem={() => setCreateProblemDialogOpen(true)}
            onCreateCustomComponent={() => setCreateComponentDialogOpen(true)}
            variant="desktop"
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <DesignCanvas
              onPickProblem={handlePickProblem}
              onLoadReference={handleLoadReference}
              onStartInterview={() => setInterviewDialogOpen(true)}
            />
          </div>

          {/* Desktop inline right panel (hidden on mobile) */}
          <RightPanel
            open={rightPanelOpen}
            onSimulate={handleSimulateFromPanel}
            onStopSimulation={handleStopSimulation}
            variant="desktop"
          />

          {/* Mobile: sidebar drawer from left */}
          {isMobile && (
            <>
              {/* Backdrop */}
              <div
                className={`absolute inset-0 z-30 bg-black/60 transition-opacity md:hidden ${
                  mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileSidebarOpen(false)}
              />
              {/* Drawer */}
              <div
                className={`absolute inset-y-0 left-0 z-40 flex w-[85%] max-w-[320px] flex-col border-r border-border bg-card shadow-xl transition-transform md:hidden ${
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-hidden={!mobileSidebarOpen}
                inert={!mobileSidebarOpen || undefined}
              >
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Library</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <Sidebar
                    onCreateProblem={() => {
                      setCreateProblemDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onCreateCustomComponent={() => {
                      setCreateComponentDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onComponentAdded={() => setMobileSidebarOpen(false)}
                    variant="mobile"
                  />
                </div>
              </div>

              {/* Mobile: right panel as bottom sheet */}
              <div
                className={`absolute inset-0 z-30 bg-black/60 transition-opacity md:hidden ${
                  mobileRightOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileRightOpen(false)}
              />
              <div
                className={`absolute inset-x-0 bottom-0 z-40 flex h-[70dvh] max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-transform md:hidden ${
                  mobileRightOpen ? "translate-y-0" : "translate-y-full"
                }`}
                aria-hidden={!mobileRightOpen}
                inert={!mobileRightOpen || undefined}
              >
                <div className="flex shrink-0 items-center justify-between pt-2">
                  <div className="flex-1" />
                  <div className="sheet-handle" />
                  <div className="flex flex-1 justify-end pr-3">
                    <button
                      onClick={() => setMobileRightOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Close panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
                  <RightPanel
                    onSimulate={handleSimulateFromPanel}
                    onStopSimulation={handleStopSimulation}
                    variant="mobile"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <Toast />

        <SaveDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} />
        <LoadDialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} />
        <InterviewStartDialog open={interviewDialogOpen} onClose={() => setInterviewDialogOpen(false)} />
        <CreateProblemDialog open={createProblemDialogOpen} onClose={() => setCreateProblemDialogOpen(false)} />
        <CreateComponentDialog open={createComponentDialogOpen} onClose={() => setCreateComponentDialogOpen(false)} />
      </div>
    </ReactFlowProvider>
  );
}
