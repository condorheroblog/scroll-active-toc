/**
 * @zh 滚动方向。
 * - vertical：纵向滚动（默认）
 * - horizontal：横向滚动（暂不支持 RTL）
 * @en Scroll direction.
 * - vertical: vertical scrolling (default)
 * - horizontal: horizontal scrolling (RTL not supported yet)
 */
export type Direction = "vertical" | "horizontal";

/**
 * @zh 目标集合输入（与框架无关）。
 * - string：CSS selector，初始化与 refresh 时按当前 DOM 重新查询
 * - string[]：元素 ID 列表
 * - HTMLElement[] / NodeList / HTMLCollection：元素集合
 * - getter：返回上述任意值（承担 React RefObject、Vue ref、Solid accessor
 *   等"延迟取值"语义），引擎在每次需要时调用
 * @en Framework-agnostic target collection input.
 * - string: a CSS selector, re-queried against the live DOM on init/refresh
 * - string[]: a list of element IDs
 * - HTMLElement[] / NodeList / HTMLCollection: a collection of elements
 * - getter: returns any of the above (carries the deferred-value semantics of
 *   a React RefObject, Vue ref or Solid accessor); the engine calls it whenever
 *   the current value is needed
 */
export type TargetsSource = string | string[] | HTMLElement[] | NodeListOf<HTMLElement> | HTMLCollectionOf<HTMLElement> | (() => TargetsSource | null | undefined);

/**
 * @zh 滚动容器输入。
 * HTMLElement 表示容器滚动；null（或 getter 返回 null）表示窗口/文档根；
 * getter 用于延迟拿到元素（如 RefObject.current）。
 * @en Scroll-container input.
 * An HTMLElement means container scrolling; null (or a getter returning null)
 * means the window/document root; a getter supports deferred element access
 * (e.g. RefObject.current).
 */
export type RootSource = HTMLElement | null | (() => RootSource);

/**
 * @zh 激活状态快照。
 * 仅在激活目标真正变化时产生新引用，因此可直接配合
 * React useSyncExternalStore 等外部 store 协议使用。
 * @en Active-state snapshot.
 * A new reference is created only when the active target actually changes, so
 * it works directly with external-store protocols such as React's
 * useSyncExternalStore.
 */
export interface ActiveScrollSnapshot {
	/**
	 * @zh 当前激活元素；无激活目标时为 null。
	 * @en The currently active element; null when no target is active.
	 */
	readonly activeElement: HTMLElement | null

	/**
	 * @zh 当前激活元素的 ID。
	 * @en The ID of the currently active element.
	 */
	readonly activeId: string

	/**
	 * @zh 当前激活元素在排序后目标数组中的索引，未激活时为 -1。
	 * @en Index of the active element in the sorted targets array; -1 when
	 * nothing is active.
	 */
	readonly activeIndex: number
}

/**
 * @zh 激活状态变化监听器；subscribe 的返回值为取消订阅函数。
 * @en Active-state change listener; subscribe returns an unsubscribe function.
 */
export type ActiveScrollListener = (snapshot: ActiveScrollSnapshot) => void;

/**
 * @zh createActiveScroll 配置选项（与框架无关）。
 * @en Framework-agnostic options for createActiveScroll.
 */
export interface ActiveScrollOptions {
	/**
	 * @zh 滚动方向。
	 * @en Scroll direction.
	 * @default 'vertical'
	 */
	direction?: Direction

	/**
	 * @zh 滚动容器；null 或返回 null 的 getter 表示窗口/文档根。
	 * @en Scroll container; null (or a getter returning null) means the
	 * window/document root.
	 * @default null
	 */
	root?: RootSource

	/**
	 * @zh 边缘目标（首个/末个）的激活策略。
	 * @en Activation strategy for the edge targets (first/last).
	 */
	edges?: {
		/**
		 * @zh - true（默认）：始终激活第一个目标，即使未越过触发线
		 * - number：允许"无激活"；第一个目标距触发线该距离时提前激活
		 * @en - true (default): always activate the first target
		 * - number: allows "no active target"; activates early at this distance
		 * @default true
		 */
		first?: boolean | number

		/**
		 * @zh - true（默认）：始终激活最后一个目标
		 * - number：允许"无激活"；最后一个目标末端越过触发线该距离后解除
		 * @en - true (default): always activate the last target
		 * - number: allows "no active target"; deactivates after crossing by
		 *   this distance
		 * @default true
		 */
		last?: boolean | number
	}

	/**
	 * @zh 沿滚动轴起点一侧固定遮挡物的尺寸，单位 px。
	 * 纵向为顶部遮挡高度，横向为左侧遮挡宽度。
	 * @en Size in px of the fixed overlay on the start side of the scroll axis.
	 * @default 0
	 */
	overlay?: number

	/**
	 * @zh CSS 媒体查询，如 '(min-width: 768px)'。
	 * 传入且语法合法时，仅在查询匹配期间启用监听；语法非法或未传时门控不
	 * 生效，始终启用监听。
	 * @en CSS media query, e.g. '(min-width: 768px)'.
	 * Listeners are enabled only while a valid query matches; an invalid or
	 * missing query disables gating entirely.
	 * @default ''
	 */
	mediaQuery?: string

	/**
	 * @zh 滚动过程中同步 URL hash 的方式。
	 * @en How to sync the URL hash during scrolling.
	 * @default 'off'
	 */
	hash?: "off" | "replace" | "push"

	/**
	 * @zh 滚动边界偏移。传入数字时同时应用于两个方向。
	 * @en Scroll boundary offset. A number applies to both directions.
	 */
	offset?: number | {
		/**
		 * @zh 朝滚动起点滚动时的边界偏移，单位 px。
		 * @en Boundary offset in px when scrolling toward the scroll start.
		 * @default 0
		 */
		toStart?: number

		/**
		 * @zh 朝滚动终点滚动时的边界偏移，单位 px。
		 * @en Boundary offset in px when scrolling toward the scroll end.
		 * @default 0
		 */
		toEnd?: number
	}

	/**
	 * @zh 激活状态变化回调，等价于 subscribe 一次（解绑在 destroy 时）。
	 * @en Active-state change callback; equivalent to a single subscribe
	 * (removed on destroy).
	 */
	onChange?: ActiveScrollListener
}

/**
 * @zh 引擎控制器：显式生命周期 + 外部 store 协议 + 业务方法。
 * @en Engine controller: explicit lifecycle + external-store protocol +
 * business methods.
 */
export interface ActiveScrollController {
	/**
	 * @zh 读取当前快照（引用稳定，仅在激活目标变化时变更）。
	 * @en Reads the current snapshot (stable reference; changes only when the
	 * active target changes).
	 */
	getSnapshot: () => ActiveScrollSnapshot

	/**
	 * @zh 订阅激活状态变化，返回取消订阅函数。
	 * @en Subscribes to active-state changes; returns an unsubscribe function.
	 */
	subscribe: (listener: ActiveScrollListener) => () => void

	/**
	 * @zh 用户点击目录链接或需要屏蔽普通滚动算法时调用。
	 * @en Called when the user clicks a TOC link or when the normal scroll
	 * algorithm should be bypassed.
	 */
	setActive: (target: string | HTMLElement) => void

	/**
	 * @zh 判断给定 ID 或元素是否为当前激活目标。
	 * @en Checks whether the given ID or element is the currently active target.
	 */
	isActive: (target: string | HTMLElement) => boolean

	/**
	 * @zh 更新配置；root/direction/mediaQuery 变化时引擎会自动完成解绑与重绑，
	 * 其余字段下一次判定即生效。引用相同或实质字段未变时为空操作。
	 * @en Updates options; root/direction/mediaQuery changes trigger an internal
	 * rebind, other fields take effect on the next evaluation. A no-op when the
	 * reference is identical or no material field changed.
	 */
	setOptions: (options?: Partial<ActiveScrollOptions>) => void

	/**
	 * @zh 替换目标集合（语义同初始化入参），会触发一次完整的重新初始化。
	 * @en Replaces the target collection (same input semantics as the
	 * constructor argument) and triggers a full re-initialization.
	 */
	setTargets: (targets: TargetsSource) => void

	/**
	 * @zh 重新解析 getter/selector 并立即重算目标位置（动态增删 section、
	 * 懒渲染内容就位后调用）。
	 * @en Re-resolves the getter/selector and recomputes target positions
	 * immediately (call after sections are added/removed or lazy content
	 * mounts).
	 */
	refresh: () => void

	/**
	 * @zh 启动引擎：绑定滚动 / matchMedia / ResizeObserver / popstate 监听，
	 * 并进行初始激活判定。幂等，重复调用安全。
	 * @en Starts the engine: binds scroll / matchMedia / ResizeObserver /
	 * popstate listeners and performs the initial activation evaluation.
	 * Idempotent.
	 */
	start: () => ActiveScrollController

	/**
	 * @zh 停止引擎：解绑全部监听、取消定时器与 rAF；配置与订阅保留，
	 * 可再次 start。
	 * @en Stops the engine: unbinds all listeners and cancels timers/rAF;
	 * options and subscriptions are retained, so start can be called again.
	 */
	stop: () => void

	/**
	 * @zh 销毁引擎：等价于 stop 并清空全部订阅，之后不可再用。
	 * @en Destroys the engine: equivalent to stop plus clearing all
	 * subscriptions; the instance must not be used afterwards.
	 */
	destroy: () => void
}

/**
 * @zh 内部缓存的目标位置信息。
 * start / end 分别为目标沿滚动轴起点/末端方向相对于滚动根内容起点的位置。
 * @en Internally cached target position info.
 * start / end are the target's positions toward the scroll-axis start/end,
 * relative to the start of the scroll root content.
 */
export interface TargetsCache {
	els: HTMLElement[]
	start: Map<string, number>
	end: Map<string, number>
}

/**
 * @zh 合并默认值后的完整配置类型。
 * - edges 已归一化：true 表示强制激活；数字表示边缘偏移距离（false 视为 0）。
 * - offset 已归一化为对象形式（传入数字时拆分到两个方向）。
 * @en Full configuration type after merging with defaults.
 * - edges is normalized: true means forced activation; a number means the edge
 *   offset distance (false is treated as 0).
 * - offset is normalized to object form (a number input is split across both
 *   directions).
 */
export interface ResolvedOptions extends Omit<Required<ActiveScrollOptions>, "edges" | "offset" | "onChange"> {
	edges: {
		first: true | number
		last: true | number
	}
	offset: {
		toStart: number
		toEnd: number
	}
	onChange?: ActiveScrollListener
}
