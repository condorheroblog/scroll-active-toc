# Scroll Active TOC

<p align="center">
  <img src="https://condorheroblog.github.io/scroll-active-toc/favicon.svg" alt="Scroll Active TOC logo" width="96" />
</p>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

Live Demo: https://condorheroblog.github.io/scroll-active-toc/

> A framework-agnostic scroll-spy engine that tracks the currently active section while scrolling. Ideal for highlighting table-of-contents and sidebar links from vanilla JS, React, Vue, Solid, jQuery, or any other environment.

**English** | [中文](https://github.com/condorheroblog/scroll-active-toc/blob/main/README.zh-CN.md)

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) API makes it hard, if not impossible, to:

- Highlight a clicked link even if it will never intersect
- Always highlight the first/last link once the top/bottom of the page is reached
- Get consistent results regardless of scroll speed
- Immediately highlight links on click or hash navigation when smooth scrolling is enabled

**scroll-active-toc** implements a custom scroll observer that adapts to any scroll behavior — CSS `scroll-behavior`, `scrollIntoView` or JS animation libraries — and always reports the "correct" active target.

### What it doesn't do

- Scroll to targets
- Mutate the DOM or inject styles (the opt-in [debug overlay](#debug-overlay-trigger-lines) is the single exception, and only when you mount its node)
- Require or configure hash navigation

## Installation

```bash
npm i scroll-active-toc
# pnpm add scroll-active-toc
# yarn add scroll-active-toc
```

## Quick Start

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

// On teardown:
// controller.destroy();
```

Add smooth scrolling somewhere in your global CSS:

```css
html {
	scroll-behavior: smooth; /* or 'auto' */
}
```

> [!TIP]
> Always call `setActive(id)` in your click handler: it makes highlighting immediate and consistent regardless of scroll speed or easing.

## Targets

The first argument accepts any of the following:

```ts
import type { TargetsSource } from "scroll-active-toc";

const bySelector: TargetsSource = "main section[id]"; // re-queried on init/refresh
const byIds: TargetsSource = ["introduction", "quick-start"];
const byElements: TargetsSource = [headingEl1, headingEl2]; // also NodeList / HTMLCollection
const byGetter: TargetsSource = () => document.querySelectorAll("section[id]");
```

A getter carries the deferred-value semantics of a React `RefObject`, a Vue `ref` or a Solid accessor — the engine calls it whenever the current value is needed.

## Root (scroll container)

By default the window/document root is tracked. Pass an `HTMLElement` to track a scrolling container, or a getter for deferred access (e.g. `ref.current`). `null` means the window root.

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

## Options

```ts
const controller = createActiveScroll(targets, {
	direction: "vertical", // scroll axis: "vertical" | "horizontal"
	root: null, // scrolling element (or getter), window root by default
	overlay: 0, // fixed overlay size along the scroll axis, in px
	mediaQuery: "", // CSS media query gate, e.g. "(min-width: 768px)"
	hash: "off", // sync URL hash: "off" | "replace" | "push"
	edges: { first: true, last: true }, // edge activation strategy
	offset: 0, // boundary offset, number or { toStart, toEnd }
	onChange(snapshot) {}, // active-state change callback
});
```

| Property   | Type                                                                      | Default                      | Description                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| direction  | `'vertical' \| 'horizontal'`                                              | `'vertical'`                 | Scroll axis to track. `'horizontal'` watches `scrollLeft` instead of `scrollTop` (RTL is not supported yet).                                                                                                                                                                                |
| root       | `HTMLElement \| null \| (() => HTMLElement \| null)`                      | null                         | Scrolling element (or a getter). Set it only if your content **is not scrolled** by the window. If _null_, defaults to the document root.                                                                                                                                                   |
| edges      | `{ first?: boolean \| number, last?: boolean \| number }`                 | `{ first: true, last: true }` | Activation strategy for the first/last target. `true` always activates the edge target at the start/end even if not intersecting. A `number` allows "no active target": the first target activates early when within that distance of the trigger line; the last deactivates after its end passes the line by that distance. `false` equals `0`. |
| overlay    | `number`                                                                  | 0                            | Size in px of any **CSS fixed** content overlapping the start of the scrolling area along the scroll axis — a fixed header (vertical) or a fixed side panel (horizontal). Must be paired with `scroll-margin-top` / `scroll-margin-left` on your targets.                                    |
| mediaQuery | `string`                                                                  | `''`                         | A CSS media query, e.g. `'(min-width: 768px)'`; listeners are enabled only while it matches. An invalid query is ignored (with a console warning) and listeners stay always enabled; the same applies when it is omitted.                                                                   |
| hash       | `'off' \| 'replace' \| 'push'`                                            | `'off'`                      | Sync URL hash while scrolling. `replace` updates the current history entry, `push` creates a new one. The first target is skipped if `edges.first` is `true`.                                                                                                                               |
| offset     | `number \| { toStart?: number, toEnd?: number }`                          | `{ toStart: 0, toEnd: 0 }`   | Boundary offset in px per scroll direction (`toStart` when scrolling towards the start, `toEnd` towards the end). A single number applies to both. Tweak to "anticipate" or "delay" target detection.                                                                                        |
| onChange   | `(snapshot: ActiveScrollSnapshot) => void`                                | —                            | Active-state change callback; equivalent to a single `subscribe` (removed on `destroy`).                                                                                                                                                                                                    |

## Snapshot

`getSnapshot()` returns a frozen, reference-stable object — a new reference is created only when the active target actually changes, so it works directly with external-store protocols such as React's `useSyncExternalStore`.

| Field         | Type                   | Description                                                                 |
| ------------- | ---------------------- | --------------------------------------------------------------------------- |
| activeElement | `HTMLElement \| null`  | The active target element.                                                  |
| activeId      | `string`               | The active target ID, an empty string when inactive.                        |
| activeIndex   | `number`               | Index of the active target in offset order, `-1` when inactive.             |

## Controller

The object returned by `createActiveScroll` exposes an explicit lifecycle plus the external-store protocol:

| Method                                   | Description                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start()`                                | Binds scroll / matchMedia / ResizeObserver / popstate listeners and performs the initial activation. Idempotent; returns the controller.                                                                    |
| `stop()`                                 | Unbinds all listeners and cancels timers/rAF. Options and subscriptions are retained, so `start()` works again.                                                                                             |
| `destroy()`                              | Equivalent to `stop()` plus clearing all subscriptions; the instance must not be used afterwards.                                                                                                            |
| `subscribe(listener)`                    | Subscribes to active-state changes; returns an unsubscribe function.                                                                                                                                         |
| `getSnapshot()`                          | Reads the current snapshot (stable reference).                                                                                                                                                               |
| `setActive(target)`                      | Call from a TOC click handler (`string` ID or `HTMLElement`); bypasses the normal scroll algorithm and locks the highlight until the next user scroll.                                                      |
| `isActive(target)`                       | Whether the given ID or element is currently active.                                                                                                                                                         |
| `setOptions(patch)`                      | Updates options; `root` / `direction` / `mediaQuery` changes trigger an internal rebind, other fields take effect on the next evaluation. A no-op when no material field changed.                           |
| `setTargets(targets)`                    | Replaces the target collection (same input semantics as the constructor argument) and triggers a full re-initialization.                                                                                     |
| `refresh()`                              | Re-resolves the getter/selector and recomputes target positions immediately — call after sections are added/removed or lazy content mounts.                                                                 |

## Framework integration

The engine speaks the external-store protocol (`subscribe` + `getSnapshot`), so each framework only needs a thin reactive layer.

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

For a full-featured React hook (ref-based targets, `debug` overlay and more), use [`scroll-active-toc`](https://www.npmjs.com/package/scroll-active-toc), which is built on top of this package.

### Horizontal scrolling

Set `direction: "horizontal"` to track a horizontally scrolling container. Fixed overlays on the left use the same `overlay` option (their width), paired with `scroll-margin-left`:

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

## Debug overlay (trigger lines)

Visualize the exact trigger lines used by the activation algorithm while tuning `overlay`, `offset`, and `edges`:

```ts
import { createDebugOverlay } from "scroll-active-toc";

const overlay = createDebugOverlay({
	root: null, // resolved container element, null for window root
	direction: "vertical",
	overlay: 0,
	edges: { first: true, last: true },
	offset: { toStart: 0, toEnd: 0 },
	label: true,
	className: "",
});

document.body.appendChild(overlay.el);
// overlay.update(config) redraws with new values; overlay.destroy() removes it
```

- **Window scrolling:** the wrapper is `position: fixed`, mount it on `document.body`.
- **Container scrolling:** mount it inside a `position: relative` wrapper as a sibling of the scroll container.

Lower-level helpers are also exported: `computeDebugLines(config)` returns the trigger-line descriptors, and `groupLines(lines)` merges coincident lines for display.

Colors and stacking are themed through CSS custom properties (inline styles with fallbacks — no stylesheet is injected):

| CSS variable         | Default   | Used for                         |
| -------------------- | --------- | -------------------------------- |
| `--uas-debug-line`   | `#22d3ee` | Directional trigger lines/labels |
| `--uas-debug-edge`   | `#f59e0b` | First/last edge lines/labels     |
| `--uas-debug-bg`     | `#ffffff` | Label background                 |
| `--uas-debug-z-index`| `9999`    | Overlay stacking order           |

## Server-side rendering

The constructor touches no DOM; listeners are bound and the initial evaluation happens only on `start()`, so construction is safe during component rendering (including SSR). The snapshot stays `{ activeElement: null, activeId: "", activeIndex: -1 }` until hydration; render the first link as active on the server to avoid a flash.

## License

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
