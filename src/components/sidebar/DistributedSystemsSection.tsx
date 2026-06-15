"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import {
  DISTRIBUTED_SYSTEMS_TOPICS,
  type DistributedSystemsTopic,
} from "@/data/distributedSystemsTopics";
import { getConceptSimulationForConcept } from "@/data/conceptSimulations";
import { openConceptTutorial } from "@/lib/loadConceptSimulation";
import { useLearnStore } from "@/store/learnStore";

const TOPIC_COLORS: Record<string, string> = {
  communication: "text-sky-400",
  coordination: "text-violet-400",
  scalability: "text-emerald-400",
  resiliency: "text-amber-400",
  "testing-operations": "text-rose-400",
};

interface DistributedSystemsSectionProps {
  onSimulationSelected?: () => void;
}

function TopicPanel({
  topic,
  isExpanded,
  onToggle,
  activeTutorialId,
  onOpenConcept,
}: {
  topic: DistributedSystemsTopic;
  isExpanded: boolean;
  onToggle: () => void;
  activeTutorialId: string | null;
  onOpenConcept: (tutorialId: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${TOPIC_COLORS[topic.id] ?? "text-foreground/80"}`}
            >
              {topic.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{topic.vitilloChapter}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{topic.description}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="ml-3 mt-1 space-y-1 pb-1">
          {topic.concepts.map((concept) => {
            const def = getConceptSimulationForConcept(topic.id, concept.id);
            const isSelected = def?.id === activeTutorialId;

            return (
              <button
                key={concept.id}
                type="button"
                disabled={!def}
                onClick={() => def && onOpenConcept(def.id)}
                className={`flex w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-sky-800/40 bg-sky-900/10"
                    : def
                      ? "border-transparent hover:border-border hover:bg-muted/50 cursor-pointer"
                      : "border-transparent opacity-80 cursor-default"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {def && (
                      <BookOpen
                        className={`h-3 w-3 shrink-0 ${isSelected ? "text-sky-400" : "text-muted-foreground"}`}
                      />
                    )}
                    <p
                      className={`text-xs font-medium ${isSelected ? "text-sky-400" : "text-foreground/90"}`}
                    >
                      {concept.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {concept.summary}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DistributedSystemsSection({ onSimulationSelected }: DistributedSystemsSectionProps) {
  const activeTutorialId = useLearnStore((s) => s.activeTutorialId);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(["communication"]));

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpen = (tutorialId: string) => {
    openConceptTutorial(tutorialId);
    onSimulationSelected?.();
  };

  return (
    <div className="space-y-1">
      {DISTRIBUTED_SYSTEMS_TOPICS.map((topic) => (
        <TopicPanel
          key={topic.id}
          topic={topic}
          isExpanded={expandedTopics.has(topic.id)}
          onToggle={() => toggleTopic(topic.id)}
          activeTutorialId={activeTutorialId}
          onOpenConcept={handleOpen}
        />
      ))}
    </div>
  );
}
