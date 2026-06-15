"use client";

import { ArrowLeftRight, ArrowRight, GitBranch } from "lucide-react";
import type {
  TutorialArchitecture,
  TutorialComponent,
  TutorialConnection,
  TutorialLayer,
} from "@/lib/conceptTutorial/extractArchitecture";
import { ArchNode } from "./ArchNode";

interface ArchitectureDiagramProps {
  architecture: TutorialArchitecture;
}

const PROTOCOL_STYLES: Record<string, { pill: string; dot: string }> = {
  http: { pill: "bg-sky-500/12 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  grpc: { pill: "bg-violet-500/12 text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  tcp: { pill: "bg-slate-500/12 text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
  pubsub: { pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  websocket: { pill: "bg-amber-500/12 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" },
};

const COLUMN_GAP = 100;

function groupByColumn(components: TutorialComponent[]): TutorialComponent[][] {
  const sorted = [...components].sort((a, b) => a.x - b.x || a.y - b.y);
  const groups: TutorialComponent[][] = [];
  for (const comp of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(comp.x - last[0].x) < COLUMN_GAP) {
      last.push(comp);
    } else {
      groups.push([comp]);
    }
  }
  return groups;
}

function findConnection(
  connections: TutorialConnection[],
  sourceId: string,
  targetIds: string[],
): TutorialConnection | undefined {
  return connections.find((c) => c.source === sourceId && targetIds.includes(c.target));
}

function EdgeConnector({ connection }: { connection: TutorialConnection }) {
  const protocol = connection.protocol ?? "http";
  const style = PROTOCOL_STYLES[protocol] ?? PROTOCOL_STYLES.http;
  const Arrow = connection.bidirectional ? ArrowLeftRight : ArrowRight;

  return (
    <div className="flex min-w-[56px] max-w-[96px] flex-col items-center gap-1 px-0.5">
      <Arrow
        className={`h-4 w-4 shrink-0 ${connection.async ? "text-emerald-500/70" : "text-muted-foreground/70"}`}
        strokeDasharray={connection.async ? "4 3" : undefined}
      />
      {connection.label && (
        <span className="text-center text-[10px] font-medium leading-tight text-foreground/80">
          {connection.label}
        </span>
      )}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.pill}`}
      >
        {protocol}
        {connection.async ? " · async" : ""}
      </span>
    </div>
  );
}

function FlowLayer({
  layer,
  layerIdx,
  connections,
}: {
  layer: TutorialLayer;
  layerIdx: number;
  connections: TutorialConnection[];
}) {
  const compIds = new Set(layer.components.map((c) => c.id));
  const layerConnections = connections.filter(
    (c) => compIds.has(c.source) && compIds.has(c.target),
  );
  const columns = groupByColumn(layer.components);
  const usedConnectionIds = new Set<string>();

  const branchTargets = new Set<string>();
  for (const col of columns) {
    if (col.length <= 1) continue;
    for (let i = 1; i < col.length; i++) branchTargets.add(col[i].id);
  }

  const spineColumns = columns.map((col) =>
    col.filter((c) => !branchTargets.has(c.id) || col.length === 1),
  );

  const extraBranches = columns
    .filter((col) => col.length > 1)
    .flatMap((col) => {
      const primary = col.find((c) => !branchTargets.has(c.id)) ?? col[0];
      return col
        .filter((c) => c.id !== primary.id)
        .map((branch) => {
          const connection = layerConnections.find(
            (c) => c.source === primary.id && c.target === branch.id,
          );
          if (connection) usedConnectionIds.add(connection.id);
          return { from: primary, branch, connection };
        });
    });

  // Parallel fan-out: one source → multiple targets in later columns
  const parallelFanOut = layer.components.flatMap((source) => {
    const outgoing = layerConnections.filter((c) => c.source === source.id);
    if (outgoing.length < 2) return [];
    const targets = outgoing
      .map((c) => layer.components.find((x) => x.id === c.target))
      .filter((t): t is TutorialComponent => !!t);
    if (targets.length < 2) return [];
    const onSpine = targets.filter((t) => spineColumns.some((col) => col.some((c) => c.id === t.id)));
    if (onSpine.length < 2) return [];
    return outgoing
      .slice(1)
      .map((connection) => {
        usedConnectionIds.add(connection.id);
        const branch = layer.components.find((c) => c.id === connection.target);
        if (!branch) return null;
        return { from: source, branch, connection };
      })
      .filter((x): x is { from: TutorialComponent; branch: TutorialComponent; connection: TutorialConnection } => !!x);
  });

  const allBranches = [...extraBranches, ...parallelFanOut];

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-sm">
      {layer.label && (
        <div className="border-b border-border/50 bg-muted/40 px-4 py-2.5">
          <p className="text-xs font-semibold leading-snug text-foreground">{layer.label}</p>
        </div>
      )}
      {!layer.label && layer.components.length > 1 && (
        <div className="border-b border-border/50 bg-muted/30 px-4 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Path {layerIdx + 1}
          </p>
        </div>
      )}

      <div className="px-3 py-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-center gap-y-4">
          {spineColumns.map((col, colIdx) => {
            const nextCol = spineColumns[colIdx + 1];
            const nextIds = nextCol?.map((c) => c.id) ?? [];
            const spineSource = col[col.length - 1];
            const connection =
              nextCol &&
              findConnection(layerConnections, spineSource.id, nextIds);
            if (connection) usedConnectionIds.add(connection.id);

            return (
              <div key={`${layerIdx}-${colIdx}`} className="flex items-center gap-1.5">
                <div className="flex flex-col items-center gap-2">
                  {col.map((comp) => (
                    <ArchNode
                      key={comp.id}
                      icon={comp.icon}
                      category={comp.category}
                      label={comp.label}
                      sublabel={comp.sublabel}
                    />
                  ))}
                </div>
                {connection && <EdgeConnector connection={connection} />}
              </div>
            );
          })}
        </div>

        {allBranches.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-dashed border-border/50 pt-4">
            <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              Parallel paths
            </p>
            <div className="flex flex-wrap items-start justify-center gap-4">
              {allBranches.map(({ from, branch, connection }) => (
                <div
                  key={`${from.id}-${branch.id}-${connection?.id ?? ""}`}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
                >
                  <span className="max-w-[80px] text-center text-[10px] font-medium text-muted-foreground">
                    {from.label}
                  </span>
                  {connection ? (
                    <EdgeConnector connection={connection} />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                  <ArchNode
                    icon={branch.icon}
                    category={branch.category}
                    label={branch.label}
                    sublabel={branch.sublabel}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {(() => {
          const remaining = layerConnections.filter((c) => !usedConnectionIds.has(c.id));
          if (remaining.length === 0) return null;
          return (
            <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-border/30 pt-3">
              {remaining.map((c) => {
                const src = layer.components.find((x) => x.id === c.source);
                const tgt = layer.components.find((x) => x.id === c.target);
                if (!src || !tgt) return null;
                return (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground"
                  >
                    <span className="font-medium text-foreground/80">{src.label}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-foreground/80">{tgt.label}</span>
                    {c.label && <span className="text-muted-foreground">· {c.label}</span>}
                  </span>
                );
              })}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

export function ArchitectureDiagram({ architecture }: ArchitectureDiagramProps) {
  const { layers, connections } = architecture;

  if (layers.length === 0) return null;

  const usedProtocols = [
    ...new Set(connections.map((c) => c.protocol).filter(Boolean)),
  ] as string[];

  return (
    <div className="space-y-4">
      {layers.map((layer, layerIdx) => (
        <FlowLayer
          key={layerIdx}
          layer={layer}
          layerIdx={layerIdx}
          connections={connections}
        />
      ))}

      {usedProtocols.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Protocols
          </span>
          {usedProtocols.map((protocol) => {
            const style = PROTOCOL_STYLES[protocol] ?? PROTOCOL_STYLES.http;
            return (
              <span
                key={protocol}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                {protocol.toUpperCase()}
              </span>
            );
          })}
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-px w-4 border-t border-dashed border-emerald-500/70" />
            async
          </span>
        </div>
      )}
    </div>
  );
}
