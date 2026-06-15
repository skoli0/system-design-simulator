"use client";

import { useMemo } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { getConceptSimulation, getConceptSimulationForConcept } from "@/data/conceptSimulations";
import {
  DISTRIBUTED_SYSTEMS_TOPICS,
  getAdjacentConcepts,
  getLearningConcept,
} from "@/data/distributedSystemsTopics";
import {
  extractArchitecture,
  simplifyArchitecture,
} from "@/lib/conceptTutorial/extractArchitecture";
import { openConceptTutorial } from "@/lib/loadConceptSimulation";
import { useLearnStore } from "@/store/learnStore";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ScrollArea } from "@/components/ui/scroll-area";

const TOPIC_COLORS: Record<string, string> = {
  communication: "text-sky-600",
  coordination: "text-violet-600",
  scalability: "text-emerald-600",
  resiliency: "text-amber-600",
  "testing-operations": "text-rose-600",
};

interface ConceptTutorialViewProps {
  tutorialId: string;
}

export function ConceptTutorialView({ tutorialId }: ConceptTutorialViewProps) {
  const closeTutorial = useLearnStore((s) => s.closeTutorial);

  const definition = getConceptSimulation(tutorialId);
  const concept = definition
    ? getLearningConcept(definition.topicId, definition.conceptId)
    : undefined;
  const topic = DISTRIBUTED_SYSTEMS_TOPICS.find((t) => t.id === definition?.topicId);
  const { prev, next } = definition
    ? getAdjacentConcepts(definition.topicId, definition.conceptId)
    : { prev: null, next: null };

  const architecture = useMemo(() => {
    if (!definition) return null;
    const { nodes, edges } = definition.build();
    return simplifyArchitecture(extractArchitecture(nodes, edges));
  }, [definition]);

  const deepDiveSections = useMemo(() => {
    if (!definition) return [];
    const rest = definition.steps.filter((s) => s.id !== "overview");
    return rest.length > 0 ? rest : definition.steps;
  }, [definition]);

  if (!definition || !architecture) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        Tutorial not found.
      </div>
    );
  }

  const openAdjacent = (conceptId: string) => {
    const sim = getConceptSimulationForConcept(definition.topicId, conceptId);
    if (sim) openConceptTutorial(sim.id);
  };

  const overviewText = concept?.summary ?? definition.description;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border/60 bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={closeTutorial}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={closeTutorial}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <header className="mb-10">
            <p
              className={`mb-2 text-xs font-medium uppercase tracking-widest ${TOPIC_COLORS[definition.topicId] ?? "text-muted-foreground"}`}
            >
              {topic?.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {definition.title}
            </h1>
          </header>

          {architecture.layers.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Architecture
              </h2>
              <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-6">
                <ArchitectureDiagram architecture={architecture} />
              </div>
            </section>
          )}

          <section className="mb-12">
            <p className="text-base leading-[1.75] text-foreground/90">{overviewText}</p>
          </section>

          {deepDiveSections.length > 0 && (
            <section className="space-y-10 border-t border-border/60 pt-12">
              <h2 className="text-lg font-semibold text-foreground">How it works</h2>
              {deepDiveSections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-3 text-base font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <p className="text-base leading-[1.75] text-foreground/85">
                    {section.description}
                  </p>
                </div>
              ))}
            </section>
          )}

          <nav className="mt-16 flex items-center justify-between gap-4 border-t border-border/60 pt-8">
            {prev ? (
              <button
                type="button"
                onClick={() => openAdjacent(prev.id)}
                className="group flex max-w-[45%] items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{prev.title}</span>
              </button>
            ) : (
              <div />
            )}
            {next ? (
              <button
                type="button"
                onClick={() => openAdjacent(next.id)}
                className="group flex max-w-[45%] items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="truncate">{next.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <div />
            )}
          </nav>
        </article>
      </ScrollArea>
    </div>
  );
}
