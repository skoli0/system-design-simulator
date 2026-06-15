"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCanvasStore, type CanvasTab } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";

function CanvasTabItem({
  tab,
  isActive,
  onSwitch,
  onClose,
  onRename,
}: {
  tab: CanvasTab;
  isActive: boolean;
  onSwitch: () => void;
  onClose: () => void;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(tab.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const canRename = !tab.readOnly;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) setEditLabel(tab.label);
  }, [tab.label, editing]);

  const commitLabel = useCallback(() => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== tab.label) {
      onRename(trimmed);
    } else {
      setEditLabel(tab.label);
    }
    setEditing(false);
  }, [editLabel, tab.label, onRename]);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      if (!canRename) return;
      e.stopPropagation();
      setEditLabel(tab.label);
      setEditing(true);
    },
    [canRename, tab.label],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editing) onSwitch();
      }}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSwitch();
        }
      }}
      className={`group flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] transition-colors ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setEditLabel(tab.label);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Rename ${tab.label}`}
          className="max-w-[140px] bg-transparent text-[11px] text-foreground outline-none border-b border-cyan-500"
        />
      ) : (
        <span
          className={`truncate max-w-[140px] ${canRename ? "cursor-text" : ""}`}
          onDoubleClick={startEditing}
          title={canRename ? "Double-click to rename" : undefined}
        >
          {tab.label}
        </span>
      )}
      {tab.readOnly && (
        <span className="rounded bg-cyan-500/10 px-1 py-0.5 text-[8px] font-medium text-cyan-400">
          REF
        </span>
      )}
      <button
        type="button"
        tabIndex={0}
        aria-label={`Close ${tab.label} tab`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        className={`ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded opacity-60 transition-opacity hover:bg-accent focus-visible:opacity-100 group-focus-within:opacity-100 ${
          tab.readOnly
            ? "opacity-80"
            : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        }`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

export function CanvasTabBar() {
  const tabs = useCanvasStore((s) => s.tabs);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const switchTab = useCanvasStore((s) => s.switchTab);
  const closeTab = useCanvasStore((s) => s.closeTab);
  const renameTab = useCanvasStore((s) => s.renameTab);
  const createNewDesignTab = useCanvasStore((s) => s.createNewDesignTab);
  const showToast = useAppStore((s) => s.showToast);

  const handleNewDesign = () => {
    createNewDesignTab();
    showToast("New design canvas created", "success");
  };

  return (
    <div className="flex h-8 shrink-0 min-w-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-2">
      {tabs.map((tab) => (
        <CanvasTabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSwitch={() => switchTab(tab.id)}
          onClose={() => closeTab(tab.id)}
          onRename={(label) => renameTab(tab.id, label)}
        />
      ))}

      <button
        type="button"
        onClick={handleNewDesign}
        className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Build an architecture that scales"
        aria-label="New design — build an architecture that scales"
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
  );
}
