/**
 * @zh 界面文案（英文 / 中文）。通过 data-i18n / data-i18n-aria 绑定。
 * @en UI chrome strings (English / Chinese), bound via data-i18n / data-i18n-aria.
 */
export const MESSAGES = {
	en: {
		doc_title: "Scroll Active TOC · Interactive Playground",
		config_button: "Configure",
		config_aria: "Configure engine options",
		hero_eyebrow: "Framework-agnostic scroll-spy engine",
		hero_title_a: "Highlight your table of contents",
		hero_title_b: "while the page scrolls",
		hero_subtitle: "A zero-dependency TypeScript engine that always reports the correct active section — even with smooth scrolling, click navigation and edge sections. Scroll this page to see it live.",
		hero_cta_explore: "Explore the demo",
		hero_cta_config: "Open the config panel",
		badge_ts: "Pure TypeScript",
		badge_zero: "Zero dependencies",
		badge_mit: "MIT License",
		badge_stack: "Vite · jQuery · Tailwind v4",
		toc_heading: "On this page",
		toc_hint: "The highlighted link follows your scroll position. Click any link — the highlight is instant even while smooth scrolling is animating.",
		footer_text: "Released under the MIT License · Built with Vite, jQuery and Tailwind CSS v4.",
		footer_github: "View on GitHub",
		config_title: "Engine configuration",
		config_subtitle: "Applied in real time",
		config_close_aria: "Close configuration panel",
		status_heading: "Live snapshot",
		status_active: "activeId",
		status_index: "activeIndex",
		status_listener: "engine",
		status_on: "running",
		status_off: "stopped",
		status_gated: "gated by media query",
		cfg_hash: "Hash sync",
		hash_off: "off",
		hash_replace: "replace",
		hash_push: "push",
		cfg_hash_help: "How the URL hash is synced while scrolling.",
		cfg_overlay: "Fixed overlay",
		cfg_overlay_help: "Height of the fixed header overlapping the scroll area (px).",
		cfg_offset_start: "Offset ↑",
		cfg_offset_end: "Offset ↓",
		cfg_offset_help: "Anticipate or delay detection per scroll direction.",
		cfg_first: "First edge · always active",
		cfg_last: "Last edge · always active",
		cfg_edges_help: "Forced edges highlight even when the target never crosses the trigger line. A distance allows “no active target”.",
		cfg_mq: "Media-query gate",
		cfg_debug: "Trigger-line overlay",
		cfg_debug_help: "createDebugOverlay()",
		cfg_reset: "Reset to defaults",
		h_intro_note: "Everything on this page is driven by one createActiveScroll() instance and jQuery.",
		h_scroll_hint: "Keep scrolling — every section below is tracked",
		h_demo_horizontal: "Horizontal scroller",
		h_demo_container: "Scroll container",
		demo_h_tip: "direction: \"horizontal\" — the same engine watches scrollLeft. Click a pill or swipe the track.",
		demo_c_tip: "root: HTMLElement — a fixed-height container with its own sticky sub-header is tracked independently of the window.",
		demo_c_header: "Container scroller",
		demo_debug_show: "Show trigger lines",
	},
	zh: {
		doc_title: "Scroll Active TOC · 交互式演示",
		config_button: "参数配置",
		config_aria: "配置引擎参数",
		hero_eyebrow: "无框架的滚动高亮引擎",
		hero_title_a: "页面滚动时",
		hero_title_b: "目录高亮实时跟随",
		hero_subtitle: "零依赖的 TypeScript 引擎，无论平滑滚动、点击跳转还是首尾边界，都能始终报告正确的激活章节。滚动本页面即可实时体验。",
		hero_cta_explore: "开始体验",
		hero_cta_config: "打开配置面板",
		badge_ts: "纯 TypeScript",
		badge_zero: "零运行时依赖",
		badge_mit: "MIT 许可证",
		badge_stack: "Vite · jQuery · Tailwind v4",
		toc_heading: "本页目录",
		toc_hint: "高亮链接会跟随你的滚动位置。点击任意链接——即使平滑滚动还在动画中，高亮也会立即生效。",
		footer_text: "基于 MIT 许可证发布 · 使用 Vite、jQuery 与 Tailwind CSS v4 构建。",
		footer_github: "在 GitHub 上查看",
		config_title: "引擎参数配置",
		config_subtitle: "修改即时生效",
		config_close_aria: "关闭配置面板",
		status_heading: "实时快照",
		status_active: "activeId",
		status_index: "activeIndex",
		status_listener: "引擎状态",
		status_on: "运行中",
		status_off: "已停止",
		status_gated: "被媒体查询门控",
		cfg_hash: "Hash 同步",
		hash_off: "off（关闭）",
		hash_replace: "replace（替换）",
		hash_push: "push（入栈）",
		cfg_hash_help: "滚动过程中 URL hash 的同步方式。",
		cfg_overlay: "固定遮挡高度",
		cfg_overlay_help: "与滚动区域重叠的固定头部高度（px）。",
		cfg_offset_start: "偏移 ↑",
		cfg_offset_end: "偏移 ↓",
		cfg_offset_help: "按滚动方向提前或延迟激活判定。",
		cfg_first: "首边界 · 始终激活",
		cfg_last: "尾边界 · 始终激活",
		cfg_edges_help: "强制边界即使目标从未越过触发线也会高亮；填写距离则允许“无激活目标”。",
		cfg_mq: "媒体查询门控",
		cfg_debug: "触发线调试层",
		cfg_debug_help: "createDebugOverlay()",
		cfg_reset: "恢复默认值",
		h_intro_note: "本页所有交互都由同一个 createActiveScroll() 实例与 jQuery 驱动。",
		h_scroll_hint: "继续向下滚动——下面每个章节都会被追踪",
		h_demo_horizontal: "横向滚动容器",
		h_demo_container: "独立滚动容器",
		demo_h_tip: "direction: \"horizontal\" —— 同一个引擎改为监听 scrollLeft。点击胶囊或左右滑动轨道。",
		demo_c_tip: "root: HTMLElement —— 固定高度容器自带粘性子标题，独立于窗口被追踪。",
		demo_c_header: "容器滚动区",
		demo_debug_show: "显示触发线",
	},
};

const STORAGE_KEY = "sat-lang";

export function getInitialLang() {
	if (document.documentElement.lang === "zh")
		return "zh";
	return "en";
}

export function storeLang(lang) {
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	}
	catch { /* ignore */ }
}

/**
 * @zh 将文案应用到所有带 data-i18n / data-i18n-aria 的节点。
 * @en Applies messages to every node carrying data-i18n / data-i18n-aria.
 */
export function applyI18n(lang) {
	const dict = MESSAGES[lang] || MESSAGES.en;
	document.documentElement.lang = lang;
	document.title = dict.doc_title;

	document.querySelectorAll("[data-i18n]").forEach((el) => {
		const key = el.getAttribute("data-i18n");
		if (dict[key] !== undefined)
			el.textContent = dict[key];
	});

	document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
		const key = el.getAttribute("data-i18n-aria");
		if (dict[key] !== undefined)
			el.setAttribute("aria-label", dict[key]);
	});

	return dict;
}
