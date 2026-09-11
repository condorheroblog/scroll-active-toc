import type { DebugOverlayConfig } from "../src/debug/overlay";
import { afterEach, describe, expect, it } from "vitest";
import { createDebugOverlay } from "../src/debug/overlay";

function makeConfig(overrides: Partial<DebugOverlayConfig> = {}): DebugOverlayConfig {
	return {
		direction: "vertical",
		root: null,
		overlay: 0,
		edges: { first: true, last: true },
		offset: { toStart: 0, toEnd: 0 },
		...overrides,
	};
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("createDebugOverlay", () => {
	it("creates a detached, hidden wrapper for the window root", () => {
		const overlay = createDebugOverlay(makeConfig());
		expect(overlay.el.isConnected).toBe(false);
		expect(overlay.el.getAttribute("aria-hidden")).toBe("true");
		expect(overlay.el.style.position).toBe("fixed");
	});

	it("uses absolute positioning for a container root", () => {
		const root = document.createElement("div");
		const overlay = createDebugOverlay(makeConfig({ root }));
		expect(overlay.el.style.position).toBe("absolute");
	});

	it("renders one line element per distinct trigger position", () => {
		// Both default trigger lines coincide at 10px -> one group
		const overlay = createDebugOverlay(makeConfig());
		expect(overlay.el.children).toHaveLength(1);
		expect(overlay.el.textContent).toContain("10px");
	});

	it("renders one element per line when positions differ", () => {
		const overlay = createDebugOverlay(makeConfig({
			offset: { toStart: 0, toEnd: 40 },
		}));
		expect(overlay.el.children).toHaveLength(2);
	});

	it("renders an off-screen marker when a line has a negative position", () => {
		const overlay = createDebugOverlay(makeConfig({ edges: { first: true, last: 50 } }));
		expect(overlay.el.textContent).toContain("off-screen");
	});

	it("hides text chips when label is false", () => {
		const withLabels = createDebugOverlay(makeConfig());
		expect(withLabels.el.querySelectorAll("span").length).toBeGreaterThan(0);

		const withoutLabels = createDebugOverlay(makeConfig({ label: false }));
		expect(withoutLabels.el.querySelectorAll("span")).toHaveLength(0);
	});

	it("applies the custom className", () => {
		const overlay = createDebugOverlay(makeConfig({ className: "toc-debug" }));
		expect(overlay.el.className).toBe("toc-debug");
	});

	it("redraws on update", () => {
		const overlay = createDebugOverlay(makeConfig());
		expect(overlay.el.children).toHaveLength(1);

		overlay.update(makeConfig({ offset: { toStart: 0, toEnd: 40 } }));
		expect(overlay.el.children).toHaveLength(2);
	});

	it("switches positioning on update when the root changes", () => {
		const overlay = createDebugOverlay(makeConfig());
		expect(overlay.el.style.position).toBe("fixed");

		const root = document.createElement("div");
		overlay.update(makeConfig({ root }));
		expect(overlay.el.style.position).toBe("absolute");
	});

	it("remove()s the wrapper on destroy", () => {
		const overlay = createDebugOverlay(makeConfig());
		document.body.append(overlay.el);
		expect(overlay.el.isConnected).toBe(true);

		overlay.destroy();
		expect(overlay.el.isConnected).toBe(false);
	});

	it("renders horizontal lines with left offsets", () => {
		const overlay = createDebugOverlay(makeConfig({ direction: "horizontal" }));
		const line = overlay.el.firstElementChild as HTMLElement;
		expect(line.style.left).toBe("10px");
		expect(line.style.borderTop).toBe("");
		expect(line.style.borderLeft).not.toBe("");
	});

	it("renders vertical lines with top offsets", () => {
		const overlay = createDebugOverlay(makeConfig());
		const line = overlay.el.firstElementChild as HTMLElement;
		expect(line.style.top).toBe("10px");
		expect(line.style.borderTop).not.toBe("");
	});
});
