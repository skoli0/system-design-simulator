"use client";

import { useRef, useState } from "react";
import { X, Trash2, Download, Upload, ChevronDown, ChevronRight, History } from "lucide-react";
import {
  useSavedDesignsStore,
  getProblemTitle,
  designNodeCount,
  type SavedDesign,
} from "@/store/savedDesignsStore";
import { useSessionVersionsStore } from "@/store/sessionVersionsStore";
import { useAppStore } from "@/store/appStore";
import { ModalShell } from "./ModalShell";
import { ConfirmDialog } from "./ConfirmDialog";

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DesignRow({
  design,
  onLoad,
  onLoadVersion,
  onDelete,
  onExport,
}: {
  design: SavedDesign;
  onLoad: () => void;
  onLoadVersion: (version: number) => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const versions = [...design.versions].sort((a, b) => b.version - a.version);
  const nodeCount = designNodeCount(design);

  return (
    <div className="rounded-md border border-border bg-muted transition-colors hover:border-border">
      <div className="group flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground/80"
          aria-label={expanded ? "Collapse versions" : "Expand versions"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          onClick={onLoad}
          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
        >
          <span className="truncate text-sm font-medium text-foreground">
            {design.name}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{getProblemTitle(getDesignVersionProblemId(design))}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>
              {nodeCount} node{nodeCount !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span>v{design.currentVersion}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{formatDate(design.updatedAt)}</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground/80"
            title="Export as JSON"
            aria-label={`Export ${design.name} as JSON`}
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-rose-400"
            title="Delete"
            aria-label={`Delete ${design.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Versions
          </p>
          <div className="space-y-1">
            {versions.map((v) => (
              <button
                key={v.version}
                type="button"
                onClick={() => onLoadVersion(v.version)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/80"
              >
                <span className="text-foreground/90">
                  v{v.version}
                  {v.label ? ` · ${v.label}` : ""}
                  {v.version === design.currentVersion && (
                    <span className="ml-1.5 text-cyan-500">(latest)</span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(v.savedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDesignVersionProblemId(design: SavedDesign): string | null {
  const latest = design.versions.find((v) => v.version === design.currentVersion);
  return latest?.problemId ?? design.versions[0]?.problemId ?? null;
}

export function LoadDialog({ open, onClose }: LoadDialogProps) {
  const designs = useSavedDesignsStore((s) => s.designs);
  const loadDesign = useSavedDesignsStore((s) => s.loadDesign);
  const deleteDesign = useSavedDesignsStore((s) => s.deleteDesign);
  const exportDesign = useSavedDesignsStore((s) => s.exportDesign);
  const importDesign = useSavedDesignsStore((s) => s.importDesign);
  const sessionVersions = useSessionVersionsStore((s) => s.versions);
  const restoreSessionVersion = useSessionVersionsStore((s) => s.restoreVersion);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedDesign | null>(null);
  const [sessionOpen, setSessionOpen] = useState(true);

  const handleExport = (id: string, name: string) => {
    const json = exportDesign(id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importDesign(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoad = (id: string, version?: number) => {
    loadDesign(id, version);
    onClose();
  };

  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        panelClassName="flex max-h-[85vh] max-w-lg flex-col p-0"
        ariaLabel="Load design"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Load Design</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
            >
              <Upload className="h-3 w-3" />
              Import JSON
            </button>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground/80"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sessionVersions.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setSessionOpen((v) => !v)}
                className="mb-2 flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <History className="h-3.5 w-3.5" />
                Session history
                {sessionOpen ? (
                  <ChevronDown className="ml-auto h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="ml-auto h-3.5 w-3.5" />
                )}
              </button>
              {sessionOpen && (
                <div className="space-y-1 rounded-md border border-border bg-muted/40 p-2">
                  {sessionVersions.map((v) => (
                    <button
                      key={v.version}
                      type="button"
                      onClick={() => {
                        restoreSessionVersion(v.version);
                        useSavedDesignsStore.getState().setActiveDesignId(null);
                        useAppStore
                          .getState()
                          .showToast(`Restored session version ${v.version}`, "success");
                        onClose();
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/80"
                    >
                      <span className="text-foreground/90">
                        {v.label ?? `Version ${v.version}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(v.savedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No saved designs yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Edits auto-save to session history. Use Ctrl+S for named versions.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {designs.map((design) => (
                <DesignRow
                  key={design.id}
                  design={design}
                  onLoad={() => handleLoad(design.id)}
                  onLoadVersion={(version) => handleLoad(design.id, version)}
                  onDelete={() => setPendingDelete(design)}
                  onExport={() => handleExport(design.id, design.name)}
                />
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </ModalShell>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete saved design?"
        message={`"${pendingDelete?.name ?? ""}" and all its versions will be permanently deleted.`}
        confirmText="Delete"
        danger
        onConfirm={() => {
          if (pendingDelete) deleteDesign(pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
