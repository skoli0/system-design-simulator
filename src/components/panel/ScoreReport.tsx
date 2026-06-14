"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { runScoreForDesign } from "@/lib/scoreCanvas";
import { isEditableDesignTab } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import type { CategoryScore, ScoreSuggestion } from "@/types/scoring";
import {
  executeScoreSuggestion,
  getSuggestionsForCategory,
  getSuggestionsForFeedback,
} from "@/scoring/scoreActions";

function SuggestionButtons({
  suggestions,
  onRescore,
}: {
  suggestions: ScoreSuggestion[];
  onRescore: () => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 pl-4">
      {suggestions.map((s) => (
        <Button
          key={s.id}
          size="sm"
          variant="outline"
          onClick={() => executeScoreSuggestion(s, onRescore)}
          className="h-6 gap-1 border-cyan-500/30 px-2 text-[10px] text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
        >
          <Sparkles className="h-2.5 w-2.5" />
          {s.label}
        </Button>
      ))}
    </div>
  );
}

function CategorySection({
  category,
  onRescore,
}: {
  category: CategoryScore;
  onRescore: () => void;
}) {
  const [expanded, setExpanded] = useState(category.score < category.maxScore);
  const pct = (category.score / category.maxScore) * 100;

  const barColor =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";

  const categoryActions = useMemo(
    () => getSuggestionsForCategory(category.category, category.feedback),
    [category.category, category.feedback]
  );

  return (
    <div className="rounded-md bg-muted px-3 py-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground/80">
            {category.category}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {category.score}/{category.maxScore}
        </span>
      </button>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {category.passed.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
          {category.feedback.map((item, i) => {
            const actions = getSuggestionsForFeedback(item);
            return (
              <div key={i}>
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
                <SuggestionButtons suggestions={actions} onRescore={onRescore} />
              </div>
            );
          })}

          {category.score < category.maxScore && categoryActions.length > 0 && (
            <div className="mt-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Quick fixes (+{category.maxScore - category.score} pts possible)
              </p>
              <SuggestionButtons suggestions={categoryActions} onRescore={onRescore} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VERDICT_BORDER: Record<string, string> = {
  "text-emerald-400": "border-emerald-400/30",
  "text-cyan-400": "border-cyan-400/30",
  "text-blue-400": "border-blue-400/30",
  "text-amber-400": "border-amber-400/30",
  "text-rose-400": "border-rose-400/30",
  "text-muted-foreground": "border-muted-foreground/30",
};

const VERDICT_BG: Record<string, string> = {
  "text-emerald-400": "bg-emerald-400/5",
  "text-cyan-400": "bg-cyan-400/5",
  "text-blue-400": "bg-blue-400/5",
  "text-amber-400": "bg-amber-400/5",
  "text-rose-400": "bg-rose-400/5",
  "text-muted-foreground": "bg-muted-foreground/5",
};

function verdictBorderClass(verdictColor: string): string {
  return VERDICT_BORDER[verdictColor] ?? "border-muted-foreground/30";
}

function verdictBgClass(verdictColor: string): string {
  return VERDICT_BG[verdictColor] ?? "bg-muted-foreground/5";
}

export function ScoreReport() {
  const scoreResult = useSimulationStore((s) => s.scoreResult);
  const setScoreResult = useSimulationStore((s) => s.setScoreResult);
  const setShowScore = useSimulationStore((s) => s.setShowScore);
  const activeRightTab = useAppStore((s) => s.activeRightTab);
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const tabs = useCanvasStore((s) => s.tabs);
  const activeNodes = useCanvasStore((s) => s.nodes);
  const activeEdges = useCanvasStore((s) => s.edges);
  const designComponentCount = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId && isEditableDesignTab(t));
    if (!tab) return 0;
    const tabNodes = activeTabId === tab.id ? activeNodes : (tab.nodes ?? []);
    return tabNodes.filter((n) => n.type !== "text").length;
  }, [tabs, activeTabId, activeNodes]);
  const designEdgeCount = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId && isEditableDesignTab(t));
    if (!tab) return 0;
    return activeTabId === tab.id ? activeEdges.length : (tab.edges?.length ?? 0);
  }, [tabs, activeTabId, activeEdges]);

  // Auto-score when the Score tab is open (covers example problems + reference tabs).
  useEffect(() => {
    if (activeRightTab !== "score") return;
    const result = runScoreForDesign();
    if (result) {
      setScoreResult(result);
      setShowScore(true);
    }
  }, [
    activeRightTab,
    selectedProblemId,
    activeTabId,
    activeNodes.length,
    activeEdges.length,
    designComponentCount,
    designEdgeCount,
    tabs,
    setScoreResult,
    setShowScore,
  ]);

  const rescore = useCallback(() => {
    const result = runScoreForDesign();
    if (result) setScoreResult(result);
  }, [setScoreResult]);

  const topActions = useMemo(() => {
    if (!scoreResult || scoreResult.total >= 100) return [];
    const seen = new Set<string>();
    const actions: ScoreSuggestion[] = [];
    for (const cat of scoreResult.categories) {
      if (cat.score >= cat.maxScore) continue;
      for (const s of getSuggestionsForCategory(cat.category, cat.feedback)) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        actions.push(s);
        if (actions.length >= 6) return actions;
      }
    }
    return actions;
  }, [scoreResult]);

  if (!scoreResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/80">Ready to evaluate</p>
          <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
            Open the Score tab after adding components to a design, or pick an
            example problem to score its reference architecture.
          </p>
        </div>
      </div>
    );
  }

  const topImprovements = scoreResult.categories
    .flatMap((c) => c.feedback)
    .slice(0, 3);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Overall score */}
        <div className="flex flex-col items-center gap-2 py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative flex items-center justify-center"
          >
            {(() => {
              const radius = 38;
              const circumference = 2 * Math.PI * radius;
              const progress = (scoreResult.total / 100) * circumference;
              const strokeColor =
                scoreResult.total >= 71
                  ? "#10b981"
                  : scoreResult.total >= 51
                    ? "#22d3ee"
                    : scoreResult.total >= 31
                      ? "#f59e0b"
                      : "#ef4444";
              return (
                <svg width="96" height="96" className="-rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="rgb(39,39,42)"
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
              );
            })()}
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-3xl font-bold text-foreground">
                {scoreResult.total}
              </span>
              <span className="text-[11px] text-muted-foreground">/ 100</span>
            </div>
          </motion.div>

          <Badge
            variant="outline"
            className={`${scoreResult.verdictColor} ${verdictBorderClass(scoreResult.verdictColor)} ${verdictBgClass(scoreResult.verdictColor)} px-3 py-0.5 text-xs font-semibold`}
          >
            {scoreResult.verdict}
          </Badge>

          <p className="text-center text-xs text-muted-foreground">
            {scoreResult.summary}
          </p>
        </div>

        {scoreResult.total < 100 && topActions.length > 0 && (
          <>
            <Separator className="bg-muted" />
            <div className="space-y-2 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Path to 100
              </p>
              <p className="text-[11px] text-muted-foreground">
                Click a fix to load the reference into your design, add missing
                components, and update your score automatically.
              </p>
              <SuggestionButtons suggestions={topActions} onRescore={rescore} />
            </div>
          </>
        )}

        <Separator className="bg-muted" />

        {/* Category breakdowns */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
          {scoreResult.categories.map((cat) => (
            <CategorySection key={cat.category} category={cat} onRescore={rescore} />
          ))}
        </div>

        {/* Top improvements */}
        {topImprovements.length > 0 && (
          <>
            <Separator className="bg-muted" />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Improvements
              </p>
              {topImprovements.map((item, i) => {
                const actions = getSuggestionsForFeedback(item);
                return (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-muted px-2.5 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-foreground/80">
                        {i + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                    <SuggestionButtons suggestions={actions} onRescore={rescore} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
