"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useSavedDesignsStore } from "@/store/savedDesignsStore";
import { useCustomProblemsStore } from "@/store/customProblemsStore";
import { PROBLEMS } from "@/data/problems";
import { ModalShell } from "./ModalShell";

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaveDialog({ open, onClose }: SaveDialogProps) {
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const saveDesign = useSavedDesignsStore((s) => s.saveDesign);
  const activeDesignId = useSavedDesignsStore((s) => s.activeDesignId);
  const activeDesign = useSavedDesignsStore((s) =>
    s.designs.find((d) => d.id === s.activeDesignId)
  );
  const customProblems = useCustomProblemsStore((s) => s.problems);
  const inputRef = useRef<HTMLInputElement>(null);

  const problemTitle =
    PROBLEMS.find((p) => p.id === selectedProblemId)?.title ??
    customProblems.find((p) => p.id === selectedProblemId)?.title ??
    "Design";
  const defaultName =
    activeDesign?.name ?? `${problemTitle} - ${new Date().toLocaleString()}`;

  const [name, setName] = useState(defaultName);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setName(activeDesign?.name ?? `${problemTitle} - ${new Date().toLocaleString()}`);
    setSaveAsNew(false);
    setPrevOpen(true);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (activeDesignId && !saveAsNew) {
      saveDesign(trimmed, { designId: activeDesignId });
    } else {
      useSavedDesignsStore.getState().setActiveDesignId(null);
      saveDesign(trimmed);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const nextVersion = activeDesign
    ? activeDesign.currentVersion + 1
    : 1;

  return (
    <ModalShell open={open} onClose={onClose} panelClassName="max-w-md p-6" ariaLabel="Save design">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Save Design</h2>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground/80"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {activeDesign && (
        <div className="mb-4 space-y-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Active design: <span className="font-medium text-foreground">{activeDesign.name}</span>
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground/80">
            <input
              type="radio"
              name="save-mode"
              checked={!saveAsNew}
              onChange={() => setSaveAsNew(false)}
              className="accent-cyan-500"
            />
            Save as version {nextVersion}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground/80">
            <input
              type="radio"
              name="save-mode"
              checked={saveAsNew}
              onChange={() => setSaveAsNew(true)}
              className="accent-cyan-500"
            />
            Save as new design
          </label>
        </div>
      )}

      <label className="mb-1.5 block text-xs text-muted-foreground">
        Design name
      </label>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        data-autofocus
        className="mb-4 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-cyan-500"
        placeholder="My awesome design..."
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-md bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {activeDesign && !saveAsNew ? `Save v${nextVersion}` : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}
