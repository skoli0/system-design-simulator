"use client";

import { Plus, X } from "lucide-react";
import { useCanvasStore, isEditableDesignTab } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";

export function CanvasTabBar() {
  const tabs = useCanvasStore((s) => s.tabs);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const switchTab = useCanvasStore((s) => s.switchTab);
  const closeTab = useCanvasStore((s) => s.closeTab);
  const createNewDesignTab = useCanvasStore((s) => s.createNewDesignTab);
  const showToast = useAppStore((s) => s.showToast);

  const editableTabs = tabs.filter((t) => isEditableDesignTab(t));
  const canCloseTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return false;
    if (tab.readOnly) return true;
    return editableTabs.length > 1;
  };

  const handleNewDesign = () => {
    createNewDesignTab();
    showToast("New design canvas created", "success");
  };

  return (
    <div className="flex h-8 shrink-0 min-w-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="button"
          tabIndex={0}
          onClick={() => switchTab(tab.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              switchTab(tab.id);
            }
          }}
          className={`group flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] transition-colors ${
            tab.id === activeTabId
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className="truncate max-w-[140px]">{tab.label}</span>
          {tab.readOnly && (
            <span className="rounded bg-cyan-500/10 px-1 py-0.5 text-[8px] font-medium text-cyan-400">
              REF
            </span>
          )}
          {canCloseTab(tab.id) && (
            <button
              type="button"
              tabIndex={0}
              aria-label={`Close ${tab.label} tab`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
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
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleNewDesign}
        className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="New design canvas"
        aria-label="New design canvas"
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
  );
}
