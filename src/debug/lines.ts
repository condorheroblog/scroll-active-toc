import type { Direction } from "../types";
import { FIXED_OFFSET } from "../utils";

/**
 * @zh 调试线种类：boundary 为方向触发线，edge 为首尾目标边缘偏移线。
 * @en Debug line kind: boundary is the directional trigger line, edge is a
 * first/last target edge-offset line.
 */
export type DebugLineKind = "boundary" | "edge";

/**
 * @zh 单条调试触发线。
 * pos 为沿滚动轴距根 border-box 起点边缘的距离（纵向为 top，横向为 left）。
 * @en A single debug trigger line.
 * pos is the distance along the scroll axis from the start edge of the root
 * border-box (top for vertical, left for horizontal).
 */
export interface DebugLine {
	id: string
	pos: number
	label: string
	kind: DebugLineKind
}

/**
 * @zh 计算调试线所需的归一化配置（ResolvedOptions 的结构子集）。
 * @en Normalized config subset required to compute debug lines
 * (a structural subset of ResolvedOptions).
 */
export interface DebugLineInput {
	direction: Direction
	overlay: number
	edges: { first: true | number, last: true | number }
	offset: { toStart: number, toEnd: number }
}

/**
 * @zh 计算触发线集合，阈值口径与引擎判定完全一致：
 * 基线 B = FIXED_OFFSET(10) + overlay；
 * - 方向触发线：B + offset.toEnd（↓/→）、B + offset.toStart（↑/←）；
 * - 朝终点判定时，首目标提前线 B+toEnd+first、尾目标解除线 B+toEnd-last；
 * - 朝起点判定时，首目标解除线 B+toStart+first、尾目标提前线 B+toStart-last。
 * 边缘线仅在 edges.first / edges.last 不为 true（数字或 false）时存在。
 * @en Computes the trigger-line set with exactly the same thresholds as the
 * engine:
 * baseline B = FIXED_OFFSET(10) + overlay;
 * - directional trigger lines: B + offset.toEnd (↓/→), B + offset.toStart (↑/←);
 * - when scrolling to the end: the first early line B+toEnd+first and the last
 *   release line B+toEnd-last;
 * - when scrolling to the start: the first release line B+toStart+first and the
 *   last early line B+toStart-last.
 * Edge lines only exist when edges.first / edges.last are not true (a number
 * or false).
 */
export function computeDebugLines(cfg: DebugLineInput): DebugLine[] {
	const horizontal = cfg.direction === "horizontal";
	const endArrow = horizontal ? "→" : "↓";
	const startArrow = horizontal ? "←" : "↑";
	const base = FIXED_OFFSET + cfg.overlay;
	const { toStart, toEnd } = cfg.offset;
	const { first, last } = cfg.edges;

	const lines: DebugLine[] = [
		{ id: "boundary-end", pos: base + toEnd, label: `${endArrow} trigger`, kind: "boundary" },
		{ id: "boundary-start", pos: base + toStart, label: `${startArrow} trigger`, kind: "boundary" },
	];

	// @zh edges.first 非 true 时存在：朝终点提前激活线 + 朝起点解除线 @en Exists when edges.first is not true: the end-direction early line and the start-direction release line
	if (first !== true) {
		lines.push(
			{ id: "edge-end-first", pos: base + toEnd + first, label: `${endArrow} first +${first}`, kind: "edge" },
			{ id: "edge-start-first", pos: base + toStart + first, label: `${startArrow} first +${first}`, kind: "edge" },
		);
	}

	// @zh edges.last 非 true 时存在：朝终点解除线 + 朝起点提前激活线 @en Exists when edges.last is not true: the end-direction release line and the start-direction early line
	if (last !== true) {
		lines.push(
			{ id: "edge-end-last", pos: base + toEnd - last, label: `${endArrow} last −${last}`, kind: "edge" },
			{ id: "edge-start-last", pos: base + toStart - last, label: `${startArrow} last −${last}`, kind: "edge" },
		);
	}

	return lines;
}

/**
 * @zh 位置重合的线合并显示（如 toStart 与 toEnd 均为 0 时，两个方向的线重合）。
 * @en Merges lines at the same position for display (e.g. the two direction
 * lines overlap when both toStart and toEnd are 0).
 */
export function groupLines(lines: DebugLine[]): Map<number, DebugLine[]> {
	const groups = new Map<number, DebugLine[]>();
	for (const line of lines) {
		const group = groups.get(line.pos);
		if (group)
			group.push(line);
		else
			groups.set(line.pos, [line]);
	}
	return groups;
}
