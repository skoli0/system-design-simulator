"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TRADEOFF_CARDS } from "@/data/tradeoffCards";

function scrollCardIntoView(element: HTMLElement) {
  const viewport = element.closest<HTMLElement>(
    '[data-slot="scroll-area-viewport"]'
  );
  if (!viewport) {
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const cardRect = element.getBoundingClientRect();

  if (cardRect.top < viewportRect.top) {
    viewport.scrollBy({
      top: cardRect.top - viewportRect.top,
      behavior: "smooth",
    });
    return;
  }

  const overflowBottom = cardRect.bottom - viewportRect.bottom;
  if (overflowBottom > 0 && cardRect.top - overflowBottom >= viewportRect.top) {
    viewport.scrollBy({ top: overflowBottom, behavior: "smooth" });
  }
}

export function TradeoffCards() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggle = (id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next !== null) {
        requestAnimationFrame(() => {
          const el = cardRefs.current[id];
          if (el) scrollCardIntoView(el);
        });
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Reference Cards
      </p>
      <div className="space-y-1.5">
        {TRADEOFF_CARDS.map((card) => {
          const isOpen = expandedId === card.id;
          return (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[card.id] = el;
              }}
              className="rounded-md border border-border bg-muted overflow-hidden [overflow-anchor:none]"
            >
              <button
                onClick={() => toggle(card.id)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-xs font-medium text-foreground/80">
                  {card.title}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                    onAnimationComplete={() => {
                      if (expandedId !== card.id) return;
                      const el = cardRefs.current[card.id];
                      if (el) scrollCardIntoView(el);
                    }}
                  >
                    <div className="border-t border-border px-2.5 py-2.5 space-y-3">
                  {/* Side-by-side options */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Option A */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-cyan-400">
                        {card.optionA.name}
                      </p>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">
                          Pros
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {card.optionA.pros.map((pro, i) => (
                            <li key={i} className="text-[11px] leading-tight text-muted-foreground">
                              + {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-rose-500">
                          Cons
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {card.optionA.cons.map((con, i) => (
                            <li key={i} className="text-[11px] leading-tight text-muted-foreground">
                              - {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Option B */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-purple-400">
                        {card.optionB.name}
                      </p>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">
                          Pros
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {card.optionB.pros.map((pro, i) => (
                            <li key={i} className="text-[11px] leading-tight text-muted-foreground">
                              + {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-rose-500">
                          Cons
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {card.optionB.cons.map((con, i) => (
                            <li key={i} className="text-[11px] leading-tight text-muted-foreground">
                              - {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* When to choose */}
                  <div className="space-y-1.5 border-t border-border pt-2">
                    <div>
                      <p className="text-[10px] font-medium text-cyan-500">
                        Choose {card.optionA.name} when:
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {card.whenToChooseA}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-purple-500">
                        Choose {card.optionB.name} when:
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {card.whenToChooseB}
                      </p>
                    </div>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
