import type { ActiveScrollOptions, Direction, ResolvedOptions, RootSource, TargetsCache, TargetsSource } from "./types";

export const FIXED_OFFSET = 10;
export const SCROLLBAR_WIDTH = 17;
export const IDLE_FRAMES = 20;
export const MOUNT_IDLE_FRAMES = 10;

export const defaultOptions: ResolvedOptions = {
	direction: "vertical",
	root: null,
	edges: { first: true, last: true },
	overlay: 0,
	mediaQuery: "",
	hash: "off",
	offset: { toStart: 0, toEnd: 0 },
};

/**
 * @zh 解析目标集合输入，统一转换为 HTMLElement 数组。
 * - getter 会被递归解包（与 RefObject 解包语义一致）
 * - 单个 string 视为 CSS selector
 * - 数组按元素逐项解析（ID 或元素混排也可）
 * @en Resolves the target-collection input into a uniform HTMLElement array.
 * - getters are unwrapped recursively (same semantics as a RefObject)
 * - a single string is treated as a CSS selector
 * - arrays are resolved item by item (mixed IDs and elements allowed)
 */
export function resolveTargets(source: TargetsSource | null | undefined): HTMLElement[] {
	if (source == null)
		return [];

	if (typeof source === "function")
		return resolveTargets(source());

	if (typeof source === "string")
		return Array.from(document.querySelectorAll<HTMLElement>(source));

	if (!Array.isArray(source)) {
		return Array.from(source)
			.filter((el): el is HTMLElement => el instanceof HTMLElement);
	}

	if (source.length === 0)
		return [];

	return source
		.map((item) => {
			if (item instanceof HTMLElement)
				return item;
			return document.getElementById(item);
		})
		.filter((el): el is HTMLElement => el !== null);
}

/**
 * @zh 解析滚动容器输入，返回滚动根元素及是否为窗口根。
 * 非 HTMLElement（null / getter 返回 null）统一回落到 documentElement。
 * @en Resolves the scroll-container input, returning the scroll root element
 * and whether it is the window root. Non-HTMLElement values fall back to
 * documentElement.
 */
export function resolveRoot(source: RootSource | undefined): { rootEl: HTMLElement, isWindowRoot: boolean } {
	const value = typeof source === "function" ? source() : source;
	if (value instanceof HTMLElement)
		return { rootEl: value, isWindowRoot: false };
	return { rootEl: document.documentElement, isWindowRoot: true };
}

/**
 * @zh 取数组最后一项。
 * @en Returns the last item of an array.
 */
export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1];
}

/**
 * @zh 归一化边缘策略：true 保持强制激活；数字原样保留；false 视为 0（无提前量）。
 * @en Normalizes the edge strategy: true keeps forced activation; numbers are
 * kept as-is; false is treated as 0 (no lead distance).
 */
function resolveEdge(value: boolean | number | undefined, fallback: true | number): true | number {
	if (value === undefined)
		return fallback;
	if (value === false)
		return 0;
	return value;
}

/**
 * @zh 将用户选项与默认值合并为完整配置。
 * 注意：必须逐字段使用 ?? 合并，浅展开（...options）会让显式传入的
 * undefined 覆盖默认值。
 * @en Merges user options with defaults into a full config.
 * Note: each field must be merged with ??; a shallow spread would let an
 * explicitly passed undefined override the default.
 */
export function resolveOptions(options: ActiveScrollOptions = {}): ResolvedOptions {
	return {
		direction: options.direction ?? defaultOptions.direction,
		root: options.root ?? defaultOptions.root,
		edges: {
			first: resolveEdge(options.edges?.first, defaultOptions.edges.first),
			last: resolveEdge(options.edges?.last, defaultOptions.edges.last),
		},
		overlay: options.overlay ?? defaultOptions.overlay,
		mediaQuery: options.mediaQuery ?? defaultOptions.mediaQuery,
		hash: options.hash ?? defaultOptions.hash,
		offset: typeof options.offset === "number"
			? { toStart: options.offset, toEnd: options.offset }
			: {
				toStart: options.offset?.toStart ?? defaultOptions.offset.toStart,
				toEnd: options.offset?.toEnd ?? defaultOptions.offset.toEnd,
			},
		onChange: options.onChange,
	};
}

/**
 * @zh 校验媒体查询语法并创建 MediaQueryList。
 * 浏览器会把非法查询归一化为 "not all"，据此识别语法错误：
 * 非法查询返回 null（门控不生效，始终启用监听）并告警；
 * 空白字符串视为未传，同样返回 null。
 * @en Validates the media query syntax and creates a MediaQueryList.
 * Browsers normalize an invalid query to "not all", which detects syntax
 * errors: an invalid query returns null (gating disabled, listeners always
 * enabled) and warns; a blank string is treated as omitted.
 */
export function resolveMediaQueryList(query: string): MediaQueryList | null {
	if (!query.trim())
		return null;

	const mql = window.matchMedia(query);
	if (mql.media === "not all") {
		console.warn(`scroll-active-toc: invalid mediaQuery "${query}" is ignored; listeners stay always enabled.`);
		return null;
	}

	return mql;
}

/**
 * @zh 获取当前滚动位置（沿滚动轴）。
 * @en Gets the current scroll position (along the scroll axis).
 */
export function getCurrentPos(direction: Direction, isWindowRoot: boolean, rootEl: HTMLElement): number {
	if (direction === "horizontal") {
		return isWindowRoot ? window.scrollX : rootEl.scrollLeft;
	}
	return isWindowRoot ? window.scrollY : rootEl.scrollTop;
}

/**
 * @zh 获取哨兵值，即视口沿滚动轴的起点边缘相对于滚动内容的偏移。
 * @en Gets the sentinel value: the offset of the viewport's start edge along
 * the scroll axis, relative to the scroll content.
 */
export function getSentinel(direction: Direction, isWindowRoot: boolean, rootEl: HTMLElement): number {
	if (direction === "horizontal") {
		return isWindowRoot
			? rootEl.getBoundingClientRect().left
			: -rootEl.scrollLeft;
	}
	return isWindowRoot
		? rootEl.getBoundingClientRect().top
		: -rootEl.scrollTop;
}

/**
 * @zh 检测滚动容器是否到达滚动起点或终点边界。
 * @en Detects whether the scroll container has reached the start or end
 * boundary.
 */
export function getEdges(direction: Direction, rootEl: HTMLElement, isWindowRoot: boolean): { isStart: boolean, isEnd: boolean } {
	if (direction === "horizontal") {
		const clientWidth = isWindowRoot ? window.innerWidth : rootEl.clientWidth;
		const isStart = rootEl.scrollLeft <= FIXED_OFFSET * 2;
		const isEnd = Math.abs(rootEl.scrollWidth - clientWidth - rootEl.scrollLeft) <= 1;
		return { isStart, isEnd };
	}

	const clientHeight = isWindowRoot ? window.innerHeight : rootEl.clientHeight;
	const isStart = rootEl.scrollTop <= FIXED_OFFSET * 2;
	const isEnd = Math.abs(rootEl.scrollHeight - clientHeight - rootEl.scrollTop) <= 1;
	return { isStart, isEnd };
}

/**
 * @zh 缓存目标元素及其相对于滚动根的位置（沿滚动轴）。
 * @en Caches target elements and their positions relative to the scroll root
 * (along the scroll axis).
 */
export function prepareTargets(
	source: TargetsSource,
	rootEl: HTMLElement,
	isWindowRoot: boolean,
	cache: TargetsCache,
	direction: Direction = "vertical",
): void {
	const targets = resolveTargets(source);
	const horizontal = direction === "horizontal";

	targets.sort((a, b) => {
		const aPos = horizontal ? a.getBoundingClientRect().left : a.getBoundingClientRect().top;
		const bPos = horizontal ? b.getBoundingClientRect().left : b.getBoundingClientRect().top;
		return aPos - bPos;
	});

	cache.els = targets;

	const rootRect = rootEl.getBoundingClientRect();
	const rootScroll = horizontal ? rootEl.scrollLeft : rootEl.scrollTop;
	const rootStart = (horizontal ? rootRect.left : rootRect.top) - (isWindowRoot ? 0 : rootScroll);

	cache.start.clear();
	cache.end.clear();

	targets.forEach((target) => {
		const rect = target.getBoundingClientRect();
		const startPos = horizontal ? rect.left : rect.top;
		const endPos = horizontal ? rect.right : rect.bottom;
		const id = target.id || Math.random().toString(36).slice(2, 11);
		cache.start.set(id, startPos - rootStart);
		cache.end.set(id, endPos - rootStart);
	});
}
