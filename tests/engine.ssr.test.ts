// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createActiveScroll } from "../src/engine";
import { last, resolveOptions } from "../src/utils";

/**
 * @zh SSR / 启动前安全：window 不存在时，构造、start、各方法都不得抛错，
 * 且快照保持空快照。
 * @en SSR / pre-mount safety: with no window, construction, start and every
 * method must be throw-free and the snapshot must stay empty.
 */
describe("createActiveScroll without a DOM (SSR)", () => {
	it("exposes the empty snapshot and never throws", () => {
		expect(typeof window).toBe("undefined");

		const controller = createActiveScroll(() => null);
		expect(controller.getSnapshot()).toEqual({
			activeElement: null,
			activeId: "",
			activeIndex: -1,
		});

		const listener = () => {};
		expect(() => {
			controller.subscribe(listener);
			expect(controller.start()).toBe(controller);
			expect(controller.isActive("x")).toBe(false);
			controller.setActive("x");
			controller.setOptions({ direction: "horizontal" });
			controller.setTargets([]);
			controller.refresh();
			controller.stop();
			controller.start();
			controller.destroy();
		}).not.toThrow();
	});

	it("keeps the empty snapshot stable after a start/stop cycle", () => {
		const controller = createActiveScroll([]);
		const before = controller.getSnapshot();
		controller.start();
		controller.stop();
		expect(controller.getSnapshot()).toBe(before);
	});

	it("pure helpers keep working without a DOM", () => {
		expect(last([1, 2])).toBe(2);
		expect(resolveOptions({ hash: "push" }).hash).toBe("push");
	});
});
