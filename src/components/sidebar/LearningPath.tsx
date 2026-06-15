"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, BookOpen, Layers } from "lucide-react";
import { DISTRIBUTED_SYSTEMS_BOOK } from "@/data/distributedSystemsTopics";
import { DistributedSystemsSection } from "./DistributedSystemsSection";
import { SystemDesignsSection } from "./SystemDesignsSection";

interface LearningPathProps {
  onProblemSelected?: () => void;
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  isExpanded,
  onToggle,
  accentClass,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  accentClass: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted"
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${accentClass}`}>{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

export function LearningPath({ onProblemSelected }: LearningPathProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["distributed-systems", "system-designs"]),
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const dsExpanded = expandedSections.has("distributed-systems");
  const sdExpanded = expandedSections.has("system-designs");

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        {/* Distributed Systems */}
        <div>
          <SectionHeader
            title="Distributed Systems"
            subtitle={`Based on ${DISTRIBUTED_SYSTEMS_BOOK.title} by ${DISTRIBUTED_SYSTEMS_BOOK.author}`}
            icon={BookOpen}
            isExpanded={dsExpanded}
            onToggle={() => toggleSection("distributed-systems")}
            accentClass="text-sky-400"
          />
          {dsExpanded && (
            <div className="mt-1 border-l border-border/50 pl-1">
              <DistributedSystemsSection onSimulationSelected={onProblemSelected} />
            </div>
          )}
        </div>

        <div className="border-t border-border/50" />

        {/* System Designs */}
        <div>
          <SectionHeader
            title="System Designs"
            subtitle="Practice end-to-end architectures by difficulty tier"
            icon={Layers}
            isExpanded={sdExpanded}
            onToggle={() => toggleSection("system-designs")}
            accentClass="text-emerald-400"
          />
          {sdExpanded && (
            <div className="mt-1 border-l border-border/50 pl-1">
              <SystemDesignsSection onProblemSelected={onProblemSelected} />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
