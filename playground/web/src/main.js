import $ from "jquery";
import { createActiveScroll, createDebugOverlay } from "scroll-active-toc";

import { C_PANELS, H_PANELS, SECTIONS } from "./content";
import { applyI18n, getInitialLang, MESSAGES, storeLang } from "./i18n";
// style.css is loaded via a render-blocking <link> in index.html (prevents the
// unstyled flash that happens when CSS is injected after the JS module runs).

const REPO_URL = "https://github.com/condorheroblog/scroll-active-toc";
const GATE_QUERY = "(min-width: 768px)";

const DEFAULT_SETTINGS = Object.freeze({
	hash: "replace",
	overlay: 64,
	offsetStart: 0,
	offsetEnd: 0,
	firstForce: true,
	firstDist: 80,
	lastForce: true,
	lastDist: 80,
	mq: false,
	debug: false,
	hDebug: false,
	cDebug: false,
});

const settings = { ...DEFAULT_SETTINGS };

let lang = getInitialLang();
let mainController = null;
let hController = null;
let cController = null;
let mainOverlay = null;
let hOverlay = null;
let cOverlay = null;

/* ============================== helpers ============================== */

const CHECK_SVG = "<svg class=\"mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 6 9 17l-5-5\"/></svg>";

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;");
}

function edgeValue(force, distance) {
	return force ? true : distance;
}

/* ============================ rendering ============================= */

function renderSection(section) {
	const body = [];

	for (const para of section.paras)
		body.push(`<p>${escapeHtml(para[lang])}</p>`);

	if (section.list) {
		const items = section.list
			.map(item => `<li class="flex gap-2.5"><span class="mt-0.5 shrink-0 text-emerald-500">${CHECK_SVG}</span><span>${escapeHtml(item[lang])}</span></li>`)
			.join("");
		body.push(`<ul class="space-y-2.5">${items}</ul>`);
	}

	if (section.code)
		body.push(`<pre class="sat-pre sat-scroll"><code>${escapeHtml(section.code)}</code></pre>`);

	let demo = "";
	if (section.kind === "horizontal")
		demo = renderHDemo();
	else if (section.kind === "container")
		demo = renderCDemo();

	return `
<section id="${section.id}" data-section class="sat-section border-t border-slate-200/70 py-12 first:border-t-0 dark:border-white/5 sm:py-16">
	<span class="inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">${escapeHtml(section.tag[lang])}</span>
	<h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">${escapeHtml(section.title[lang])}</h2>
	<div class="mt-5 space-y-5 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
		${body.join("")}
	</div>
	${demo}
</section>`;
}

function renderHDemo() {
	const pills = H_PANELS
		.map(p => `<a href="#${p.id}" data-h-target="${p.id}" class="mini-link sat-scroll">${escapeHtml(p.title[lang])}</a>`)
		.join("");

	const panels = H_PANELS.map((p) => {
		const paras = p.paras.map(x => `<p>${escapeHtml(x[lang])}</p>`).join("");
		return `
<article id="${p.id}" data-h-panel class="w-[80%] shrink-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:w-[62%] lg:w-[54%]">
	<p class="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">scrollLeft</p>
	<h3 class="mt-1 text-lg font-bold text-slate-900 dark:text-white">${escapeHtml(p.title[lang])}</h3>
	<div class="mt-3 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">${paras}</div>
</article>`;
	}).join("");

	return `
<div class="mt-8 rounded-2xl border border-slate-200 bg-slate-100/60 p-1.5 dark:border-white/10 dark:bg-white/[0.02]">
	<div class="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
		<nav class="flex gap-2 overflow-x-auto sat-scroll" data-h-toc aria-label="Horizontal demo toc">${pills}</nav>
		<label class="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
			<input type="checkbox" data-h-debug class="sat-check" ${settings.hDebug ? "checked" : ""} />
			<span data-i18n="demo_debug_show">Show trigger lines</span>
		</label>
	</div>
	<p class="px-3 pb-2 text-xs leading-5 text-slate-500 dark:text-slate-400" data-i18n="demo_h_tip"></p>
	<div class="relative overflow-hidden rounded-xl">
		<div data-h-root class="sat-h-scroll sat-scroll flex gap-4 overflow-x-auto bg-slate-50 p-5 dark:bg-[#0a1118]">${panels}</div>
		<div data-h-overlay class="pointer-events-none absolute inset-0"></div>
	</div>
</div>`;
}

function renderCDemo() {
	const dots = C_PANELS
		.map(p => `<a href="#${p.id}" data-c-target="${p.id}" class="dot-link">${escapeHtml(p.title[lang])}</a>`)
		.join("");

	const panels = C_PANELS.map((p) => {
		const paras = p.paras.map(x => `<p>${escapeHtml(x[lang])}</p>`).join("");
		return `
<article id="${p.id}" data-c-panel class="scroll-mt-12">
	<h3 class="text-base font-bold text-slate-900 dark:text-emerald-300">${escapeHtml(p.title[lang])}</h3>
	<div class="mt-2 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">${paras}</div>
</article>`;
	}).join("");

	return `
<div class="mt-8 grid gap-5 sm:grid-cols-[170px_minmax(0,1fr)]">
	<div>
		<nav class="flex flex-row flex-wrap gap-x-4 sm:flex-col sm:gap-0" data-c-toc aria-label="Container demo toc">${dots}</nav>
	</div>
	<div>
		<label class="mb-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
			<input type="checkbox" data-c-debug class="sat-check" ${settings.cDebug ? "checked" : ""} />
			<span data-i18n="demo_debug_show">Show trigger lines</span>
		</label>
		<div class="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
			<div data-c-root class="sat-scroll h-[420px] overflow-y-auto overscroll-contain bg-white dark:bg-[#0a1118]">
				<div class="sticky top-0 z-10 flex h-12 items-center border-b border-amber-400/40 bg-amber-50/95 px-4 text-xs font-bold uppercase tracking-wider text-amber-700 backdrop-blur dark:bg-amber-950/80 dark:text-amber-300" data-i18n="demo_c_header">Container scroller</div>
				<div class="space-y-12 p-5 pb-10">${panels}</div>
			</div>
			<div data-c-overlay class="pointer-events-none absolute inset-0 z-20"></div>
		</div>
	</div>
</div>
<p class="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400" data-i18n="demo_c_tip"></p>`;
}

function renderArticle() {
	$("#article").html(SECTIONS.map(renderSection).join(""));
}

function renderNav() {
	const links = SECTIONS.map(s => `
<a href="#${s.id}" data-target="${s.id}" class="toc-link sat-toc-link">${escapeHtml(s.title[lang])}</a>`).join("");
	$("#toc").html(links);

	const chips = SECTIONS.map(s => `
<a href="#${s.id}" data-target="${s.id}" class="chip-link sat-toc-link">${escapeHtml(s.title[lang])}</a>`).join("");
	$("#mobile-toc-track").html(chips);
}

function renderAll() {
	destroySubDemos();
	renderArticle();
	renderNav();
	applyI18n(lang);
	$("#lang-label").text(lang === "zh" ? "中" : "EN");
}

/* ===================== sub-demo engines/overlays ===================== */

function destroySubDemos() {
	hController?.destroy();
	cController?.destroy();
	hController = null;
	cController = null;
	hOverlay?.destroy();
	cOverlay?.destroy();
	hOverlay = null;
	cOverlay = null;
}

function makeSubOverlay(slot, rootEl, direction, overlay) {
	const overlayEl = createDebugOverlay({
		root: rootEl,
		direction,
		overlay,
		edges: { first: true, last: true },
		offset: { toStart: 0, toEnd: 0 },
		label: true,
	});
	slot.appendChild(overlayEl.el);
	return overlayEl;
}

function setupSubDemos() {
	// ----- horizontal demo -----
	const hRoot = document.querySelector("[data-h-root]");
	if (hRoot) {
		hController = createActiveScroll("[data-h-panel]", {
			root: hRoot,
			direction: "horizontal",
			hash: "off",
		}).start();

		hController.subscribe(({ activeId }) => {
			$("[data-h-target]").each((_, el) => {
				el.classList.toggle("active", el.getAttribute("data-h-target") === activeId);
			});
		});

		if (settings.hDebug)
			hOverlay = makeSubOverlay(document.querySelector("[data-h-overlay]"), hRoot, "horizontal", 0);
	}

	// ----- container demo -----
	const cRoot = document.querySelector("[data-c-root]");
	if (cRoot) {
		cController = createActiveScroll("[data-c-panel]", {
			root: cRoot,
			overlay: 48,
			hash: "off",
		}).start();

		cController.subscribe(({ activeId }) => {
			$("[data-c-target]").each((_, el) => {
				el.classList.toggle("active", el.getAttribute("data-c-target") === activeId);
			});
		});

		if (settings.cDebug)
			cOverlay = makeSubOverlay(document.querySelector("[data-c-overlay]"), cRoot, "vertical", 48);
	}
}

/* ========================== main controller ========================== */

function mainOptions() {
	return {
		hash: settings.hash,
		overlay: settings.overlay,
		offset: { toStart: settings.offsetStart, toEnd: settings.offsetEnd },
		edges: {
			first: edgeValue(settings.firstForce, settings.firstDist),
			last: edgeValue(settings.lastForce, settings.lastDist),
		},
		mediaQuery: settings.mq ? GATE_QUERY : "",
	};
}

function mainOverlayConfig() {
	return {
		root: null,
		direction: "vertical",
		overlay: settings.overlay,
		edges: {
			first: edgeValue(settings.firstForce, settings.firstDist),
			last: edgeValue(settings.lastForce, settings.lastDist),
		},
		offset: { toStart: settings.offsetStart, toEnd: settings.offsetEnd },
		label: true,
	};
}

function setMainDebugOverlay(visible) {
	if (visible) {
		if (mainOverlay) {
			mainOverlay.update(mainOverlayConfig());
		}
		else {
			mainOverlay = createDebugOverlay(mainOverlayConfig());
			document.body.appendChild(mainOverlay.el);
		}
	}
	else {
		mainOverlay?.destroy();
		mainOverlay = null;
	}
}

function applyMainOptions() {
	mainController.setOptions(mainOptions());
	setMainDebugOverlay(settings.debug);
	updateStatus();
}

function updateStatus() {
	const snap = mainController?.getSnapshot();
	const gated = settings.mq && !window.matchMedia(GATE_QUERY).matches;

	$("#status-active-id").text(snap?.activeId || "—");
	$("#status-active-index").text(String(snap?.activeIndex ?? -1));

	const dict = MESSAGES[lang];
	const $status = $("#status-enabled");
	if (gated) {
		$status.text((dict?.status_gated) || "gated").removeClass("text-emerald-600 text-emerald-400").addClass("text-amber-500");
	}
	else {
		$status.text((dict?.status_on) || "running").removeClass("text-amber-500").addClass("text-emerald-600 dark:text-emerald-400");
	}
}

/* ============================ config form ============================ */

function syncConfigForm() {
	$("#cfg-hash").val(settings.hash);
	$("#cfg-overlay").val(settings.overlay);
	$("#cfg-overlay-val").text(`${settings.overlay}px`);
	$("#cfg-offset-start").val(settings.offsetStart);
	$("#cfg-offset-start-val").text(`${settings.offsetStart}px`);
	$("#cfg-offset-end").val(settings.offsetEnd);
	$("#cfg-offset-end-val").text(`${settings.offsetEnd}px`);
	$("#cfg-first-force").prop("checked", settings.firstForce);
	$("#cfg-last-force").prop("checked", settings.lastForce);
	$("#cfg-first-distance").val(settings.firstDist).prop("disabled", settings.firstForce);
	$("#cfg-last-distance").val(settings.lastDist).prop("disabled", settings.lastForce);
	$("#cfg-first-distance-val").text(`${settings.firstDist}px`);
	$("#cfg-last-distance-val").text(`${settings.lastDist}px`);
	$("#cfg-mq").prop("checked", settings.mq);
	$("#cfg-debug").prop("checked", settings.debug);
}

function bindConfigForm() {
	$("#cfg-hash").on("change", function () {
		settings.hash = this.value;
		applyMainOptions();
	});

	$("#cfg-overlay").on("input", function () {
		settings.overlay = Number(this.value);
		$("#cfg-overlay-val").text(`${settings.overlay}px`);
		applyMainOptions();
	});

	$("#cfg-offset-start").on("input", function () {
		settings.offsetStart = Number(this.value);
		$("#cfg-offset-start-val").text(`${settings.offsetStart}px`);
		applyMainOptions();
	});

	$("#cfg-offset-end").on("input", function () {
		settings.offsetEnd = Number(this.value);
		$("#cfg-offset-end-val").text(`${settings.offsetEnd}px`);
		applyMainOptions();
	});

	$("#cfg-first-force").on("change", function () {
		settings.firstForce = this.checked;
		$("#cfg-first-distance").prop("disabled", this.checked);
		applyMainOptions();
	});

	$("#cfg-last-force").on("change", function () {
		settings.lastForce = this.checked;
		$("#cfg-last-distance").prop("disabled", this.checked);
		applyMainOptions();
	});

	$("#cfg-first-distance").on("input", function () {
		settings.firstDist = Number(this.value);
		$("#cfg-first-distance-val").text(`${settings.firstDist}px`);
		applyMainOptions();
	});

	$("#cfg-last-distance").on("input", function () {
		settings.lastDist = Number(this.value);
		$("#cfg-last-distance-val").text(`${settings.lastDist}px`);
		applyMainOptions();
	});

	$("#cfg-mq").on("change", function () {
		settings.mq = this.checked;
		applyMainOptions();
	});

	$("#cfg-debug").on("change", function () {
		settings.debug = this.checked;
		applyMainOptions();
	});

	$("#cfg-reset").on("click", () => {
		Object.assign(settings, DEFAULT_SETTINGS);
		syncConfigForm();
		applyMainOptions();
	});
}

/* ============================== panel UI ============================= */

function openPanel() {
	$("#config-backdrop").removeClass("hidden");
	requestAnimationFrame(() => $("#config-panel").addClass("is-open"));
}

function closePanel() {
	$("#config-panel").removeClass("is-open");
	$("#config-backdrop").addClass("hidden");
}

function bindPanel() {
	$("#config-open, #config-fab, #hero-config").on("click", openPanel);
	$("#config-close, #config-backdrop").on("click", closePanel);
	$(document).on("keydown", (event) => {
		if (event.key === "Escape")
			closePanel();
	});
}

/* ============================ theme & lang =========================== */

function bindChrome() {
	$("#theme-toggle").on("click", () => {
		const nextDark = !document.documentElement.classList.contains("dark");
		document.documentElement.classList.toggle("dark", nextDark);
		try {
			localStorage.setItem("sat-theme", nextDark ? "dark" : "light");
		}
		catch { /* ignore */ }
	});

	$("#lang-toggle").on("click", () => {
		lang = lang === "en" ? "zh" : "en";
		storeLang(lang);
		switchLanguage();
	});
}

function switchLanguage() {
	renderAll();
	requestAnimationFrame(() => {
		mainController.refresh();
		setupSubDemos();
		setMainDebugOverlay(settings.debug);
		syncMainLinkState();
		updateStatus();
	});
}

/* =========================== scroll & clicks ========================= */

function syncMainLinkState(snap = mainController?.getSnapshot()) {
	$(".sat-toc-link").each((_, el) => {
		el.classList.toggle("active", el.getAttribute("data-target") === (snap?.activeId || ""));
	});
}

function scrollWindowTo(id) {
	if (id === "top") {
		window.scrollTo({ top: 0, behavior: "smooth" });
		return;
	}
	const el = document.getElementById(id);
	if (el)
		el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollInside(rootEl, targetEl, axis) {
	const rootRect = rootEl.getBoundingClientRect();
	const tRect = targetEl.getBoundingClientRect();
	if (axis === "horizontal") {
		const left = rootEl.scrollLeft + (tRect.left - rootRect.left);
		rootEl.scrollTo({ left, behavior: "smooth" });
	}
	else {
		// 48px clearance for the sticky sub-header of the container demo
		const top = rootEl.scrollTop + (tRect.top - rootRect.top) - 48;
		rootEl.scrollTo({ top, behavior: "smooth" });
	}
}

function updateProgress() {
	const doc = document.documentElement;
	const max = doc.scrollHeight - window.innerHeight;
	const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
	$("#scroll-progress").css("width", `${ratio * 100}%`);
}

function bindScrolls() {
	// Window-level links (desktop TOC, mobile chips, hero CTA, logo)
	$(document).on("click", ".sat-toc-link, a.sat-jump", function (event) {
		event.preventDefault();
		const id = this.getAttribute("data-target") || this.getAttribute("href")?.slice(1);
		if (!id)
			return;
		mainController.setActive(id);
		syncMainLinkState();
		scrollWindowTo(id);
	});

	// Horizontal demo links
	$(document).on("click", "[data-h-target]", function (event) {
		event.preventDefault();
		const id = this.getAttribute("data-h-target");
		const rootEl = document.querySelector("[data-h-root]");
		const targetEl = document.getElementById(id);
		if (!rootEl || !targetEl)
			return;
		hController.setActive(id);
		scrollInside(rootEl, targetEl, "horizontal");
	});

	// Container demo links
	$(document).on("click", "[data-c-target]", function (event) {
		event.preventDefault();
		const id = this.getAttribute("data-c-target");
		const rootEl = document.querySelector("[data-c-root]");
		const targetEl = document.getElementById(id);
		if (!rootEl || !targetEl)
			return;
		cController.setActive(id);
		scrollInside(rootEl, targetEl, "vertical");
	});

	// Sub-demo debug toggles (re-rendered on language switch)
	$(document).on("change", "[data-h-debug]", function () {
		settings.hDebug = this.checked;
		hOverlay?.destroy();
		hOverlay = null;
		if (this.checked) {
			const rootEl = document.querySelector("[data-h-root]");
			hOverlay = makeSubOverlay(document.querySelector("[data-h-overlay]"), rootEl, "horizontal", 0);
		}
	});

	$(document).on("change", "[data-c-debug]", function () {
		settings.cDebug = this.checked;
		cOverlay?.destroy();
		cOverlay = null;
		if (this.checked) {
			const rootEl = document.querySelector("[data-c-root]");
			cOverlay = makeSubOverlay(document.querySelector("[data-c-overlay]"), rootEl, "vertical", 48);
		}
	});

	// Scroll progress bar (rAF throttled)
	let ticking = false;
	window.addEventListener("scroll", () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(() => {
				updateProgress();
				ticking = false;
			});
		}
	}, { passive: true });

	window.matchMedia(GATE_QUERY).addEventListener("change", updateStatus);
}

/* =============================== boot =============================== */

function init() {
	// Ensure the GitHub link is set programmatically as well as in markup
	$("#github-link").attr("href", REPO_URL);

	mainController = createActiveScroll("[data-section]", {
		direction: "vertical",
		hash: settings.hash,
		overlay: settings.overlay,
		offset: { toStart: settings.offsetStart, toEnd: settings.offsetEnd },
		edges: { first: true, last: true },
	});

	mainController.subscribe((snap) => {
		syncMainLinkState(snap);
		updateStatus();
	});

	bindChrome();
	bindPanel();
	bindConfigForm();
	bindScrolls();

	renderAll();
	syncConfigForm();

	mainController.start();

	requestAnimationFrame(() => {
		setupSubDemos();
		syncMainLinkState();
		updateProgress();
		updateStatus();
	});
}

$(init);
