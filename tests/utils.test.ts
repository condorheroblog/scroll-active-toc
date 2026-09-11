import type { TargetsCache } from "../src/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	FIXED_OFFSET,
	getCurrentPos,
	getEdges,
	getSentinel,
	last,
	prepareTargets,
	resolveMediaQueryList,
	resolveOptions,
	resolveRoot,
	resolveTargets,
} from "../src/utils";

function makeRect(overrides: Partial<DOMRect>): DOMRect {
	return {
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		toJSON: () => ({}),
		...overrides,
	} as DOMRect;
}

describe("last", () => {
	it("returns the last item of an array", () => {
		expect(last([1, 2, 3])).toBe(3);
		expect(last(["a"])).toBe("a");
	});

	it("returns undefined for an empty array", () => {
		expect(last([])).toBeUndefined();
	});
});

describe("resolveOptions", () => {
	it("returns full defaults for an empty input", () => {
		const opts = resolveOptions();
		expect(opts.direction).toBe("vertical");
		expect(opts.root).toBeNull();
		expect(opts.edges).toEqual({ first: true, last: true });
		expect(opts.overlay).toBe(0);
		expect(opts.mediaQuery).toBe("");
		expect(opts.hash).toBe("off");
		expect(opts.offset).toEqual({ toStart: 0, toEnd: 0 });
	});

	it("does not let explicitly passed undefined override defaults", () => {
		const opts = resolveOptions({
			direction: undefined,
			overlay: undefined,
			hash: undefined,
			edges: { first: undefined, last: undefined },
			offset: { toStart: undefined, toEnd: undefined },
		});
		expect(opts.direction).toBe("vertical");
		expect(opts.overlay).toBe(0);
		expect(opts.hash).toBe("off");
		expect(opts.edges).toEqual({ first: true, last: true });
		expect(opts.offset).toEqual({ toStart: 0, toEnd: 0 });
	});

	it("keeps a numeric offset for both directions", () => {
		expect(resolveOptions({ offset: 24 }).offset).toEqual({ toStart: 24, toEnd: 24 });
	});

	it("keeps an object offset field by field", () => {
		expect(resolveOptions({ offset: { toStart: 5 } }).offset).toEqual({ toStart: 5, toEnd: 0 });
		expect(resolveOptions({ offset: { toEnd: 9 } }).offset).toEqual({ toStart: 0, toEnd: 9 });
	});

	it("normalizes edges: false becomes 0, numbers are kept, undefined falls back to true", () => {
		expect(resolveOptions({ edges: { first: false, last: 30 } }).edges)
			.toEqual({ first: 0, last: 30 });
		expect(resolveOptions({ edges: { first: 15, last: false } }).edges)
			.toEqual({ first: 15, last: 0 });
	});

	it("preserves the onChange callback", () => {
		const onChange = vi.fn();
		expect(resolveOptions({ onChange }).onChange).toBe(onChange);
	});

	it("honors explicit overrides for simple fields", () => {
		const opts = resolveOptions({
			direction: "horizontal",
			overlay: 80,
			mediaQuery: "(min-width: 768px)",
			hash: "push",
		});
		expect(opts).toMatchObject({
			direction: "horizontal",
			overlay: 80,
			mediaQuery: "(min-width: 768px)",
			hash: "push",
		});
	});
});

describe("resolveTargets", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("returns an empty array for null / undefined", () => {
		expect(resolveTargets(null)).toEqual([]);
		expect(resolveTargets(undefined)).toEqual([]);
	});

	it("returns an empty array for an empty array", () => {
		expect(resolveTargets([])).toEqual([]);
	});

	it("queries the DOM for a CSS selector string", () => {
		document.body.innerHTML = "<section id=\"a\"></section><div id=\"b\"></div>";
		const els = resolveTargets("section[id]");
		expect(els).toHaveLength(1);
		expect(els[0].id).toBe("a");
	});

	it("resolves an array of IDs and drops missing ones", () => {
		document.body.innerHTML = "<section id=\"a\"></section><section id=\"b\"></section>";
		const els = resolveTargets(["a", "missing", "b"]);
		expect(els.map(el => el.id)).toEqual(["a", "b"]);
	});

	it("keeps HTMLElement items in a mixed array", () => {
		const el = document.createElement("section");
		el.id = "x";
		document.body.append(el);
		const els = resolveTargets(["unknown", el] as unknown as string[]);
		expect(els).toEqual([el]);
	});

	it("filters a NodeList down to HTMLElement entries", () => {
		document.body.innerHTML = "<p id=\"p1\"></p><p id=\"p2\"></p>";
		const nodeList = document.querySelectorAll("p");
		expect(resolveTargets(nodeList)).toHaveLength(2);
	});

	it("filters an HTMLCollection down to HTMLElement entries", () => {
		document.body.innerHTML = "<span></span><span></span>";
		const collection = document.body.getElementsByTagName("span");
		expect(resolveTargets(collection)).toHaveLength(2);
	});

	it("unwraps a getter once", () => {
		const el = document.createElement("div");
		const getter = vi.fn(() => [el]);
		expect(resolveTargets(getter)).toEqual([el]);
		expect(getter).toHaveBeenCalledOnce();
	});

	it("unwraps nested getters", () => {
		const el = document.createElement("div");
		expect(resolveTargets(() => () => [el])).toEqual([el]);
	});

	it("returns an empty array when a getter returns null", () => {
		expect(resolveTargets(() => null)).toEqual([]);
	});
});

describe("resolveRoot", () => {
	it("treats an HTMLElement as a container root", () => {
		const el = document.createElement("div");
		expect(resolveRoot(el)).toEqual({ rootEl: el, isWindowRoot: false });
	});

	it("falls back to document.scrollingElement for null / undefined", () => {
		// Standards mode: scrollingElement is <html>; the code must not hardcode
		// documentElement, because in quirks mode scrollingElement is <body>.
		const windowRoot = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
		expect(resolveRoot(null)).toEqual({ rootEl: windowRoot, isWindowRoot: true });
		expect(resolveRoot(undefined)).toEqual({ rootEl: windowRoot, isWindowRoot: true });
	});

	it("uses <body> as the window root in quirks mode", () => {
		// @zh 模拟怪异模式：scrollingElement 变为 <body>，窗口根必须随之变为 body，
		// 且仍保持 isWindowRoot（位置读 window.scrollY、事件监听 document）。
		// @en Emulates quirks mode where scrollingElement becomes <body>: the
		// window root must follow it while staying a window root semantically.
		Object.defineProperty(document, "scrollingElement", {
			configurable: true,
			value: document.body,
		});
		try {
			expect(resolveRoot(null)).toEqual({ rootEl: document.body, isWindowRoot: true });
			expect(resolveRoot(undefined)).toEqual({ rootEl: document.body, isWindowRoot: true });
		}
		finally {
			Reflect.deleteProperty(document, "scrollingElement");
		}
	});

	it("unwraps a getter", () => {
		const el = document.createElement("div");
		expect(resolveRoot(() => el)).toEqual({ rootEl: el, isWindowRoot: false });
		const windowRoot = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
		expect(resolveRoot(() => null)).toEqual({ rootEl: windowRoot, isWindowRoot: true });
	});
});

describe("resolveMediaQueryList", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null for a blank query without calling matchMedia", () => {
		const spy = vi.spyOn(window, "matchMedia");
		expect(resolveMediaQueryList("   ")).toBeNull();
		expect(spy).not.toHaveBeenCalled();
	});

	it("returns the MediaQueryList for a valid query", () => {
		const mql = { media: "(min-width: 768px)" } as MediaQueryList;
		vi.spyOn(window, "matchMedia").mockReturnValue(mql);
		expect(resolveMediaQueryList("(min-width: 768px)")).toBe(mql);
	});

	it("returns null and warns for a query normalized to 'not all'", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const mql = { media: "not all" } as MediaQueryList;
		vi.spyOn(window, "matchMedia").mockReturnValue(mql);

		expect(resolveMediaQueryList("not a real query")).toBeNull();
		expect(warn).toHaveBeenCalledOnce();
	});
});

describe("getCurrentPos", () => {
	afterEach(() => {
		Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
		Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });
	});

	it("reads window scroll positions for the window root", () => {
		Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
		Object.defineProperty(window, "scrollX", { configurable: true, value: 60 });
		expect(getCurrentPos("vertical", true, document.documentElement)).toBe(120);
		expect(getCurrentPos("horizontal", true, document.documentElement)).toBe(60);
	});

	it("reads container scroll positions for a container root", () => {
		const el = document.createElement("div");
		let scrollTop = 200;
		let scrollLeft = 90;
		Object.defineProperty(el, "scrollTop", { configurable: true, get: () => scrollTop });
		Object.defineProperty(el, "scrollLeft", { configurable: true, get: () => scrollLeft });

		expect(getCurrentPos("vertical", false, el)).toBe(200);
		expect(getCurrentPos("horizontal", false, el)).toBe(90);

		scrollTop = 201;
		scrollLeft = 91;
		expect(getCurrentPos("vertical", false, el)).toBe(201);
		expect(getCurrentPos("horizontal", false, el)).toBe(91);
	});
});

describe("getSentinel", () => {
	it("uses the root rect edge for the window root", () => {
		const el = document.documentElement;
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(makeRect({ top: -150, left: -80 }));
		expect(getSentinel("vertical", true, el)).toBe(-150);
		expect(getSentinel("horizontal", true, el)).toBe(-80);
	});

	it("uses the negated scroll position for a container root", () => {
		const el = document.createElement("div");
		Object.defineProperty(el, "scrollTop", { configurable: true, value: 130 });
		Object.defineProperty(el, "scrollLeft", { configurable: true, value: 40 });
		expect(getSentinel("vertical", false, el)).toBe(-130);
		expect(getSentinel("horizontal", false, el)).toBe(-40);
	});
});

describe("getEdges", () => {
	afterEach(() => {
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 0 });
		Object.defineProperty(window, "innerWidth", { configurable: true, value: 0 });
		Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 0 });
		Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 0 });
	});

	it("detects the vertical start / end for a container root", () => {
		const el = document.createElement("div");
		Object.defineProperties(el, {
			clientHeight: { configurable: true, value: 200 },
			scrollHeight: { configurable: true, value: 1000 },
			scrollTop: { configurable: true, value: 0, writable: true },
		});

		expect(getEdges("vertical", el)).toEqual({ isStart: true, isEnd: false });

		Object.defineProperty(el, "scrollTop", { configurable: true, value: FIXED_OFFSET * 2 + 1 });
		expect(getEdges("vertical", el).isStart).toBe(false);

		Object.defineProperty(el, "scrollTop", { configurable: true, value: 800 });
		expect(getEdges("vertical", el)).toEqual({ isStart: false, isEnd: true });
	});

	it("detects the horizontal start / end for the window root", () => {
		const el = document.documentElement;
		// @zh 让 innerWidth 比 clientWidth 大 17px，模拟 Windows 经典滚动条。
		// 若代码误用 innerWidth，滚到最右时仍会算出"还差 17px"，isEnd 永远不成立；
		// 本用例即保证该 bug 不会回归。
		// @en innerWidth is 17px larger than clientWidth to emulate a classic
		// Windows scrollbar. If the code used innerWidth, the right edge would
		// always read as "17px away", so isEnd could never hold — this test
		// guards against that regression.
		Object.defineProperty(el, "clientWidth", { configurable: true, value: 300 });
		Object.defineProperty(window, "innerWidth", { configurable: true, value: 317 });
		Object.defineProperties(el, {
			scrollWidth: { configurable: true, value: 900 },
			scrollLeft: { configurable: true, value: 0, writable: true },
		});

		expect(getEdges("horizontal", el)).toEqual({ isStart: true, isEnd: false });

		Object.defineProperty(el, "scrollLeft", { configurable: true, value: 600 });
		expect(getEdges("horizontal", el)).toEqual({ isStart: false, isEnd: true });
	});

	it("detects the vertical start / end for the window root", () => {
		const el = document.documentElement;
		// @zh 让 innerHeight 比 clientHeight 大 17px，模拟页面底部有占位的横向滚动条。
		// @en innerHeight is 17px larger than clientHeight to emulate a horizontal
		// scrollbar that takes layout space at the bottom.
		Object.defineProperty(el, "clientHeight", { configurable: true, value: 200 });
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 217 });
		Object.defineProperties(el, {
			scrollHeight: { configurable: true, value: 1000 },
			scrollTop: { configurable: true, value: 0, writable: true },
		});

		expect(getEdges("vertical", el)).toEqual({ isStart: true, isEnd: false });

		Object.defineProperty(el, "scrollTop", { configurable: true, value: 800 });
		expect(getEdges("vertical", el)).toEqual({ isStart: false, isEnd: true });
	});
});

describe("prepareTargets", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	function createCache(): TargetsCache {
		return { els: [], start: new Map(), end: new Map() };
	}

	it("caches targets sorted by position relative to the root", () => {
		const root = document.createElement("div");
		const low = document.createElement("section");
		low.id = "low";
		const high = document.createElement("section");
		high.id = "high";
		root.append(low, high);

		let scrollTop = 0;
		Object.defineProperty(root, "scrollTop", { configurable: true, get: () => scrollTop });
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(makeRect({ top: 100 }));
		vi.spyOn(low, "getBoundingClientRect").mockReturnValue(makeRect({ top: 300, bottom: 360 }));
		vi.spyOn(high, "getBoundingClientRect").mockReturnValue(makeRect({ top: 150, bottom: 200 }));

		const cache = createCache();
		prepareTargets([low, high], root, false, cache);

		expect(cache.els.map(el => el.id)).toEqual(["high", "low"]);
		// start = targetTop - (rootTop - scrollTop) = targetTop - 100
		expect(cache.start.get("high")).toBe(50);
		expect(cache.start.get("low")).toBe(200);
		expect(cache.end.get("high")).toBe(100);
		expect(cache.end.get("low")).toBe(260);

		scrollTop = 40;
		const next = createCache();
		prepareTargets([low, high], root, false, next);
		// rootStart = rootTop - scrollTop = 60 when scrolled
		expect(next.start.get("high")).toBe(90);
	});

	it("caches horizontal positions from left / right rects", () => {
		const root = document.createElement("div");
		const target = document.createElement("section");
		target.id = "h";
		root.append(target);

		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(makeRect({ left: 20 }));
		vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
			makeRect({ left: 120, right: 220 }),
		);

		const cache = createCache();
		prepareTargets([target], root, false, cache, "horizontal");
		expect(cache.start.get("h")).toBe(100);
		expect(cache.end.get("h")).toBe(200);
	});

	it("reuses the same cache maps and clears stale entries", () => {
		const root = document.createElement("div");
		const first = document.createElement("section");
		first.id = "first";
		const second = document.createElement("section");
		second.id = "second";
		root.append(first, second);

		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(makeRect({ top: 0 }));
		vi.spyOn(first, "getBoundingClientRect").mockReturnValue(makeRect({ top: 0, bottom: 50 }));
		vi.spyOn(second, "getBoundingClientRect").mockReturnValue(makeRect({ top: 100, bottom: 150 }));

		const cache = createCache();
		prepareTargets([first, second], root, false, cache);
		const startMap = cache.start;

		prepareTargets([first], root, false, cache);
		expect(cache.start).toBe(startMap);
		expect(cache.start.has("second")).toBe(false);
		expect(cache.start.has("first")).toBe(true);
	});

	it("generates a random map key for targets without an id", () => {
		const root = document.createElement("div");
		const target = document.createElement("section");
		root.append(target);

		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(makeRect({ top: 0 }));
		vi.spyOn(target, "getBoundingClientRect").mockReturnValue(makeRect({ top: 0, bottom: 30 }));
		vi.spyOn(Math, "random").mockReturnValue(0.123456789);

		const cache = createCache();
		prepareTargets([target], root, false, cache);
		expect(cache.els).toEqual([target]);
		expect(cache.start.size).toBe(1);
		expect(cache.start.keys().next().value).toBe("4fzzzxjyl");
	});
});
