"use client";

import { useInterviewStore } from "@/store/interviewStore";
import {
  ClipboardList,
  Calculator,
  FileCode2,
  Database,
  LayoutDashboard,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { ModalShell } from "@/components/dialogs/ModalShell";

const PHASE_ICONS: Record<string, ReactNode> = {
  ClipboardList: <ClipboardList className="h-4 w-4" />,
  Calculator: <Calculator className="h-4 w-4" />,
  FileCode2: <FileCode2 className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
  Search: <Search className="h-4 w-4" />,
};

interface InterviewStartDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InterviewStartDialog({ open, onClose }: InterviewStartDialogProps) {
  const phases = useInterviewStore((s) => s.phases);
  const startInterview = useInterviewStore((s) => s.startInterview);

  const totalMinutes = phases.reduce((sum, p) => sum + p.targetMinutes, 0);

  const handleStart = () => {
    startInterview();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-md border-border p-6 shadow-xl"
      ariaLabel="Practice interview mode"
    >
        <h2 className="text-base font-semibold text-foreground">
          Practice Interview Mode
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Simulate a {totalMinutes}-minute system design interview with guided phases.
          A timer will track your progress through each phase.
        </p>

        {/* Phase timeline */}
        <div className="mt-4 space-y-2">
          {phases.map((phase, i) => (
            <div
              key={phase.name}
              className="flex items-center gap-3 rounded-md bg-muted px-3 py-2"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-foreground/80">
                {PHASE_ICONS[phase.icon] ?? <span className="text-xs">{i + 1}</span>}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{phase.name}</p>
                <p className="text-[10px] text-muted-foreground">{phase.description}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {phase.targetMinutes} min
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            I&apos;ll practice freely
          </button>
          <button
            onClick={handleStart}
            data-autofocus
            className="rounded-md bg-cyan-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-400"
          >
            Start Interview
          </button>
        </div>
    </ModalShell>
  );
}
