import type { Node, Edge } from "@xyflow/react";
import { getComponentById } from "@/data/components";
import type { ComponentNodeData } from "@/store/canvasStore";
import { ROW } from "@/lib/conceptSimulations/tutorialLayout";
import { resolveLucideIconName } from "@/lib/icons";
import { normalizeArchNode } from "./archRoles";

export interface TutorialComponent {
  id: string;
  componentId: string;
  /** Lucide icon name — same as canvas component palette. */
  icon: string;
  category: string;
  /** Standard architecture role label (Client, Database, …). */
  label: string;
  /** Specific instance name when it adds context (Order Service, …). */
  sublabel?: string;
  x: number;
  y: number;
}

export interface TutorialLayer {
  label?: string;
  components: TutorialComponent[];
}

export interface TutorialConnection {
  id: string;
  source: string;
  target: string;
  label: string;
  protocol?: string;
  async?: boolean;
  bidirectional?: boolean;
}

export interface TutorialArchitecture {
  layers: TutorialLayer[];
  connections: TutorialConnection[];
  components: TutorialComponent[];
}

const LAYER_HEIGHT = ROW.h;

function rowKey(y: number): number {
  return Math.round(y / LAYER_HEIGHT);
}

function findLayerLabel(nodes: Node[], rowY: number): string | undefined {
  const candidates = nodes.filter((n) => n.type === "text");
  const match = candidates.find((n) => {
    const text = String((n.data as { text?: string }).text ?? "");
    const y = n.position.y;
    return text.length > 2 && y >= rowY - 55 && y < rowY + 15;
  });
  return match ? String((match.data as { text: string }).text) : undefined;
}

export function extractArchitecture(nodes: Node[], edges: Edge[]): TutorialArchitecture {
  const rawComponents = nodes
    .filter((n) => n.type === "component")
    .map((n) => {
      const data = n.data as ComponentNodeData;
      const catalog = getComponentById(data.componentId);
      const rawLabel = data.label || catalog?.label || data.componentId;
      const { displayLabel, sublabel } = normalizeArchNode(data.componentId, rawLabel);
      return {
        id: n.id,
        componentId: data.componentId,
        icon: resolveLucideIconName(data.componentId, data.icon ?? catalog?.icon),
        category: data.category ?? catalog?.category ?? "compute",
        label: displayLabel,
        sublabel,
        x: n.position.x,
        y: n.position.y,
      };
    });

  const rowMap = new Map<number, typeof rawComponents>();
  for (const c of rawComponents) {
    const ri = rowKey(c.y);
    if (!rowMap.has(ri)) rowMap.set(ri, []);
    rowMap.get(ri)!.push(c);
  }

  const layers: TutorialLayer[] = [...rowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ri, comps]) => ({
      label: findLayerLabel(nodes, ri * LAYER_HEIGHT),
      components: comps.sort((a, b) => a.x - b.x || a.y - b.y),
    }));

  const componentIds = new Set(rawComponents.map((c) => c.id));
  const connections: TutorialConnection[] = edges
    .filter((e) => componentIds.has(e.source) && componentIds.has(e.target))
    .map((e) => {
      const data = (e.data ?? {}) as {
        label?: string;
        protocol?: string;
        async?: boolean;
        bidirectional?: boolean;
      };
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: data.label ?? "",
        protocol: data.protocol,
        async: data.async,
        bidirectional: data.bidirectional,
      };
    });

  const components = layers.flatMap((l) => l.components);

  return { layers, connections, components };
}

/** Drop empty layers; keep every labeled section so multi-path tutorials stay readable. */
export function simplifyArchitecture(arch: TutorialArchitecture): TutorialArchitecture {
  const layers = arch.layers.filter((l) => l.components.length > 0);
  const ids = new Set(layers.flatMap((l) => l.components.map((c) => c.id)));
  const connections = arch.connections.filter(
    (c) => ids.has(c.source) && ids.has(c.target),
  );
  const components = layers.flatMap((l) => l.components);

  return { layers, connections, components };
}
