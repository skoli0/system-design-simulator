import type { CustomEdgeData, EdgePathStyle } from "@/store/canvasStore";

const REQ_RESP_SERVICES = new Set(["dns", "cdn"]);

/** Client ↔ DNS/CDN hops return data to the user (query/answer, asset response). */
export function isRequestResponseEdge(
  sourceComponentId: string,
  targetComponentId: string,
): boolean {
  const a = sourceComponentId;
  const b = targetComponentId;
  if (a !== "client" && b !== "client") return false;
  const other = a === "client" ? b : a;
  return REQ_RESP_SERVICES.has(other);
}

export function edgeDataForComponents(
  sourceComponentId: string,
  targetComponentId: string,
  pathStyle?: EdgePathStyle,
  overrides?: Partial<CustomEdgeData>,
): CustomEdgeData {
  const bidirectional = isRequestResponseEdge(sourceComponentId, targetComponentId);
  return {
    label: "",
    protocol: "http",
    async: false,
    bidirectional,
    ...(pathStyle ? { pathStyle } : {}),
    ...overrides,
  };
}
