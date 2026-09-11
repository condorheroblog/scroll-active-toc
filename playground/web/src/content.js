/**
 * @zh 演示页全部文案内容（英 / 中）。主章节由窗口滚动引擎追踪；
 * horizontal / container 两个章节内嵌独立的小型滚动演示。
 * @en All demo content (EN / ZH). Main sections are tracked by the window
 * scroll engine; the horizontal / container sections embed independent
 * mini scroll demos.
 */

export const SECTIONS = [
	{
		id: "introduction",
		tag: { en: "Why", zh: "为什么" },
		title: { en: "Why another scroll-spy?", zh: "为什么需要它？" },
		paras: [
			{
				en: "The Intersection Observer API makes it hard — sometimes impossible — to highlight a clicked link that will never intersect, to keep the first or last link active at the page edges, or to get consistent results regardless of scroll speed.",
				zh: "使用 Intersection Observer API 时，有些事情很难甚至无法做到：高亮一个永远不会相交的被点击链接、在页面首尾边缘始终保持首个或末个链接激活，以及在任意滚动速度下获得一致的结果。",
			},
			{
				en: "scroll-active-toc implements a custom scroll observer that adapts to CSS scroll-behavior, scrollIntoView() or JS animation libraries, and always reports the correct active target. It does not scroll for you, mutate the DOM, or require hash navigation.",
				zh: "scroll-active-toc 实现了自定义滚动观察器，能够适配 CSS scroll-behavior、scrollIntoView() 或 JS 动画库，并始终报告正确的激活目标。它不会替你滚动页面、不会修改 DOM，也不依赖 hash 导航。",
			},
		],
		list: [
			{ en: "Instant, consistent highlighting on click, even mid-animation", zh: "点击后立即、稳定地高亮，即使动画仍在进行" },
			{ en: "First/last links stay active at the page edges", zh: "到达页面边缘时首尾链接保持激活" },
			{ en: "Works with vertical and horizontal scrolling, window or container", zh: "支持纵向 / 横向滚动、窗口或容器两种根" },
			{ en: "Pure TypeScript, zero runtime dependencies, framework agnostic", zh: "纯 TypeScript、零运行时依赖、与框架无关" },
		],
	},
	{
		id: "installation",
		tag: { en: "Setup", zh: "安装" },
		title: { en: "Install the package", zh: "安装" },
		paras: [
			{
				en: "The engine ships as a single small package. This playground imports it directly through the pnpm workspace, but your own project can install it from npm.",
				zh: "引擎以一个很小的包发布。本演示通过 pnpm workspace 直接引用源码，你自己的项目可以从 npm 安装。",
			},
		],
		code: "npm i scroll-active-toc\n# pnpm add scroll-active-toc\n# yarn add scroll-active-toc",
	},
	{
		id: "quick-start",
		tag: { en: "Basics", zh: "快速上手" },
		title: { en: "Three lines to a live TOC", zh: "三行代码实现实时目录" },
		paras: [
			{
				en: "Create the controller with a target selector, start it, and subscribe to snapshots. Call setActive(id) from each link's click handler so the highlight is locked immediately while smooth scrolling runs.",
				zh: "用目标选择器创建控制器、启动它、订阅快照即可。在每个链接的点击回调中调用 setActive(id)，就能在平滑滚动进行期间立即锁定高亮。",
			},
		],
		code: `import { createActiveScroll } from "scroll-active-toc";

const controller = createActiveScroll("main section[id]", {
  hash: "replace",
}).start();

controller.subscribe(({ activeId }) => {
  document.querySelectorAll("nav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === \`#\${activeId}\`);
  });
});

// In every TOC link click handler:
// controller.setActive(id);
// controller.destroy() on teardown.`,
	},
	{
		id: "targets",
		tag: { en: "Targets", zh: "目标" },
		title: { en: "Many ways to describe targets", zh: "多种目标描述方式" },
		paras: [
			{
				en: "The first argument accepts a CSS selector (re-queried on init and refresh), an array of IDs, elements, a NodeList, or a getter. A getter carries the deferred-value semantics of a React ref, Vue ref or Solid accessor.",
				zh: "第一个参数支持 CSS 选择器（初始化与 refresh 时重新查询）、ID 数组、元素数组、NodeList，或一个 getter。getter 承担了 React ref、Vue ref、Solid accessor 的延迟取值语义。",
			},
		],
		code: `const bySelector = "main section[id]";
const byIds = ["introduction", "quick-start"];
const byElements = [headingEl1, headingEl2];
const byGetter = () => document.querySelectorAll("section[id]");

createActiveScroll(bySelector);`,
	},
	{
		id: "options",
		tag: { en: "Options", zh: "配置" },
		title: { en: "Tune every threshold", zh: "可调的全部阈值" },
		paras: [
			{
				en: "All options are optional. Open the configuration panel from the top-right button and tweak them on this very page — the engine updates live through controller.setOptions(), and the trigger lines visualize each threshold.",
				zh: "所有选项都是可选的。点击右上角按钮打开配置面板，在本页实时调整——引擎通过 controller.setOptions() 即时更新，触发线会把每个阈值可视化出来。",
			},
		],
		list: [
			{ en: "direction — \"vertical\" (default) or \"horizontal\"", zh: "direction —— \"vertical\"（默认）或 \"horizontal\"" },
			{ en: "root — window (default) or any scrolling element", zh: "root —— 窗口（默认）或任意滚动容器元素" },
			{ en: "overlay / offset — fixed overlaps and directional offsets in px", zh: "overlay / offset —— 固定遮挡与方向偏移，单位 px" },
			{ en: "edges — force or distance-based first/last activation", zh: "edges —— 首尾目标的强制激活或距离策略" },
			{ en: "hash — \"off\" | \"replace\" | \"push\" URL sync", zh: "hash —— \"off\" | \"replace\" | \"push\" URL 同步" },
			{ en: "mediaQuery — gate listeners behind a CSS media query", zh: "mediaQuery —— 用 CSS 媒体查询门控监听器" },
		],
	},
	{
		id: "snapshot",
		tag: { en: "Snapshot", zh: "快照" },
		title: { en: "A stable external store", zh: "稳定的外部 store" },
		paras: [
			{
				en: "getSnapshot() returns a frozen, reference-stable object: a new reference is created only when the active target actually changes. That makes it work directly with React useSyncExternalStore and similar protocols.",
				zh: "getSnapshot() 返回冻结且引用稳定的对象：只有激活目标真正变化时才会产生新引用。因此可以直接配合 React useSyncExternalStore 等外部 store 协议使用。",
			},
		],
		list: [
			{ en: "activeElement — the active HTMLElement, or null", zh: "activeElement —— 当前激活元素，无则为 null" },
			{ en: "activeId — its id, an empty string when inactive", zh: "activeId —— 元素 ID，未激活时为空字符串" },
			{ en: "activeIndex — index in offset order, -1 when inactive", zh: "activeIndex —— 按偏移排序后的索引，未激活时为 -1" },
		],
	},
	{
		id: "horizontal-demo",
		tag: { en: "Demo", zh: "演示" },
		title: { en: "Horizontal scrolling", zh: "横向滚动" },
		paras: [
			{
				en: "Set direction to \"horizontal\" and point root at an overflow-x container. The mini table of contents below tracks scrollLeft instead of scrollTop — note that the page's own TOC keeps working at the same time.",
				zh: "将 direction 设为 \"horizontal\"，并把 root 指向一个 overflow-x 容器。下方迷你目录追踪的是 scrollLeft 而非 scrollTop——同时页面自身的目录依然正常工作。",
			},
		],
		kind: "horizontal",
	},
	{
		id: "container-demo",
		tag: { en: "Demo", zh: "演示" },
		title: { en: "An independent scroll container", zh: "独立滚动容器" },
		paras: [
			{
				en: "Pass an HTMLElement as root to track content that scrolls inside the page. This box has its own sticky sub-header (a 48px fixed overlay), its own trigger lines and its own lifecycle — completely independent of the window.",
				zh: "将 HTMLElement 作为 root，即可追踪页面内部滚动的内容。这个方框有自己的粘性子标题（48px 固定遮挡）、自己的触发线与生命周期，与窗口完全独立。",
			},
		],
		kind: "container",
	},
	{
		id: "debug-overlay",
		tag: { en: "Debug", zh: "调试" },
		title: { en: "See the trigger lines", zh: "看见触发线" },
		paras: [
			{
				en: "createDebugOverlay() draws the exact thresholds used by the activation algorithm: cyan dashed lines for the directional triggers and amber dotted lines for first/last edge offsets. Toggle it in the configuration panel and compare what you see with the option values.",
				zh: "createDebugOverlay() 会绘制激活算法使用的精确阈值：青色虚线为方向触发线，琥珀色点线为首尾边缘偏移线。在配置面板中开关它，并与选项数值对照观察。",
			},
		],
		code: `import { createDebugOverlay } from "scroll-active-toc";

const overlay = createDebugOverlay({
  root: null,              // container element or null for window
  direction: "vertical",
  overlay: 64,
  edges: { first: true, last: true },
  offset: { toStart: 0, toEnd: 0 },
  label: true,
});
document.body.appendChild(overlay.el);`,
	},
	{
		id: "frameworks",
		tag: { en: "Everywhere", zh: "随处可用" },
		title: { en: "Use it from anywhere", zh: "在任何环境使用" },
		paras: [
			{
				en: "The engine speaks subscribe + getSnapshot, so every framework only needs a thin reactive layer. This very playground is built with jQuery and Vite, proving the vanilla path. Construction touches no DOM, so it is SSR-safe until start() runs.",
				zh: "引擎使用 subscribe + getSnapshot 协议，任何框架都只需薄薄一层响应式封装。本演示就使用 jQuery 与 Vite 构建，展示了原生用法。构造过程不触碰 DOM，因此在调用 start() 之前对 SSR 完全安全。",
			},
		],
		list: [
			{ en: "Vanilla JS & jQuery — add/remove an .active class in subscribe()", zh: "原生 JS 与 jQuery —— 在 subscribe() 中切换 .active 类" },
			{ en: "React — useSyncExternalStore over subscribe / getSnapshot", zh: "React —— 基于 subscribe / getSnapshot 的 useSyncExternalStore" },
			{ en: "Vue / Solid — wrap the external store in a ref or signal", zh: "Vue / Solid —— 用 ref 或 signal 包装外部 store" },
			{ en: "Server rendering — snapshot stays empty until hydration", zh: "服务端渲染 —— 水合前快照保持为空" },
		],
	},
];

/** Horizontal mini-demo panels (tracked inside the overflow-x root). */
export const H_PANELS = [
	{
		id: "h-overview",
		title: { en: "Overview", zh: "概览" },
		paras: [
			{ en: "One engine instance owns this track. It watches scrollLeft with direction set to horizontal.", zh: "一个引擎实例掌管这条轨道，direction 设为 horizontal 时监听 scrollLeft。" },
			{ en: "Fixed left-side panels would use the overlay option paired with scroll-margin-left.", zh: "左侧若有固定面板，可使用 overlay 选项并配合 scroll-margin-left。" },
		],
	},
	{
		id: "h-features",
		title: { en: "Features", zh: "特性" },
		paras: [
			{ en: "Pill links highlight immediately on click and re-lock after swipe, wheel or keyboard intervention.", zh: "胶囊链接点击后立即高亮，滑动、滚轮或键盘介入后会重新锁定。" },
			{ en: "Edge strategies keep the first and last pill active at both ends of the track.", zh: "边缘策略保证轨道两端的首个与末个胶囊保持激活。" },
		],
	},
	{
		id: "h-api",
		title: { en: "API", zh: "API" },
		paras: [
			{ en: "setOptions(), setTargets(), refresh(), start() and stop() all work exactly as on the vertical page controller.", zh: "setOptions()、setTargets()、refresh()、start() 与 stop() 的行为与纵向页面控制器完全一致。" },
		],
	},
	{
		id: "h-recipes",
		title: { en: "Recipes", zh: "实践" },
		paras: [
			{ en: "Carousels, slide decks, tab strips and timeline rails — anything with an overflow-x track fits the model.", zh: "轮播、幻灯片、选项卡条、时间轴轨道——任何 overflow-x 轨道都适用该模型。" },
		],
	},
	{
		id: "h-tips",
		title: { en: "Tips", zh: "提示" },
		paras: [
			{ en: "RTL layouts are not supported yet. Enable CSS scroll-snap alongside the engine for steadier rests.", zh: "暂不支持 RTL 布局。可同时启用 CSS scroll-snap，让停靠更稳定。" },
			{ en: "You reached the last panel — it stays highlighted thanks to edges.last.", zh: "你已到达最后一个面板——得益于 edges.last，它会保持高亮。" },
		],
	},
];

/** Container mini-demo panels (tracked inside a fixed-height overflow-y root). */
export const C_PANELS = [
	{
		id: "c-root",
		title: { en: "root: an HTMLElement", zh: "root：一个 HTMLElement" },
		paras: [
			{ en: "The engine measures positions relative to this box, not the document. The window TOC on the right is unaffected while you scroll here.", zh: "引擎相对于这个方框而非文档测量位置。在这里滚动时，右侧的窗口目录不受影响。" },
			{ en: "A getter is also accepted for deferred access to a container that mounts later.", zh: "也接受 getter，用于延迟获取之后才挂载的容器。" },
		],
	},
	{
		id: "c-overlay",
		title: { en: "Sticky sub-header (48px)", zh: "粘性子标题（48px）" },
		paras: [
			{ en: "The amber label at the top of the box is a sticky element. The engine is configured with overlay: 48 so the trigger line sits right below it, and panels use scroll-margin-top: 48px.", zh: "方框顶部的琥珀色标签是粘性元素。引擎配置 overlay: 48，使触发线恰好位于其下方，面板使用 scroll-margin-top: 48px。" },
			{ en: "Toggle the trigger lines with the checkbox above this box to see the threshold.", zh: "勾选方框上方的复选框可以显示触发线，直观看到阈值位置。" },
		],
	},
	{
		id: "c-independent",
		title: { en: "Independent lifecycle", zh: "独立生命周期" },
		paras: [
			{ en: "This controller could be started, stopped or destroyed without touching the page controller. ResizeObserver keeps positions fresh when the box resizes.", zh: "这个控制器可以独立 start、stop 或 destroy，不影响页面控制器。ResizeObserver 会在方框尺寸变化时刷新位置。" },
			{ en: "Scroll slowly, then click a dot link — the highlight jumps instantly.", zh: "慢慢滚动，再点击圆点链接——高亮会立即跳转。" },
		],
	},
	{
		id: "c-last",
		title: { en: "Last panel", zh: "最后一个面板" },
		paras: [
			{ en: "Short final sections are the classic failure case for naive observers — here the last dot still activates reliably at the bottom edge.", zh: "末尾的短小章节是朴素观察器的经典失败场景——在这里，最后一个圆点仍会在底部边缘可靠激活。" },
			{ en: "That is everything for the container demo.", zh: "容器演示到此结束。" },
		],
	},
];
