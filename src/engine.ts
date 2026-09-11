import type {
	ActiveScrollController,
	ActiveScrollListener,
	ActiveScrollOptions,
	ActiveScrollSnapshot,
	ResolvedOptions,
	RootSource,
	TargetsCache,
	TargetsSource,
} from "./types";
import {
	FIXED_OFFSET,
	getCurrentPos,
	getEdges,
	getSentinel,
	IDLE_FRAMES,
	last,
	MOUNT_IDLE_FRAMES,
	prepareTargets,
	resolveMediaQueryList,
	resolveOptions,
	resolveRoot,
	resolveTargets,
	SCROLLBAR_WIDTH,
} from "./utils";

/**
 * @zh 服务端 / 启动前的空快照（冻结引用，保证 getSnapshot 稳定）。
 * @en Empty snapshot for SSR / before start (frozen reference keeps
 * getSnapshot stable).
 */
const NULL_SNAPSHOT: ActiveScrollSnapshot = Object.freeze({
	activeElement: null,
	activeId: "",
	activeIndex: -1,
});

/**
 * @zh 创建与框架无关的滚动激活引擎。
 *
 * 构造函数不触碰任何 DOM；调用 start() 后才绑定监听并进行初始判定，
 * 因此可安全地在组件渲染期（含 SSR 环境）构造。状态变化通过
 * subscribe / getSnapshot 对外暴露（外部 store 协议），React、Vue、
 * Solid 等框架均可在其响应式基元上薄封装一层。
 *
 * @en Creates the framework-agnostic scroll-activation engine.
 *
 * The constructor touches no DOM; listeners are bound and the initial
 * evaluation happens only on start(), so construction is safe during
 * component rendering (including SSR). State changes are exposed via
 * subscribe / getSnapshot (the external-store protocol), which React, Vue,
 * Solid and others can wrap with a thin reactive layer.
 */
export function createActiveScroll(
	targetsSource: TargetsSource,
	rawOptions: ActiveScrollOptions = {},
): ActiveScrollController {
	let source: TargetsSource = targetsSource;
	let rawOpts: ActiveScrollOptions = { ...rawOptions };
	let opts: ResolvedOptions = resolveOptions(rawOpts);

	// @zh 生命周期与门控状态 @en Lifecycle and gating state
	let started = false;
	let enabled = true;
	let rootEl: HTMLElement | null = null;
	let isWindowRoot = false;

	// @zh 目标位置缓存 @en Target position cache
	const cache: TargetsCache = {
		els: [],
		start: new Map(),
		end: new Map(),
	};

	// @zh 激活状态与订阅者 @en Active state and subscribers
	let activeElement: HTMLElement | null = null;
	let snapshot: ActiveScrollSnapshot = NULL_SNAPSHOT;
	const listeners = new Set<ActiveScrollListener>();

	// @zh 内部状态机（对应 React 版不触发渲染的 ref/state）@en Internal state machine (mirrors the non-rendering refs/state in the React hook)
	let isScrollIdle = false;
	let isScrollFromTarget = false;
	let prevScrollPos = 0;
	let clickStartPos = 0;

	// @zh 定时器 / rAF / 观察器句柄 @en Timer / rAF / observer handles
	let initTimer: number | null = null;
	let idleRaf: number | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let skipObserverCallback = true;
	let mql: MediaQueryList | null = null;

	// @zh 已绑定监听的目标与标记，保证解绑精确 @en Bound listener targets and flags, for precise unbinding
	let scrollTarget: Document | HTMLElement | null = null;
	let mainBound = false;
	let interventionBound = false;

	function buildSnapshot(): ActiveScrollSnapshot {
		return Object.freeze({
			activeElement,
			activeId: activeElement?.id || "",
			activeIndex: activeElement ? cache.els.indexOf(activeElement) : -1,
		});
	}

	/**
	 * @zh 激活元素变化时刷新快照、通知订阅者并同步 URL hash。
	 * 快照引用不变时为空操作（外部 store 协议要求）。
	 * @en Refreshes the snapshot, notifies subscribers and syncs the URL hash
	 * when the active element changes. No-op when the snapshot reference is
	 * unchanged (required by the external-store protocol).
	 */
	function emit(): void {
		const next = buildSnapshot();
		if (
			next.activeElement === snapshot.activeElement
			&& next.activeId === snapshot.activeId
			&& next.activeIndex === snapshot.activeIndex
		) {
			return;
		}

		snapshot = next;
		listeners.forEach(fn => fn(snapshot));
		opts.onChange?.(snapshot);
		syncHash();
	}

	/**
	 * @zh 静默复位激活状态（teardown 期间使用，不通知、不改 URL）。
	 * @en Silently resets the active state during teardown (no notification,
	 * no URL change).
	 */
	function resetActiveSilently(): void {
		activeElement = null;
		snapshot = NULL_SNAPSHOT;
	}

	/**
	 * @zh 稳定的状态设置入口。
	 * @en Stable state-setting entry.
	 */
	function setActiveEl(el: HTMLElement | null): void {
		if (activeElement === el)
			return;
		activeElement = el;
		emit();
	}

	/**
	 * @zh 根据 URL hash 设置初始激活目标。
	 * @en Sets the initial active target based on the URL hash.
	 */
	function setFromHash(): boolean {
		if (typeof window === "undefined")
			return false;

		const hash = window.location.hash.slice(1);
		if (!hash)
			return false;

		const target = cache.els.find(el => el.id === hash);
		if (target) {
			setActiveEl(target);
			return true;
		}

		return false;
	}

	/**
	 * @zh 到达滚动起点/终点边界时强制激活首尾目标。
	 * @en Forces activation of the first/last target when the scroll
	 * start/end boundary is reached.
	 */
	function onEdgeReached(): boolean {
		const { first, last: edgesLast } = opts.edges;
		if (first !== true && edgesLast !== true)
			return false;
		if (!rootEl)
			return false;

		const { isStart, isEnd } = getEdges(opts.direction, rootEl, isWindowRoot);

		if (first === true && isStart) {
			setActiveEl(cache.els[0] || null);
			return true;
		}

		if (edgesLast === true && isEnd) {
			setActiveEl(last(cache.els) || null);
			return true;
		}

		return false;
	}

	/**
	 * @zh 朝滚动终点方向滚动时的激活判定。
	 * @en Activation logic when scrolling toward the scroll end.
	 */
	function onScrollToEnd(isScrollCancel = false): void {
		const { els, start, end } = cache;
		if (els.length === 0)
			return;

		const { first, last: edgesLast } = opts.edges;
		let firstOutEl: HTMLElement | null = first === true
			? els[0]
			: null;

		const sentinel = getSentinel(opts.direction, isWindowRoot, rootEl!);
		const offset = FIXED_OFFSET + opts.overlay + opts.offset.toEnd;

		Array.from(start).some(([_, startPos], idx) => {
			const _firstOffset = first !== true && idx === 0
				? first
				: 0;

			if (sentinel + startPos < offset + _firstOffset) {
				firstOutEl = els[idx];
				return false;
			}
			return true;
		});

		if (edgesLast !== true && firstOutEl === last(els)) {
			const lastEnd = last(Array.from(end.values()));
			if (lastEnd !== undefined && sentinel + lastEnd < offset - edgesLast) {
				setActiveEl(null);
				return;
			}
		}

		const isNext = els.indexOf(firstOutEl as HTMLElement) > els.indexOf(activeElement as HTMLElement);

		if (isNext || (firstOutEl && !activeElement)) {
			setActiveEl(firstOutEl);
		}
		else if (isScrollCancel) {
			setActiveEl(firstOutEl);
		}
	}

	/**
	 * @zh 朝滚动起点方向滚动时的激活判定。
	 * @en Activation logic when scrolling toward the scroll start.
	 */
	function onScrollToStart(): void {
		const { els, start, end } = cache;
		if (els.length === 0)
			return;

		const { first, last: edgesLast } = opts.edges;
		let firstInEl: HTMLElement | null = edgesLast === true
			? last(els)!
			: null;

		const sentinel = getSentinel(opts.direction, isWindowRoot, rootEl!);
		const offset = FIXED_OFFSET + opts.overlay + opts.offset.toStart;

		Array.from(end).some(([_, endPos], idx) => {
			const _lastOffset = edgesLast !== true && idx === end.size - 1
				? -edgesLast
				: 0;

			if (sentinel + endPos > offset + _lastOffset) {
				firstInEl = els[idx];
				return true;
			}
			return false;
		});

		if (first !== true && firstInEl === els[0]) {
			const firstStart = start.values().next().value;
			if (firstStart !== undefined && sentinel + firstStart > offset + first) {
				setActiveEl(null);
				return;
			}
		}

		const isPrev = els.indexOf(firstInEl as HTMLElement) < els.indexOf(activeElement as HTMLElement);

		if (isPrev || (firstInEl && !activeElement)) {
			setActiveEl(firstInEl);
		}
	}

	/**
	 * @zh 核心判定入口：根据滚动方向分发到起点/终点判定。
	 * @en Core entry point: dispatches to the start/end logic based on the
	 * scroll direction.
	 */
	function processScroll(prevPos: number, isScrollCancel: boolean): number {
		const nextPos = getCurrentPos(opts.direction, isWindowRoot, rootEl!);

		if (nextPos < prevPos) {
			onScrollToStart();
		}
		else {
			onScrollToEnd(isScrollCancel);
		}

		return nextPos;
	}

	/**
	 * @zh 滚动空闲检测：连续若干帧位置不变后认为滚动停止。
	 * @en Scroll idle detection: scrolling is considered stopped after the
	 * position stays unchanged for several consecutive frames.
	 */
	function setIdleScroll(maxFrames: number = IDLE_FRAMES): void {
		if (idleRaf !== null) {
			window.cancelAnimationFrame(idleRaf);
			idleRaf = null;
		}

		let frameCount = 0;
		let rafPrevPos = getCurrentPos(opts.direction, isWindowRoot, rootEl!);
		let rafId = 0;

		const scrollEnd = () => {
			frameCount++;
			const rafNextPos = getCurrentPos(opts.direction, isWindowRoot, rootEl!);

			if (rafPrevPos !== rafNextPos) {
				frameCount = 0;
				rafPrevPos = rafNextPos;
				rafId = window.requestAnimationFrame(scrollEnd);
				idleRaf = rafId;
				return;
			}

			if (frameCount === maxFrames) {
				isScrollIdle = true;
				isScrollFromTarget = false;
				window.cancelAnimationFrame(rafId);
				idleRaf = null;
				updateBindings();
			}
			else {
				rafId = window.requestAnimationFrame(scrollEnd);
				idleRaf = rafId;
			}
		};

		rafId = window.requestAnimationFrame(scrollEnd);
		idleRaf = rafId;
	}

	/**
	 * @zh 注册 ResizeObserver，在容器或目标尺寸变化时重新计算位置并判定。
	 * @en Registers a ResizeObserver to recompute positions and re-evaluate
	 * when the container or targets change size.
	 */
	function setResizeObserver(): void {
		if (resizeObserver)
			return;
		if (!rootEl)
			return;

		resizeObserver = new ResizeObserver(() => {
			if (!skipObserverCallback) {
				prepareTargets(source, rootEl!, isWindowRoot, cache, opts.direction);
				emit();
				window.requestAnimationFrame(() => {
					if (!onEdgeReached())
						onScrollToEnd();
				});
			}
			else {
				skipObserverCallback = false;
			}
		});

		resizeObserver.observe(rootEl);
	}

	/**
	 * @zh 断开 ResizeObserver。
	 * @en Disconnects the ResizeObserver.
	 */
	function destroyResizeObserver(): void {
		resizeObserver?.disconnect();
		resizeObserver = null;
	}

	/**
	 * @zh 浏览器前进/后退事件处理。
	 * @en Handles browser forward/back events.
	 */
	function onPrevNext(): void {
		const hash = window.location.hash;
		if (!hash && activeElement) {
			setActiveEl(opts.edges.first === true ? cache.els[0] : null);
			return;
		}
		setFromHash();
	}

	function addPrevNextListener(): void {
		window.addEventListener("popstate", onPrevNext);
	}

	function removePrevNextListener(): void {
		window.removeEventListener("popstate", onPrevNext);
	}

	function cancelIdleRaf(): void {
		if (idleRaf !== null) {
			window.cancelAnimationFrame(idleRaf);
			idleRaf = null;
		}
	}

	// @zh ====== 主滚动监听（对应 React 版主滚动 effect）======
	// @en ====== Main scroll listener (mirrors the main scroll effect in React) ======
	const onScroll = () => {
		if (!isScrollFromTarget) {
			prevScrollPos = processScroll(prevScrollPos, false);
			onEdgeReached();
		}
	};

	function bindMainScroll(): void {
		if (mainBound)
			return;
		if (!rootEl)
			return;
		scrollTarget = isWindowRoot ? document : rootEl;
		scrollTarget.addEventListener("scroll", onScroll, { passive: true });
		mainBound = true;
	}

	function unbindMainScroll(): void {
		if (scrollTarget)
			scrollTarget.removeEventListener("scroll", onScroll);
		scrollTarget = null;
		mainBound = false;
	}

	// @zh ====== 目标触发滚动后的干预监听（对应 React 版动态监听 effect）======
	// @en ====== Intervention listeners after a target-triggered scroll ======
	const restoreHighlight = () => {
		isScrollFromTarget = false;
		updateBindings();
	};

	const onSpaceBar: EventListener = (event) => {
		if ((event as KeyboardEvent).code === "Space")
			restoreHighlight();
	};

	const onScrollCancel: EventListener = (event) => {
		const isAnchor = (event.target as HTMLElement).tagName === "A";
		if (isAnchor)
			return;

		const isFirefox = window.CSS.supports("-moz-appearance", "none");
		const horizontal = opts.direction === "horizontal";
		// @zh 纵向滚动条贴容器右缘，横向滚动条贴容器底缘
		// @en The vertical scrollbar sits on the container's right edge; the horizontal scrollbar on the bottom edge
		const containerSize = isWindowRoot
			? (horizontal ? window.innerHeight : window.innerWidth)
			: (horizontal ? rootEl!.clientHeight : rootEl!.clientWidth);
		const clickPos = horizontal
			? (event as PointerEvent).clientY
			: (event as PointerEvent).clientX;
		const isScrollbar = clickPos >= containerSize - SCROLLBAR_WIDTH;

		if (isFirefox || isScrollbar) {
			restoreHighlight();
			prevScrollPos = processScroll(clickStartPos, true);
		}
	};

	const onScrollIdleEvent: EventListener = () => setIdleScroll();

	function bindIntervention(): void {
		if (interventionBound || !rootEl)
			return;
		const target = isWindowRoot ? document : rootEl;
		scrollTarget = target;

		target.addEventListener("wheel", restoreHighlight, { once: true });
		target.addEventListener("touchmove", restoreHighlight, { once: true });
		target.addEventListener("keydown", onSpaceBar, { once: true });
		target.addEventListener("scroll", onScrollIdleEvent, { passive: true, once: true });
		target.addEventListener("pointerdown", onScrollCancel);
		interventionBound = true;
	}

	function unbindIntervention(): void {
		if (!scrollTarget && !rootEl) {
			interventionBound = false;
			return;
		}
		const target = scrollTarget ?? (isWindowRoot ? document : rootEl!);
		target.removeEventListener("wheel", restoreHighlight);
		target.removeEventListener("touchmove", restoreHighlight);
		target.removeEventListener("keydown", onSpaceBar);
		target.removeEventListener("scroll", onScrollIdleEvent);
		target.removeEventListener("pointerdown", onScrollCancel);
		interventionBound = false;
	}

	/**
	 * @zh 按当前状态机增删监听：主滚动监听要求空闲态；干预监听要求
	 * 目标触发滚动态；两者都要求引擎已启动、门控通过且存在目标。
	 * @en Adds/removes listeners per the current state machine: the main
	 * scroll listener requires the idle state; intervention listeners require
	 * the target-triggered state; both require the engine to be started, the
	 * gate to pass and targets to exist.
	 */
	function updateBindings(): void {
		const hasTargets = resolveTargets(source).length > 0;
		const active = started && enabled && hasTargets && rootEl !== null;

		const shouldMain = active && isScrollIdle;
		if (shouldMain && !mainBound)
			bindMainScroll();
		else if (!shouldMain && mainBound)
			unbindMainScroll();

		const shouldIntervention = active && isScrollFromTarget;
		if (shouldIntervention && !interventionBound)
			bindIntervention();
		else if (!shouldIntervention && interventionBound)
			unbindIntervention();
	}

	/**
	 * @zh 同步 URL hash（对应 React 版 hash effect）。
	 * @en Syncs the URL hash (mirrors the hash effect in React).
	 */
	function syncHash(): void {
		if (opts.hash === "off")
			return;
		if (typeof window === "undefined")
			return;

		const baseUrl = location.href.split("#")[0];
		const start = opts.edges.first === true ? 0 : -1;
		const newHash = snapshot.activeIndex > start ? `#${snapshot.activeId}` : "";

		// @zh 与当前地址一致时跳过，避免多余的状态替换或重复历史记录
		// @en Skip when it matches the current URL to avoid redundant state replacement or duplicate history entries
		if (location.hash === newHash)
			return;

		const url = `${baseUrl}${newHash}`;
		if (opts.hash === "push")
			history.pushState(history.state, "", url);
		else
			history.replaceState(history.state, "", url);
	}

	// @zh ====== 媒体查询门控 ====== @en ====== Media-query gate ======
	function onMqlChange(event: Event): void {
		const next = (event.target as MediaQueryList).matches;
		if (next === enabled)
			return;
		enabled = next;
		if (enabled)
			scheduleInit();
		else
			clearInit();
	}

	function setupMql(): void {
		teardownMql();
		enabled = true;
		if (typeof window === "undefined")
			return;
		if (!opts.mediaQuery)
			return;

		const list = resolveMediaQueryList(opts.mediaQuery);
		if (!list)
			return;

		mql = list;
		enabled = list.matches;
		list.addEventListener("change", onMqlChange);
	}

	function teardownMql(): void {
		mql?.removeEventListener("change", onMqlChange);
		mql = null;
	}

	// @zh ====== 初始化 / 清理（对应 React 版挂载 effect 与其 cleanup）======
	// @en ====== Init / teardown (mirrors the mount effect and its cleanup) ======
	function clearInit(): void {
		if (initTimer !== null) {
			window.clearTimeout(initTimer);
			initTimer = null;
		}
		removePrevNextListener();
		destroyResizeObserver();
		cancelIdleRaf();
		// @zh 先解绑主监听（会清空 scrollTarget），干预监听再用 rootEl 兜底定位
		// @en Unbind the main listener first (clears scrollTarget); the intervention listener falls back to rootEl
		if (mainBound)
			unbindMainScroll();
		if (interventionBound)
			unbindIntervention();
		isScrollIdle = false;
		isScrollFromTarget = false;
		resetActiveSilently();
	}

	function scheduleInit(): void {
		clearInit();

		if (!started || !enabled || typeof window === "undefined")
			return;

		const resolved = resolveRoot(opts.root);
		rootEl = resolved.rootEl;
		isWindowRoot = resolved.isWindowRoot;
		skipObserverCallback = true;

		initTimer = window.setTimeout(() => {
			initTimer = null;
			if (!started || !enabled || !rootEl)
				return;

			prepareTargets(source, rootEl, isWindowRoot, cache, opts.direction);
			setResizeObserver();
			setIdleScroll(MOUNT_IDLE_FRAMES);
			addPrevNextListener();

			if (!setFromHash() && !onEdgeReached())
				onScrollToEnd();

			emit();
			updateBindings();
		}, 0);
	}

	// @zh 控制器实例：方法均为函数声明（会被提升），在此先行声明，
	// 使 start() 等方法可以提前引用；赋值发生在工厂返回前。
	// @en Controller instance: methods are hoisted function declarations, so it
	// is declared here to let start() etc. reference it early; assignment
	// happens before the factory returns.
	let controller: ActiveScrollController;

	// @zh ====== 对外方法 ====== @en ====== Public methods ======
	function getSnapshot(): ActiveScrollSnapshot {
		return snapshot;
	}

	function subscribe(listener: ActiveScrollListener): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}

	function setActive(target: string | HTMLElement): void {
		if (typeof window === "undefined" || !rootEl)
			return;

		let sourceTarget: HTMLElement | null = null;

		if (typeof target === "string") {
			sourceTarget = cache.els.find(({ id }) => id === target) || null;
		}
		else if (target instanceof HTMLElement) {
			sourceTarget = cache.els.find(el => el === target) || null;
		}

		if (sourceTarget) {
			setActiveEl(sourceTarget);
			isScrollFromTarget = true;
			clickStartPos = getCurrentPos(opts.direction, isWindowRoot, rootEl);
			updateBindings();
		}
	}

	function isActive(target: string | HTMLElement): boolean {
		if (typeof window === "undefined")
			return false;
		if (typeof target === "string")
			return target === snapshot.activeId;
		if (target instanceof HTMLElement)
			return target === snapshot.activeElement;
		return false;
	}

	function setOptions(patch: Partial<ActiveScrollOptions> = {}): void {
		const prevMediaQuery = opts.mediaQuery;
		const prevDirection = opts.direction;
		const prevRoot: RootSource | undefined = opts.root;

		rawOpts = { ...rawOpts, ...patch };
		opts = resolveOptions(rawOpts);

		if (!started || typeof window === "undefined")
			return;

		// @zh 媒体查询门控变化：重建 MQL，按新门控状态 init/teardown
		// @en Media-query gate change: rebuild the MQL and init/teardown accordingly
		if (opts.mediaQuery !== prevMediaQuery) {
			setupMql();
			if (enabled)
				scheduleInit();
			else
				clearInit();
			return;
		}

		// @zh root 元素变化（ref 延迟挂载 / 窗口↔容器切换）：完整重绑
		// @en Root element change (deferred ref mount / window↔container switch): full rebind
		const next = resolveRoot(opts.root);
		const prev = resolveRoot(prevRoot);
		if (next.rootEl !== prev.rootEl || next.isWindowRoot !== prev.isWindowRoot) {
			scheduleInit();
			return;
		}

		// @zh 方向变化：位置缓存口径改变，重新初始化
		// @en Direction change: position-cache semantics change, re-initialize
		if (opts.direction !== prevDirection)
			scheduleInit();
	}

	function setTargets(next: TargetsSource): void {
		if (next === source)
			return;
		source = next;
		if (started && enabled && typeof window !== "undefined")
			scheduleInit();
	}

	function refresh(): void {
		if (!started || !enabled || !rootEl)
			return;

		prepareTargets(source, rootEl, isWindowRoot, cache, opts.direction);
		emit();
		window.requestAnimationFrame(() => {
			if (!onEdgeReached())
				onScrollToEnd();
		});
		updateBindings();
	}

	function start(): ActiveScrollController {
		if (started)
			return controller;
		started = true;
		if (typeof window === "undefined")
			return controller;

		setupMql();
		scheduleInit();
		return controller;
	}

	function stop(): void {
		started = false;
		if (typeof window !== "undefined") {
			clearInit();
			teardownMql();
		}
		enabled = true;
	}

	function destroy(): void {
		stop();
		listeners.clear();
	}

	controller = {
		getSnapshot,
		subscribe,
		setActive,
		isActive,
		setOptions,
		setTargets,
		refresh,
		start,
		stop,
		destroy,
	};

	return controller;
}
