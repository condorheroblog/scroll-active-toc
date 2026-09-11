import type { DebugLineInput } from "./lines";
import { computeDebugLines, groupLines } from "./lines";

/**
 * @zh 调试覆盖层配色与层级（全部经 CSS 变量引用，带 fallback，不注入样式表）：
 * - --uas-debug-line：方向触发线颜色
 * - --uas-debug-edge：首尾边缘线颜色
 * - --uas-debug-bg：标签底色
 * - --uas-debug-z-index：覆盖层层级
 * @en Debug overlay colors and stacking (all referenced via CSS variables with
 * fallbacks; no stylesheet is injected).
 */
const LINE_COLOR = "var(--uas-debug-line, #22d3ee)";
const EDGE_COLOR = "var(--uas-debug-edge, #f59e0b)";
const LABEL_BG = "var(--uas-debug-bg, #ffffff)";
const Z_INDEX = "var(--uas-debug-z-index, 9999)";

/**
 * @zh 命令式调试覆盖层配置。root 须为已解析的容器元素；null 表示窗口根。
 * @en Imperative debug-overlay config. root must be a resolved container
 * element; null means the window root.
 */
export interface DebugOverlayConfig extends DebugLineInput {
	root: HTMLElement | null
	/**
	 * @zh 是否显示文字标签（滚动方向与触发位置 px）。
	 * @en Whether to show text labels (scroll direction and the trigger
	 * position in px).
	 * @default true
	 */
	label?: boolean
	/**
	 * @zh 覆盖层 wrapper 的附加 className。
	 * @en Extra className on the overlay wrapper.
	 * @default ''
	 */
	className?: string
}

/**
 * @zh 命令式调试覆盖层实例：el 为脱离文档的覆盖层根节点，由调用方挂到期望
 * 位置（窗口滚动挂 body 即可，容器滚动需挂到 position: relative 的包裹层内，
 * 作为滚动容器的兄弟节点）；update 按新配置重绘；destroy 从 DOM 移除。
 * @en Imperative debug-overlay instance: el is a detached overlay root that
 * the caller mounts wherever needed (body for window scrolling; for container
 * scrolling, inside a position: relative wrapper as a sibling of the scroll
 * container); update redraws with new config; destroy removes it from the DOM.
 */
export interface DebugOverlay {
	readonly el: HTMLElement
	update: (config: DebugOverlayConfig) => void
	destroy: () => void
}

/**
 * @zh 极简样式声明：camelCase CSS 属性（值为 string/number），
 * 也允许以 "--" 开头的自定义属性。
 * @en Minimal style declaration: camelCase CSS properties (string/number
 * values), plus custom properties starting with "--".
 */
type StyleDecl = Record<string, string | number | undefined>;

function applyStyle(el: HTMLElement, style: StyleDecl): void {
	for (const [key, value] of Object.entries(style)) {
		if (value == null)
			continue;
		if (key.startsWith("--"))
			el.style.setProperty(key, String(value));
		else
			(el.style as unknown as Record<string, string>)[key] = String(value);
	}
}

/**
 * @zh 创建触发线调试覆盖层（不依赖任何框架）。
 * 窗口滚动时 wrapper fixed 铺满视口；容器滚动时 absolute 铺满最近的
 * position: relative 祖先（即滚动容器的 border-box）。
 * @en Creates the trigger-line debug overlay without any framework.
 * The wrapper is fixed over the viewport for window scrolling, and absolute
 * over the nearest position: relative ancestor (the scroll container's
 * border-box) for container scrolling.
 */
export function createDebugOverlay(config: DebugOverlayConfig): DebugOverlay {
	const wrapper = document.createElement("div");
	wrapper.setAttribute("aria-hidden", "true");

	let current = config;

	const chip = (text: string, color: string, dash: string, extraStyle: StyleDecl): HTMLElement => {
		const node = document.createElement("span");
		applyStyle(node, {
			font: "10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
			whiteSpace: "nowrap",
			padding: "1px 6px",
			borderRadius: "2px",
			backgroundColor: LABEL_BG,
			border: `2px ${dash} ${color}`,
			color,
			...extraStyle,
		});
		node.textContent = text;
		return node;
	};

	const render = (cfg: DebugOverlayConfig): void => {
		const isWindowRoot = !(cfg.root instanceof HTMLElement);
		const horizontal = cfg.direction === "horizontal";
		const showLabel = cfg.label ?? true;

		wrapper.className = cfg.className ?? "";
		applyStyle(wrapper, {
			position: isWindowRoot ? "fixed" : "absolute",
			inset: 0,
			zIndex: Z_INDEX,
			pointerEvents: "none",
			overflow: "hidden",
		});

		wrapper.replaceChildren();

		const groups = groupLines(computeDebugLines(cfg));
		for (const [pos, group] of groups) {
			const isEdge = group.some(line => line.kind === "edge");
			const color = isEdge ? EDGE_COLOR : LINE_COLOR;
			const dash = isEdge ? "dotted" : "dashed";
			const text = `${group.map(line => line.label).join(" / ")} · ${pos}px`;

			let lineEl: HTMLElement;

			// @zh pos 为负时触发线位于轴起点之外，改为在起点边缘固定标记牌 @en When pos is negative the line lies beyond the axis start; pin a marker to the start edge instead
			if (pos < 0) {
				lineEl = document.createElement("div");
				if (horizontal) {
					applyStyle(lineEl, { position: "absolute", left: 0, top: 0, padding: "4px" });
					lineEl.append(chip(`◀ ${text} off-screen`, color, dash, {}));
				}
				else {
					applyStyle(lineEl, {
						position: "absolute",
						left: 0,
						right: 0,
						top: 0,
						display: "flex",
						justifyContent: "flex-end",
						padding: "4px 8px",
					});
					lineEl.append(chip(`▲ ${text} off-screen`, color, dash, {}));
				}
			}
			else if (horizontal) {
				lineEl = document.createElement("div");
				applyStyle(lineEl, {
					position: "absolute",
					top: 0,
					bottom: 0,
					left: `${pos}px`,
					borderLeft: `2px ${dash} ${color}`,
				});
				if (showLabel)
					lineEl.append(chip(text, color, dash, { position: "absolute", top: "4px", left: "4px" }));
			}
			else {
				lineEl = document.createElement("div");
				applyStyle(lineEl, {
					position: "absolute",
					left: 0,
					right: 0,
					top: `${pos}px`,
					borderTop: `2px ${dash} ${color}`,
				});
				if (showLabel) {
					lineEl.append(chip(text, color, dash, {
						position: "absolute",
						right: "8px",
						top: 0,
						transform: "translateY(-50%)",
					}));
				}
			}

			wrapper.append(lineEl);
		}
	};

	render(current);

	return {
		el: wrapper,
		update(next: DebugOverlayConfig) {
			current = next;
			render(current);
		},
		destroy() {
			wrapper.remove();
		},
	};
}
