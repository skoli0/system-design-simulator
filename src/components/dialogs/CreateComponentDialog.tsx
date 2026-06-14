"use client";

import { useState } from "react";
import { X, Server } from "lucide-react";
import { useCustomComponentsStore } from "@/store/customComponentsStore";
import { useAppStore } from "@/store/appStore";
import { COMPONENT_CATEGORIES } from "@/data/components";
import { ICON_MAP, ICON_PICKER_OPTIONS } from "@/lib/icons";
import type { ComponentCategory } from "@/types/component";
import { ModalShell } from "./ModalShell";

interface CreateComponentDialogProps {
  open: boolean;
  onClose: () => void;
}

const ICON_OPTIONS = ICON_PICKER_OPTIONS;

export function CreateComponentDialog({ open, onClose }: CreateComponentDialogProps) {
  const addComponent = useCustomComponentsStore((s) => s.addComponent);
  const showToast = useAppStore((s) => s.showToast);

  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<ComponentCategory>("compute");
  const [icon, setIcon] = useState<string>("Box");
  const [maxQPS, setMaxQPS] = useState(5000);
  const [latencyMs, setLatencyMs] = useState(20);
  const [scalable, setScalable] = useState(true);
  const [stateful, setStateful] = useState(false);
  const [description, setDescription] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset the form when the dialog opens (render-time adjustment — focus is
  // handled by ModalShell via data-autofocus)
  if (open && !prevOpen) {
    setPrevOpen(true);
    setLabel("");
    setCategory("compute");
    setIcon("Box");
    setMaxQPS(5000);
    setLatencyMs(20);
    setScalable(true);
    setStateful(false);
    setDescription("");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const handleCreate = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    addComponent({
      label: trimmedLabel,
      category,
      icon,
      maxQPS: Number.isFinite(maxQPS) && maxQPS > 0 ? maxQPS : 1000,
      latencyMs: Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : 0,
      scalable,
      stateful,
      description: description.trim(),
    });

    showToast(`Custom component "${trimmedLabel}" created`, "success");
    onClose();
  };

  const inputClass =
    "w-full rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-cyan-500";

  const SelectedIcon = ICON_MAP[icon] ?? Server;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg p-5"
      ariaLabel="Create custom component"
    >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Create Custom Component</h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Label */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Label *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              data-autofocus
              className={inputClass}
              placeholder="e.g. Vector Database"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <div className="grid grid-cols-5 gap-1">
              {COMPONENT_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key as ComponentCategory)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    category === c.key
                      ? "border border-cyan-500/30 bg-cyan-600/20 text-cyan-400"
                      : "border border-border bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Icon</label>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                <SelectedIcon className="h-4 w-4 text-cyan-400" />
              </div>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className={inputClass}
              >
                {ICON_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Capacity & Latency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[11px] text-muted-foreground">Max QPS</label>
              <input
                type="number"
                min={1}
                value={maxQPS}
                onChange={(e) => setMaxQPS(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] text-muted-foreground">Latency (ms)</label>
              <input
                type="number"
                min={0}
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={scalable}
                onChange={(e) => setScalable(e.target.checked)}
                className="h-3.5 w-3.5 accent-cyan-500"
              />
              Scalable (can add replicas)
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={stateful}
                onChange={(e) => setStateful(e.target.checked)}
                className="h-3.5 w-3.5 accent-cyan-500"
              />
              Stateful
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="What does this component do? When should it be used?"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!label.trim()}
            className="rounded-md bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create Component
          </button>
        </div>
    </ModalShell>
  );
}
