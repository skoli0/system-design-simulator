"use client";

import type { EdgePathStyle } from "@/store/canvasStore";

const OPTIONS: { value: EdgePathStyle; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "curved", label: "Curved" },
  { value: "elbow", label: "Elbow" },
];

interface EdgePathStylePickerProps {
  value: EdgePathStyle;
  onChange: (style: EdgePathStyle) => void;
  compact?: boolean;
}

export function EdgePathStylePicker({
  value,
  onChange,
  compact = false,
}: EdgePathStylePickerProps) {
  return (
    <div
      className={`relative z-10 flex items-center gap-0.5 rounded-full border border-border bg-card shadow-lg backdrop-blur ${
        compact ? "p-0.5" : "p-1"
      }`}
      role="group"
      aria-label="Line style"
    >
      {!compact && (
        <span className="pl-2 pr-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          Line
        </span>
      )}
      {OPTIONS.map(({ value: option, label }) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full font-medium transition-colors ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          } ${
            value === option
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
