import type { DebugLineInput } from "../src/debug/lines";
import { describe, expect, it } from "vitest";
import { computeDebugLines, groupLines } from "../src/debug/lines";
import { FIXED_OFFSET } from "../src/utils";

function makeConfig(overrides: Partial<DebugLineInput> = {}): DebugLineInput {
	return {
		direction: "vertical",
		overlay: 0,
		edges: { first: true, last: true },
		offset: { toStart: 0, toEnd: 0 },
		...overrides,
	};
}

function byId(lines: ReturnType<typeof computeDebugLines>): Map<string, number> {
	return new Map(lines.map(line => [line.id, line.pos]));
}

describe("computeDebugLines", () => {
	it("emits only the two boundary lines when edges are forced", () => {
		const lines = computeDebugLines(makeConfig());
		expect(lines.map(line => line.id)).toEqual(["boundary-end", "boundary-start"]);
		expect(byId(lines)).toEqual(new Map([
			["boundary-end", FIXED_OFFSET],
			["boundary-start", FIXED_OFFSET],
		]));
	});

	it("includes the overlay in the baseline", () => {
		const lines = computeDebugLines(makeConfig({ overlay: 64 }));
		expect(byId(lines).get("boundary-end")).toBe(FIXED_OFFSET + 64);
	});

	it("applies toStart / toEnd to the matching boundary line", () => {
		const lines = computeDebugLines(makeConfig({ offset: { toStart: 30, toEnd: 70 } }));
		const positions = byId(lines);
		expect(positions.get("boundary-end")).toBe(FIXED_OFFSET + 70);
		expect(positions.get("boundary-start")).toBe(FIXED_OFFSET + 30);
	});

	it("adds the two first-edge lines when edges.first is numeric", () => {
		const lines = computeDebugLines(makeConfig({ edges: { first: 40, last: true } }));
		const positions = byId(lines);
		expect(lines.filter(line => line.kind === "edge")).toHaveLength(2);
		expect(positions.get("edge-end-first")).toBe(FIXED_OFFSET + 40);
		expect(positions.get("edge-start-first")).toBe(FIXED_OFFSET + 40);
	});

	it("treats edges.first: false like 0", () => {
		const lines = computeDebugLines(makeConfig({
			edges: { first: false as unknown as number, last: true },
		}));
		const positions = byId(lines);
		expect(positions.get("edge-end-first")).toBe(FIXED_OFFSET);
		expect(positions.get("edge-start-first")).toBe(FIXED_OFFSET);
	});

	it("adds the two last-edge lines using subtraction", () => {
		const lines = computeDebugLines(makeConfig({ edges: { first: true, last: 25 } }));
		const positions = byId(lines);
		expect(positions.get("edge-end-last")).toBe(FIXED_OFFSET - 25);
		expect(positions.get("edge-start-last")).toBe(FIXED_OFFSET - 25);
	});

	it("emits all six lines when both edges are numeric", () => {
		const lines = computeDebugLines(makeConfig({ edges: { first: 10, last: 20 } }));
		expect(lines).toHaveLength(6);
		expect(new Set(lines.map(line => line.kind))).toEqual(new Set(["boundary", "edge"]));
	});

	it("uses horizontal arrows in labels", () => {
		const lines = computeDebugLines(makeConfig({ direction: "horizontal" }));
		expect(lines.find(line => line.id === "boundary-end")?.label).toContain("→");
		expect(lines.find(line => line.id === "boundary-start")?.label).toContain("←");
	});

	it("uses vertical arrows in labels", () => {
		const lines = computeDebugLines(makeConfig());
		expect(lines.find(line => line.id === "boundary-end")?.label).toContain("↓");
		expect(lines.find(line => line.id === "boundary-start")?.label).toContain("↑");
	});
});

describe("groupLines", () => {
	it("groups coincident lines under one position", () => {
		const groups = groupLines([
			{ id: "a", pos: 10, label: "A", kind: "boundary" },
			{ id: "b", pos: 10, label: "B", kind: "boundary" },
			{ id: "c", pos: 20, label: "C", kind: "edge" },
		]);
		expect(groups.size).toBe(2);
		expect(groups.get(10)?.map(line => line.id)).toEqual(["a", "b"]);
		expect(groups.get(20)?.map(line => line.id)).toEqual(["c"]);
	});

	it("preserves insertion order within a group", () => {
		const groups = groupLines([
			{ id: "x", pos: 0, label: "X", kind: "edge" },
			{ id: "y", pos: 0, label: "Y", kind: "boundary" },
		]);
		expect(groups.get(0)?.[0].id).toBe("x");
	});

	it("returns an empty map for an empty input", () => {
		expect(groupLines([]).size).toBe(0);
	});
});
