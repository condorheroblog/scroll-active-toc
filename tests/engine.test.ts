import type { ActiveScrollController } from "../src/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActiveScroll } from "../src/engine";
import { MOUNT_IDLE_FRAMES } from "../src/utils";
import { createMockMediaQueryList, flushFrames, MockResizeObserver } from "./setup";

function rect(top: number, bottom: number, left = 0, right = 300): DOMRect {
	return {
		x: left,
		y: top,
		top,
		left,
		bottom,
		right,
		width: right - left,
		height: bottom - top,
		toJSON: () => ({}),
	} as DOMRect;
}

function tick(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, 0));
}

interface ScrollPage {
	root: HTMLElement
	sections: HTMLElement[]
	setScrollTop: (value: number) => void
	getScrollTop: () => number
}

/**
 * @zh 搭建一个容器滚动页面：三个 section 位于 0 / 100 / 200，
 * 容器视口高 200、内容高 1000。
 * @en Builds a container-scroll page: three sections at 0 / 100 / 200,
 * container viewport height 200, content height 1000.
 */
function setupScrollPage(): ScrollPage {
	document.body.innerHTML = "";

	const root = document.createElement("div");
	const sections = ["a", "b", "c"].map((id) => {
		const section = document.createElement("section");
		section.id = id;
		root.append(section);
		return section;
	});
	document.body.append(root);

	let scrollTop = 0;
	Object.defineProperty(root, "scrollTop", {
		configurable: true,
		get: () => scrollTop,
		set: (value: number) => {
			scrollTop = value;
		},
	});
	Object.defineProperty(root, "clientHeight", { configurable: true, value: 200 });
	Object.defineProperty(root, "scrollHeight", { configurable: true, value: 1000 });

	vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect(0, 200));
	vi.spyOn(sections[0], "getBoundingClientRect").mockReturnValue(rect(0, 80));
	vi.spyOn(sections[1], "getBoundingClientRect").mockReturnValue(rect(100, 180));
	vi.spyOn(sections[2], "getBoundingClientRect").mockReturnValue(rect(200, 280));

	return {
		root,
		sections,
		setScrollTop: (value) => {
			scrollTop = value;
		},
		getScrollTop: () => scrollTop,
	};
}

async function mount(controller: ActiveScrollController): Promise<void> {
	controller.start();
	await tick();
	flushFrames(MOUNT_IDLE_FRAMES);
}

function scroll(page: ScrollPage, value: number): void {
	page.setScrollTop(value);
	page.root.dispatchEvent(new Event("scroll"));
}

describe("createActiveScroll", () => {
	let page: ScrollPage;

	beforeEach(() => {
		page = setupScrollPage();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
		window.history.replaceState(null, "", window.location.pathname);
	});

	it("exposes the frozen null snapshot before start", () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		expect(controller.getSnapshot()).toEqual({
			activeElement: null,
			activeId: "",
			activeIndex: -1,
		});
		expect(controller.getSnapshot()).toBe(controller.getSnapshot());
	});

	it("does not touch the DOM when only constructed", () => {
		const spy = vi.spyOn(page.root, "addEventListener");
		createActiveScroll(page.sections, { root: page.root });
		expect(spy).not.toHaveBeenCalled();
	});

	it("activates the first target at the start edge after mount", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		const snapshot = controller.getSnapshot();
		expect(snapshot.activeId).toBe("a");
		expect(snapshot.activeIndex).toBe(0);
		expect(snapshot.activeElement).toBe(page.sections[0]);
	});

	it("start() is idempotent and returns the same controller", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		expect(controller.start()).toBe(controller);
		await tick();
		expect(controller.start()).toBe(controller);
		flushFrames(MOUNT_IDLE_FRAMES);

		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("notifies subscribers only when the active target changes", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		const listener = vi.fn();
		controller.subscribe(listener);

		await mount(controller);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].activeId).toBe("a");

		// Scrolling without moving past a trigger line must not re-emit
		scroll(page, 0);
		expect(listener).toHaveBeenCalledTimes(1);

		scroll(page, 120);
		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener.mock.calls[1][0].activeId).toBe("b");
	});

	it("supports unsubscribe", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		const listener = vi.fn();
		const unsubscribe = controller.subscribe(listener);

		await mount(controller);
		unsubscribe();
		scroll(page, 120);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("invokes the onChange callback on changes", async () => {
		const onChange = vi.fn();
		const controller = createActiveScroll(page.sections, { root: page.root, onChange });
		await mount(controller);

		scroll(page, 120);
		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls.at(-1)![0].activeId).toBe("b");
	});

	it("updates the active target while scrolling down and back up", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		scroll(page, 120);
		expect(controller.getSnapshot().activeId).toBe("b");

		scroll(page, 220);
		expect(controller.getSnapshot().activeId).toBe("c");

		scroll(page, 0);
		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("answers isActive for ids and elements", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		expect(controller.isActive("a")).toBe(true);
		expect(controller.isActive(page.sections[0])).toBe(true);
		expect(controller.isActive("b")).toBe(false);
		expect(controller.isActive(page.sections[1])).toBe(false);
	});

	it("setActive switches target and ignores regular scrolls until user interaction", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		controller.setActive("c");
		expect(controller.getSnapshot().activeId).toBe("c");
		expect(controller.isActive("c")).toBe(true);

		// Target-triggered state: normal scroll events are ignored
		scroll(page, 0);
		expect(controller.getSnapshot().activeId).toBe("c");

		// A wheel gesture restores normal tracking
		page.root.dispatchEvent(new Event("wheel"));
		scroll(page, 0);
		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("setActive accepts an HTMLElement and ignores unknown targets", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		controller.setActive(page.sections[2]);
		expect(controller.getSnapshot().activeElement).toBe(page.sections[2]);

		controller.setActive("does-not-exist");
		expect(controller.getSnapshot().activeId).toBe("c");
	});

	it("setActive is a no-op before start", () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		controller.setActive("b");
		expect(controller.getSnapshot().activeIndex).toBe(-1);
	});

	it("does not touch the URL hash when hash is off", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		scroll(page, 120);
		expect(window.location.hash).toBe("");
	});

	it("syncs the URL hash with replace by default-ish config", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root, hash: "replace" });
		await mount(controller);

		// Index 0 with edges.first: true does not write a hash
		expect(window.location.hash).toBe("");

		scroll(page, 120);
		expect(window.location.hash).toBe("#b");

		scroll(page, 0);
		expect(window.location.hash).toBe("");
	});

	it("uses pushState when hash is push", async () => {
		const pushSpy = vi.spyOn(window.history, "pushState");
		const controller = createActiveScroll(page.sections, { root: page.root, hash: "push" });
		await mount(controller);

		scroll(page, 120);
		expect(pushSpy).toHaveBeenCalledOnce();
		expect(String(pushSpy.mock.calls[0][2])).toContain("#b");
	});

	it("reacts to popstate: hash navigation and back-to-top", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		scroll(page, 120);
		expect(controller.getSnapshot().activeId).toBe("b");

		// Back navigation removes the hash -> first target forced
		window.history.replaceState(null, "", window.location.pathname);
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(controller.getSnapshot().activeId).toBe("a");

		// Forward navigation to a hash activates that target
		window.history.replaceState(null, "", `${window.location.pathname}#c`);
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(controller.getSnapshot().activeId).toBe("c");
	});

	it("respects the matchMedia gate: disabled, enabled and re-disabled", async () => {
		const mql = createMockMediaQueryList("(min-width: 1000px)", false);
		vi.spyOn(window, "matchMedia").mockReturnValue(mql);

		const controller = createActiveScroll(page.sections, {
			root: page.root,
			mediaQuery: "(min-width: 1000px)",
		});
		controller.start();
		await tick();
		flushFrames(MOUNT_IDLE_FRAMES);
		expect(controller.getSnapshot().activeIndex).toBe(-1);
		expect(MockResizeObserver.instances).toHaveLength(0);

		mql.fireChange(true);
		await tick();
		flushFrames(MOUNT_IDLE_FRAMES);
		expect(controller.getSnapshot().activeId).toBe("a");
		expect(MockResizeObserver.instances).toHaveLength(1);

		mql.fireChange(false);
		expect(controller.getSnapshot()).toEqual({
			activeElement: null,
			activeId: "",
			activeIndex: -1,
		});
	});

	it("treats an invalid mediaQuery as no gate and warns", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const mql = { media: "not all" } as MediaQueryList;
		vi.spyOn(window, "matchMedia").mockReturnValue(mql);

		const controller = createActiveScroll(page.sections, {
			root: page.root,
			mediaQuery: "nonsense",
		});
		await mount(controller);
		expect(warn).toHaveBeenCalledOnce();
		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("disconnects observers on stop and can restart", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);
		expect(MockResizeObserver.instances[0].disconnected).toBe(false);

		controller.stop();
		expect(MockResizeObserver.instances[0].disconnected).toBe(true);
		expect(controller.getSnapshot().activeIndex).toBe(-1);

		// Scrolls after stop are ignored
		scroll(page, 220);
		expect(controller.getSnapshot().activeIndex).toBe(-1);

		await mount(controller);
		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("clears subscribers on destroy", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		const listener = vi.fn();
		controller.subscribe(listener);
		await mount(controller);
		const callsAfterMount = listener.mock.calls.length;

		controller.destroy();
		// The instance can start again, but the old subscriber is gone
		await mount(controller);
		scroll(page, 120);
		expect(listener.mock.calls.length).toBe(callsAfterMount);
	});

	it("re-initializes when setTargets replaces the source", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);
		expect(controller.getSnapshot().activeId).toBe("a");

		controller.setTargets([page.sections[1], page.sections[2]]);
		await tick();
		flushFrames(MOUNT_IDLE_FRAMES);
		expect(controller.getSnapshot().activeId).toBe("b");
		expect(controller.getSnapshot().activeIndex).toBe(0);
	});

	it("setTargets with the same reference is a no-op", async () => {
		const source = page.sections;
		const controller = createActiveScroll(source, { root: page.root });
		await mount(controller);

		const addSpy = vi.spyOn(page.root, "addEventListener");
		controller.setTargets(source);
		expect(addSpy).not.toHaveBeenCalled();
	});

	it("re-initializes when setOptions changes the direction", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);

		expect(() => {
			controller.setOptions({ direction: "horizontal" });
		}).not.toThrow();
		await tick();
		flushFrames(MOUNT_IDLE_FRAMES);
		expect(controller.getSnapshot().activeId).toBe("a");
	});

	it("setOptions before start does not touch the DOM", () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		const spy = vi.spyOn(page.root, "addEventListener");
		controller.setOptions({ direction: "horizontal", overlay: 30 });
		expect(spy).not.toHaveBeenCalled();
	});

	it("refresh re-queries a selector source and re-evaluates", async () => {
		const controller = createActiveScroll("section[id]", { root: page.root });
		await mount(controller);
		expect(controller.getSnapshot().activeId).toBe("a");

		const newest = document.createElement("section");
		newest.id = "new";
		page.root.prepend(newest);
		vi.spyOn(newest, "getBoundingClientRect").mockReturnValue(rect(-50, -10));

		controller.refresh();
		flushFrames(1);
		expect(controller.getSnapshot().activeId).toBe("new");
		expect(controller.getSnapshot().activeIndex).toBe(0);
	});

	it("re-evaluates on ResizeObserver notifications", async () => {
		const controller = createActiveScroll(page.sections, { root: page.root });
		await mount(controller);
		const observer = MockResizeObserver.instances[0];

		// First callback is skipped (synthetic notification on mount)
		observer.fire();
		flushFrames(1);
		expect(controller.getSnapshot().activeId).toBe("a");

		// Later callbacks recompute and schedule an evaluation
		observer.fire();
		flushFrames(1);
		expect(controller.getSnapshot().activeId).toBe("a");
		expect(observer.disconnected).toBe(false);

		controller.stop();
		expect(observer.disconnected).toBe(true);
	});
});

describe("createActiveScroll with the window root", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("tracks window scrolling via document listeners", async () => {
		document.body.innerHTML = "";
		const sections = ["a", "b"].map((id) => {
			const section = document.createElement("section");
			section.id = id;
			document.body.append(section);
			return section;
		});

		Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 200 });
		Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 1000 });
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 });

		let scrollY = 0;
		Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
		Object.defineProperty(document.documentElement, "scrollTop", { configurable: true, get: () => scrollY });
		vi.spyOn(document.documentElement, "getBoundingClientRect").mockImplementation(() =>
			rect(-scrollY, 1000 - scrollY));
		vi.spyOn(sections[0], "getBoundingClientRect").mockImplementation(() =>
			rect(-scrollY, 80 - scrollY));
		vi.spyOn(sections[1], "getBoundingClientRect").mockImplementation(() =>
			rect(100 - scrollY, 180 - scrollY));

		const controller = createActiveScroll(sections);
		controller.start();
		await tick();
		flushFrames(MOUNT_IDLE_FRAMES);
		expect(controller.getSnapshot().activeId).toBe("a");

		scrollY = 120;
		document.dispatchEvent(new Event("scroll"));
		expect(controller.getSnapshot().activeId).toBe("b");
	});
});
