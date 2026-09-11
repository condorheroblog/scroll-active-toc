# Scroll Active TOC

<p align="center">
  <img src="https://condorheroblog.github.io/scroll-active-toc/favicon.svg" alt="Scroll Active TOC logo" width="96" />
</p>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

> 一个与框架无关的 scroll-spy 引擎，在滚动时追踪当前活跃的章节。非常适合用于高亮目录（Table of Contents）和侧边栏链接，可在原生 JS、React、Vue、Solid、jQuery 或任何其他环境中使用。

[English](https://github.com/condorheroblog/scroll-active-toc/blob/main/README.md) | **中文**

## 为什么？

[Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) API 存在以下困难（甚至无法实现）的场景：

- 即使目标永远不会进入视口，也要高亮被点击的链接
- 到达页面顶部/底部时，始终高亮第一个/最后一个链接
- 无论滚动速度如何，都能获得一致的结果
- 启用平滑滚动时，点击链接或通过 hash 导航能立即高亮

**scroll-active-toc** 实现了一个自定义滚动观察器，可以适应任何滚动行为——无论是 CSS `scroll-behavior`、`scrollIntoView` 还是 JS 动画库——并且始终报告"正确"的活跃目标。

### 它不做什么

- 不负责滚动到目标
- 不修改 DOM 或注入样式（可选的 [debug overlay](#debug-overlay触发线可视化) 是唯一的例外，且仅在你将其节点挂载到页面上时才生效）
- 不处理或配置 hash 导航

## 安装

```bash
npm i scroll-active-toc
# pnpm add scroll-active-toc
# yarn add scroll-active-toc
```

## 快速开始

```ts
import { createActiveScroll } from "scroll-active-toc";

const controller = createActiveScroll("main section[id]", {
	hash: "replace",
})
	.start();

controller.subscribe(({ activeId }) => {
	document.querySelectorAll("nav a").forEach((a) => {
		a.classList.toggle("active", a.getAttribute("href") === `#${activeId}`);
	});
});

document.querySelectorAll("nav a").forEach((a) => {
	a.addEventListener("click", () => {
		controller.setActive(a.getAttribute("href")!.slice(1));
	});
});

// 销毁时：
// controller.destroy();
```

在全局 CSS 中添加平滑滚动：

```css
html {
	scroll-behavior: smooth; /* 或 'auto' */
}
```

> [!TIP]
> 务必在点击处理程序中调用 `setActive(id)`：这样可以确保无论滚动速度或缓动效果如何，高亮都是即时且一致的。

## 目标（Targets）

第一个参数接受以下任意形式：

```ts
import type { TargetsSource } from "scroll-active-toc";

const bySelector: TargetsSource = "main section[id]"; // 在初始化/刷新时重新查询
const byIds: TargetsSource = ["introduction", "quick-start"];
const byElements: TargetsSource = [headingEl1, headingEl2]; // 也接受 NodeList / HTMLCollection
const byGetter: TargetsSource = () => document.querySelectorAll("section[id]");
```

getter 函数具有延迟值语义，类似于 React 的 `RefObject`、Vue 的 `ref` 或 Solid 的 accessor——引擎在需要当前值时才会调用它。

## 滚动容器（Root）

默认追踪 window/document 根元素。如果内容在一个可滚动容器内，可以传入 `HTMLElement`，或传入一个 getter 以实现延迟访问（例如 `ref.current`）。传入 `null` 表示使用 window 根元素。

```ts
const controller = createActiveScroll(ids, {
	root: () => document.querySelector(".scroll-container"),
});
```

```css
.scroll-container {
	overflow-y: auto;
	scroll-behavior: smooth;
}
```

## 选项

```ts
const controller = createActiveScroll(targets, {
	direction: "vertical", // 滚动轴："vertical" | "horizontal"
	root: null, // 滚动元素（或 getter），默认使用 window 根元素
	overlay: 0, // 固定覆盖层在滚动轴方向上的尺寸，单位 px
	mediaQuery: "", // CSS 媒体查询门控，例如 "(min-width: 768px)"
	hash: "off", // 同步 URL hash："off" | "replace" | "push"
	edges: { first: true, last: true }, // 边缘激活策略
	offset: 0, // 边界偏移量，数字或 { toStart, toEnd }
	onChange(snapshot) {}, // 活跃状态变化回调
});
```

| 属性       | 类型                                                                      | 默认值                        | 说明                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| direction  | `'vertical' \| 'horizontal'`                                              | `'vertical'`                 | 要追踪的滚动轴。`'horizontal'` 监听 `scrollLeft` 而非 `scrollTop`（暂不支持 RTL）。                                                                                                                                                                                |
| root       | `HTMLElement \| null \| (() => HTMLElement \| null)`                      | null                         | 滚动元素（或 getter）。仅当你的内容**不是**由 window 滚动时才需要设置。如果为 _null_，则默认为文档根元素。                                                                                                                                                   |
| edges      | `{ first?: boolean \| number, last?: boolean \| number }`                 | `{ first: true, last: true }` | 第一个/最后一个目标的激活策略。`true` 总是在开始/结束位置激活边缘目标，即使它没有进入视口。`number` 允许"无活跃目标"：第一个目标在距离触发线该距离时提前激活；最后一个目标在其末端超过触发线该距离后失活。`false` 等同于 `0`。 |
| overlay    | `number`                                                                  | 0                            | 任何与滚动区域起点重叠的 **CSS fixed** 内容在滚动轴方向上的尺寸——固定顶部导航栏（垂直滚动）或固定侧边面板（水平滚动）。必须与目标元素上的 `scroll-margin-top` / `scroll-margin-left` 配合使用。                                    |
| mediaQuery | `string`                                                                  | `''`                         | CSS 媒体查询，例如 `'(min-width: 768px)'`；仅在查询匹配时启用监听器。无效的查询会被忽略（控制台会发出警告），监听器始终保持启用状态；省略时行为相同。                                                                   |
| hash       | `'off' \| 'replace' \| 'push'`                                            | `'off'`                      | 滚动时同步 URL hash。`replace` 更新当前历史记录条目，`push` 创建新条目。当 `edges.first` 为 `true` 时，跳过第一个目标。                                                                                                                               |
| offset     | `number \| { toStart?: number, toEnd?: number }`                          | `{ toStart: 0, toEnd: 0 }`   | 每个滚动方向的边界偏移量（px）（向起点滚动时为 `toStart`，向终点滚动时为 `toEnd`）。单个数字会同时应用于两者。可调整此值来"提前预判"或"延迟"目标检测。                                                                                        |
| onChange   | `(snapshot: ActiveScrollSnapshot) => void`                                | —                            | 活跃状态变化回调；等同于单次 `subscribe`（在 `destroy` 时移除）。                                                                                                                                                                                                    |

## Snapshot

`getSnapshot()` 返回一个冻结的、引用稳定的对象——仅当活跃目标实际发生变化时才会创建新引用，因此它可以直接与 React 的 `useSyncExternalStore` 等外部存储协议配合使用。

| 字段          | 类型                   | 说明                                                                 |
| ------------- | ---------------------- | --------------------------------------------------------------------------- |
| activeElement | `HTMLElement \| null`  | 活跃目标元素。                                                  |
| activeId      | `string`               | 活跃目标的 ID，无活跃目标时为空字符串。                        |
| activeIndex   | `number`               | 活跃目标在按偏移量排序后的索引，无活跃目标时为 `-1`。             |

## Controller

`createActiveScroll` 返回的对象提供了显式的生命周期管理和外部存储协议：

| 方法                                   | 说明                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start()`                                | 绑定 scroll / matchMedia / ResizeObserver / popstate 监听器并执行初始激活。幂等方法；返回 controller 自身。                                                                    |
| `stop()`                                 | 解绑所有监听器并取消计时器/rAF。选项和订阅会被保留，因此可以再次调用 `start()`。                                                                                             |
| `destroy()`                              | 等同于 `stop()` 加上清除所有订阅；之后不应再使用该实例。                                                                                                            |
| `subscribe(listener)`                    | 订阅活跃状态变化；返回一个取消订阅函数。                                                                                                                                         |
| `getSnapshot()`                          | 读取当前 snapshot（引用稳定）。                                                                                                                                                               |
| `setActive(target)`                      | 在目录点击处理程序中调用（传入 `string` ID 或 `HTMLElement`）；绕过正常的滚动算法并锁定高亮，直到用户下次滚动为止。                                                      |
| `isActive(target)`                       | 判断给定的 ID 或元素当前是否活跃。                                                                                                                                                         |
| `setOptions(patch)`                      | 更新选项；`root` / `direction` / `mediaQuery` 的变化会触发内部重新绑定，其他字段在下一次求值时生效。没有实质性字段变化时为无操作。                           |
| `setTargets(targets)`                    | 替换目标集合（输入参数语义与构造函数相同）并触发完整重新初始化。                                                                                     |
| `refresh()`                              | 重新解析 getter/selector 并立即重新计算目标位置——在添加/删除章节或懒加载内容挂载后调用。                                                                 |

## 框架集成

该引擎遵循外部存储协议（`subscribe` + `getSnapshot`），因此每个框架只需一层薄薄的响应式适配层。

### React

```tsx
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createActiveScroll } from "scroll-active-toc";

function useActiveSection(targets: string[]) {
	const ref = useRef<ReturnType<typeof createActiveScroll> | null>(null);
	if (ref.current === null)
		ref.current = createActiveScroll(targets);
	const controller = ref.current;

	useEffect(() => {
		controller.start();
		return () => controller.destroy();
	}, [controller]);

	return useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		() => ({ activeElement: null, activeId: "", activeIndex: -1 }),
	);
}
```

需要功能完整的 React Hook（ref 目标、`debug` overlay 等）？请使用基于本包构建的 [`scroll-active-toc`](https://www.npmjs.com/package/scroll-active-toc)。

### 水平滚动

设置 `direction: "horizontal"` 来追踪水平滚动容器。左侧的固定覆盖层使用相同的 `overlay` 选项（其宽度），配合 `scroll-margin-left`：

```ts
const controller = createActiveScroll(ids, {
	root: () => document.querySelector(".scroll-container"),
	direction: "horizontal",
});
```

```css
.scroll-container {
	display: flex;
	overflow-x: auto;
	scroll-behavior: smooth;
}
```

## Debug overlay（触发线可视化）

在调优 `overlay`、`offset` 和 `edges` 时，可视化激活算法所使用的确切触发线：

```ts
import { createDebugOverlay } from "scroll-active-toc";

const overlay = createDebugOverlay({
	root: null, // 解析后的容器元素，window 根元素为 null
	direction: "vertical",
	overlay: 0,
	edges: { first: true, last: true },
	offset: { toStart: 0, toEnd: 0 },
	label: true,
	className: "",
});

document.body.appendChild(overlay.el);
// overlay.update(config) 用新值重绘；overlay.destroy() 移除它
```

- **窗口滚动：** 包装器使用 `position: fixed`，挂载到 `document.body`。
- **容器滚动：** 将其挂载到一个 `position: relative` 的包装器中，与滚动容器同级。

还导出了更低级别的辅助函数：`computeDebugLines(config)` 返回触发线描述符，`groupLines(lines)` 合并重合的线条以便显示。

颜色和层级通过 CSS 自定义属性设置主题（使用内联样式并带有回退值——不会注入样式表）：

| CSS 变量         | 默认值   | 用于                         |
| -------------------- | --------- | -------------------------------- |
| `--uas-debug-line`   | `#22d3ee` | 方向触发线/标签 |
| `--uas-debug-edge`   | `#f59e0b` | 第一/最后边缘线/标签     |
| `--uas-debug-bg`     | `#ffffff` | 标签背景                 |
| `--uas-debug-z-index`| `9999`    | Overlay 堆叠顺序           |

## 服务端渲染

构造函数不会触碰任何 DOM；监听器绑定和初始求值只在 `start()` 时发生，因此构造阶段在组件渲染（包括 SSR）期间是安全的。在 hydration 之前，snapshot 保持为 `{ activeElement: null, activeId: "", activeIndex: -1 }`；服务端渲染时将第一个链接渲染为活跃状态以避免闪烁。

## 许可证

[MIT](https://github.com/condorheroblog/scroll-active-toc/blob/main/LICENSE) License © 2026-Present [Condor Hero](https://github.com/condorheroblog)


<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/scroll-active-toc?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmx.dev/package/scroll-active-toc
[npm-downloads-src]: https://img.shields.io/npm/dm/scroll-active-toc?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmx.dev/package/scroll-active-toc
[bundle-src]: https://img.shields.io/bundlephobia/minzip/scroll-active-toc?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=scroll-active-toc
[license-src]: https://img.shields.io/github/license/condorheroblog/scroll-active-toc.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/condorheroblog/scroll-active-toc/blob/main/LICENSE
