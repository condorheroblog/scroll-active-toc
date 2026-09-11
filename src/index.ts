export { computeDebugLines, groupLines } from "./debug/lines";
export type { DebugLine, DebugLineInput, DebugLineKind } from "./debug/lines";
export { createDebugOverlay } from "./debug/overlay";
export type { DebugOverlay, DebugOverlayConfig } from "./debug/overlay";

/**
 * @zh scroll-active-toc：无框架的滚动激活 / TOC 高亮引擎。纯 TypeScript 实现，
 * 不依赖 React（或任何其他框架），可在 React、Vue、Solid、jQuery、原生 JS 等
 * 环境直接使用。react-use-active-scroll 即为本引擎的 React 薄适配层。
 *
 * 快速上手（原生 JS）：
 * ```ts
 * import { createActiveScroll } from "scroll-active-toc";
 *
 * const controller = createActiveScroll("main section[id]", { hash: "replace" }).start();
 * controller.subscribe(({ activeId }) => {
 *   document.querySelectorAll("nav a").forEach((a) => {
 *     a.classList.toggle("active", a.getAttribute("href") === `#${activeId}`);
 *   });
 * });
 * // 卸载时：controller.destroy();
 * ```
 *
 * @en scroll-active-toc: a framework-agnostic scroll-activation / TOC-highlight
 * engine. A pure TypeScript implementation with no dependency on React (or any
 * other framework), usable directly from React, Vue, Solid, jQuery, vanilla JS,
 * etc. react-use-active-scroll is a thin React adapter over this engine.
 *
 * Quick start (vanilla JS):
 * ```ts
 * import { createActiveScroll } from "scroll-active-toc";
 *
 * const controller = createActiveScroll("main section[id]", { hash: "replace" }).start();
 * controller.subscribe(({ activeId }) => {
 *   document.querySelectorAll("nav a").forEach((a) => {
 *     a.classList.toggle("active", a.getAttribute("href") === `#${activeId}`);
 *   });
 * });
 * // On teardown: controller.destroy();
 * ```
 */
export { createActiveScroll } from "./engine";
export type {
	ActiveScrollController,
	ActiveScrollListener,
	ActiveScrollOptions,
	ActiveScrollSnapshot,
	Direction,
	ResolvedOptions,
	RootSource,
	TargetsCache,
	TargetsSource,
} from "./types";
export {
	last,
	prepareTargets,
	resolveOptions,
	resolveRoot,
	resolveTargets,
} from "./utils";
