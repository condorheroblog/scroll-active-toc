import { beforeEach } from "vitest";

/**
 * @zh 可控的 requestAnimationFrame：引擎内部用 rAF 做滚动空闲检测，
 * 测试通过 flushFrames 手动推进帧，避免依赖真实计时器。
 * @en Controllable requestAnimationFrame: the engine uses rAF for scroll-idle
 * detection; tests advance frames manually via flushFrames.
 */
const pending = new Map<number, FrameRequestCallback>();
let nextRafId = 0;
let now = 0;

function raf(callback: FrameRequestCallback): number {
	const id = ++nextRafId;
	pending.set(id, callback);
	return id;
}

function caf(id: number): void {
	pending.delete(id);
}

/**
 * @zh 推进指定数量的动画帧；回调中新调度的 rAF 会在后续帧执行。
 * @en Advances the given number of animation frames; rAFs scheduled by a
 * callback run in subsequent frames.
 */
export function flushFrames(frameCount = 1): void {
	for (let i = 0; i < frameCount; i++) {
		const entries = Array.from(pending.entries());
		if (entries.length === 0)
			break;
		pending.clear();
		now += 16;
		for (const [, callback] of entries)
			callback(now);
	}
}

export function resetRaf(): void {
	pending.clear();
}

/**
 * @zh ResizeObserver 替身：记录所有实例，测试可手动 fire 触发回调。
 * @en ResizeObserver stand-in: records instances so tests can fire callbacks.
 */
export class MockResizeObserver {
	static instances: MockResizeObserver[] = [];

	disconnected = false;
	private callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		MockResizeObserver.instances.push(this);
	}

	observe(): void {}
	unobserve(): void {}
	disconnect(): void {
		this.disconnected = true;
	}

	fire(entries: ResizeObserverEntry[] = []): void {
		this.callback(entries, this as unknown as ResizeObserver);
	}

	static reset(): void {
		this.instances.length = 0;
	}
}

/**
 * @zh 创建可手动派发 change 的 MediaQueryList 替身。
 * @en Creates a MediaQueryList stand-in whose change event can be dispatched.
 */
export interface MockMediaQueryList extends MediaQueryList {
	fireChange: (matches: boolean) => void
}

export function createMockMediaQueryList(media: string, initialMatches: boolean): MockMediaQueryList {
	const listeners = new Set<EventListener>();
	let matches = initialMatches;
	const list: MockMediaQueryList = {
		media,
		get matches() {
			return matches;
		},
		onchange: null,
		addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
			if (typeof listener === "function")
				listeners.add(listener);
		},
		removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
			if (typeof listener === "function")
				listeners.delete(listener);
		},
		dispatchEvent(event: Event): boolean {
			listeners.forEach(fn => fn(event));
			return true;
		},
		addListener() {},
		removeListener() {},
		fireChange(next: boolean) {
			matches = next;
			const event = new Event("change");
			Object.defineProperty(event, "target", { value: list });
			list.dispatchEvent(event);
		},
	};
	return list;
}

if (typeof window !== "undefined") {
	globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
	window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
	window.requestAnimationFrame = raf;
	window.cancelAnimationFrame = caf;

	if (typeof window.matchMedia !== "function") {
		window.matchMedia = (query: string): MediaQueryList =>
			createMockMediaQueryList(query, true);
	}
}

beforeEach(() => {
	resetRaf();
	MockResizeObserver.reset();
	now = 0;
});
