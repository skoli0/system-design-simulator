"use client";

import { Server } from "lucide-react";
import { CATEGORY_CHIP_STYLES, ICON_MAP } from "@/lib/icons";

interface ArchNodeProps {
  icon: string;
  category: string;
  label: string;
  sublabel?: string;
  compact?: boolean;
}

export function ArchNode({ icon, category, label, sublabel, compact = false }: ArchNodeProps) {
  const Icon = ICON_MAP[icon] ?? Server;
  const colors = CATEGORY_CHIP_STYLES[category] ?? CATEGORY_CHIP_STYLES.compute;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 shadow-sm ring-1 ${colors.ring}`}
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors.chip}`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-tight text-foreground">{label}</p>
          {sublabel && (
            <p className="truncate text-[10px] text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-[92px] max-w-[120px] flex-col items-center rounded-xl border border-border/70 bg-background px-3 py-3 shadow-sm ring-1 ${colors.ring}`}
    >
      <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-lg ${colors.chip}`}>
        <Icon className={`h-5 w-5 ${colors.icon}`} />
      </div>
      <p className="text-center text-xs font-semibold leading-snug text-foreground">{label}</p>
      {sublabel && (
        <p className="mt-1 max-w-full truncate text-center text-[10px] text-muted-foreground">
          {sublabel}
        </p>
      )}
    </div>
  );
}
