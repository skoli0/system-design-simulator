"use client";

import { Coffee } from "lucide-react";

interface SupportFABProps {
  onClick: () => void;
  /** Hide the FAB (e.g. while a mobile drawer/sheet is open). */
  hidden?: boolean;
}

/**
 * Circular "Buy me a coffee" floating action button.
 * Small disc (~56px) tucked into the bottom-right corner on all breakpoints.
 * Label arches along the bottom; Coffee icon sits in the middle.
 */
export function SupportFAB({ onClick, hidden = false }: SupportFABProps) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 text-background shadow-lg shadow-cyan-500/30 ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 hover:scale-[1.05] active:translate-y-0 md:bottom-20"
      title="Buy me a coffee — support the project"
      aria-label="Buy me a coffee"
    >
      {/* Arched label — bottom arc */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <path
            id="support-fab-arc-bottom"
            d="M 16,50 A 34,34 0 0,1 84,50"
            fill="none"
          />
        </defs>
        <text
          style={{
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.04em",
            fill: "#09090b",
            stroke: "#09090b",
            strokeWidth: "0.9",
            paintOrder: "stroke fill",
          }}
        >
          <textPath
            href="#support-fab-arc-bottom"
            startOffset="50%"
            textAnchor="middle"
          >
            BUY ME A COFFEE
          </textPath>
        </text>
      </svg>

      {/* Centered Coffee icon */}
      <Coffee
        className="relative z-10 h-4 w-4 transition-transform group-hover:-rotate-6 group-hover:scale-110"
        strokeWidth={2.75}
      />
    </button>
  );
}
