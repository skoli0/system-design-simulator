import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type GetBezierPathParams,
  type GetSmoothStepPathParams,
  type GetStraightPathParams,
} from "@xyflow/react";
import type { CustomEdgeData, EdgePathStyle } from "@/store/canvasStore";

export type EdgePathParams = GetStraightPathParams &
  Pick<GetBezierPathParams, "sourcePosition" | "targetPosition">;

const VALID_PATH_STYLES: EdgePathStyle[] = ["straight", "curved", "elbow"];

export function resolveEdgePathStyle(
  data: CustomEdgeData | undefined,
  defaultStyle: EdgePathStyle = "straight",
): EdgePathStyle {
  const style = data?.pathStyle;
  return style && VALID_PATH_STYLES.includes(style) ? style : defaultStyle;
}

export function buildEdgePath(
  params: EdgePathParams,
  pathStyle: EdgePathStyle,
): [path: string, labelX: number, labelY: number] {
  if (pathStyle === "curved") {
    const [path, labelX, labelY] = getBezierPath(params as GetBezierPathParams);
    return [path, labelX, labelY];
  }
  if (pathStyle === "elbow") {
    const [path, labelX, labelY] = getSmoothStepPath({
      ...(params as GetSmoothStepPathParams),
      borderRadius: 12,
    });
    return [path, labelX, labelY];
  }
  const [path, labelX, labelY] = getStraightPath(params);
  return [path, labelX, labelY];
}
