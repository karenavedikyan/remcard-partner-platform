/**
 * RemCard general-prototype reviewer numbering (annotation-only, in-memory).
 */
(function () {
  "use strict";

  const UI_ATTR = "data-proto-numbering-ui";
  const TARGET_ATTR = "data-proto-number";
  const BADGE_HOST_CLASS = "proto-num-badges-host";
  const TRANSIENT_CLASS = /^(is-|has-|was-|js-|proto-num-|open$|selected$|active$|pressed$|highlight|current$|disabled$|loading$|pending$|checked$)/i;

  const NS_LABELS = { 1: "общий вход", 2: "клиент", 3: "партнёр", 4: "админ" };

  const CANDIDATE_SELECTOR = [
    "main",
    "[role='main']",
    "#main",
    "#app",
    ".content",
    "section",
    "article",
    ".panel",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "tr",
    "th",
    "td",
    "strong",
    "small",
    "span",
    "div.stat",
    "div.step",
    ".nav-btn",
    ".btn",
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    "label",
    "details",
    "summary",
    "dialog",
    "img",
    "svg",
    "[role='button']",
    "[role='tab']",
    "[role='dialog']",
    "[role='link']",
    "[role='menuitem']",
    "[data-testid]",
    "[data-action]",
    ".stat",
    ".action-line",
    ".hero-task",
    ".ca-row",
    ".collection-open",
    ".wallet-accrual-row",
    "table",
    ".role-grid",
    ".proto-launch",
    ".role",
    ".work-row",
    ".nav-stage-button",
  ].join(",");

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "LINK", "META", "TITLE", "HEAD"]);

  let enabled = true;
  let panelOpen = false;
  let badgeHost = null;
  let chromeEl = null;
  let panelEl = null;
  let toggleBtn = null;
  let panelBtn = null;
  let searchEl = null;
  let listEl = null;
  let metaEl = null;
  let copyStatusEl = null;
  let copyFieldEl = null;
  let registry = [];
  let registryByRef = new Map();
  let highlightEl = null;
  let observer = null;
  let rescanTimer = null;
  let scrollBound = false;
  let scanning = false;
  let modalDockSyncBound = false;
  /** @type {HTMLDialogElement | null} */
  let dockedDialog = null;
  let lastAppModalOpen = false;

  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function isAnnotationUi(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.hasAttribute(UI_ATTR)) return true;
    if (el.classList?.contains(BADGE_HOST_CLASS)) return true;
    if (el.hasAttribute(TARGET_ATTR) && el.classList?.contains("proto-num-badge")) return true;
    return !!el.closest(`[${UI_ATTR}]`);
  }

  function detectNamespace() {
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("/client/")) return 2;
    if (p.includes("/partner/")) return 3;
    if (p.includes("/admin/")) return 4;
    return 1;
  }

  function pageFileKey() {
    const file = (location.pathname || "").split("/").pop() || "index.html";
    return file.replace(/\.html?$/i, "");
  }

  function filteredSearchParams() {
    const allow = new Set(["rc_demo_release", "role", "open", "demo"]);
    const q = new URLSearchParams(location.search);
    const parts = [];
    allow.forEach((k) => {
      const v = q.get(k);
      if (v != null && v !== "") parts.push(`${k}=${v}`);
    });
    parts.sort();
    return parts.join("&");
  }

  function appendClientAdminSpaState(bits, ns) {
    if (ns !== 2 && ns !== 4) return;
    const go =
      document.querySelector('[data-action="go"][aria-current="page"]') ||
      document.querySelector('[data-action="go"][aria-selected="true"]') ||
      document.querySelector('[data-action="go"].is-active[data-view]') ||
      document.querySelector('nav [data-action="go"].is-active') ||
      document.querySelector('[data-action="go"].is-active');
    if (go) {
      const view = go.getAttribute("data-view") || "";
      if (view) bits.push(`view=${view}`);
      const href = go.getAttribute("href") || "";
      if (!view && href.startsWith("#")) {
        const route = href.replace(/^#\/?/, "").split(/[?#]/)[0];
        if (route) bits.push(`route=${route}`);
      }
      if (!view && !href) {
        bits.push(`navtext=${(go.textContent || "").trim().slice(0, 40)}`);
      }
    }
    const shellView =
      document.querySelector("main[data-view], #app[data-view], [data-admin-screen], [data-client-screen]");
    if (shellView) {
      const sv =
        shellView.getAttribute("data-view") ||
        shellView.getAttribute("data-admin-screen") ||
        shellView.getAttribute("data-client-screen");
      if (sv) bits.push(`screen=${sv}`);
    }
    const hashRoute = (location.hash || "").replace(/^#\/?/, "").split(/[?]/)[0];
    if (hashRoute && hashRoute !== "/" && !bits.some((b) => b.startsWith("route=") || b.startsWith("view="))) {
      bits.push(`hashroute=${hashRoute}`);
    }
    const sub =
      document.querySelector("[data-subview][aria-current='true'], [data-subview].is-active, [data-panel][aria-current='page']");
    if (sub) {
      const subId = sub.getAttribute("data-subview") || sub.getAttribute("data-panel");
      if (subId) bits.push(`sub=${subId}`);
    }
    const entity =
      document.querySelector(
        "[data-entity-id][data-detail-open], [data-admin-entity-id], [data-testid='admin-entity-detail'], [data-testid*='detail-panel']",
      ) || document.querySelector("dialog[open] [data-entity-id], dialog[open] [data-id]");
    if (entity) {
      const eid =
        entity.getAttribute("data-entity-id") ||
        entity.getAttribute("data-admin-entity-id") ||
        entity.getAttribute("data-id") ||
        entity.getAttribute("data-testid");
      if (eid) bits.push(`entity=${String(eid).slice(0, 48)}`);
    }
    const openDlg = document.querySelector(`dialog[open]:not([${UI_ATTR}])`);
    if (openDlg) {
      const dlgTitle =
        openDlg.querySelector("h1, h2, [aria-labelledby]")?.textContent?.trim().slice(0, 40) ||
        openDlg.getAttribute("aria-label")?.slice(0, 40) ||
        openDlg.id ||
        "dialog";
      bits.push(`dlg=${dlgTitle}`);
    }
  }

  function readPrototypeState() {
    const bits = [];
    const ns = detectNamespace();
    appendClientAdminSpaState(bits, ns);
    const role = document.querySelector('[data-testid="scenario-role"]');
    if (role?.value) bits.push(`role=${role.value}`);
    const rel = document.querySelector('[data-testid="prototype-release"]');
    if (rel?.value) bits.push(`release=${rel.value}`);
    const nav =
      document.querySelector(".nav-btn[aria-current='page']") ||
      document.querySelector(".nav-stage-button.selected") ||
      document.querySelector("[data-action^='wf-nav-'].selected") ||
      document.querySelector(".sidebar nav .nav-btn[aria-current='page']");
    if (nav) {
      const act = nav.getAttribute("data-action");
      if (act) bits.push(`nav=${act}`);
      else bits.push(`navtext=${(nav.textContent || "").trim().slice(0, 40)}`);
    }
    const viewCab = document.querySelector('[data-action="view:cabinet"][aria-pressed="true"]');
    if (viewCab) bits.push("screen=cabinet");
    const viewReg = document.querySelector('[data-action="view:registration"][aria-pressed="true"]');
    if (viewReg) bits.push("screen=registration");
    const hash = location.hash || "";
    if (hash && !bits.some((b) => b.startsWith("hashroute="))) bits.push(`hash=${hash}`);
    const fs = filteredSearchParams();
    if (fs) bits.push(`qs=${fs}`);
    const legacyNav = document.querySelector(
      "#app .nav a.active, #app .nav-link.is-active, .nav a.is-active, a.nav-link.is-active",
    );
    if (legacyNav?.getAttribute("href")) bits.push(`legacynav=${legacyNav.getAttribute("href")}`);
    return bits.join("|");
  }

  function pageStateKey(ns) {
    return `${ns}|${pageFileKey()}|${readPrototypeState()}`;
  }

  function formatRef(ns, pageHash, elemHash) {
    const p = (pageHash % 10000).toString().padStart(4, "0");
    const e = (elemHash % 100000).toString().padStart(5, "0");
    return `${ns}.${p}.${e}`;
  }

  function stableClassToken(el) {
    return [...el.classList]
      .filter((c) => c && !TRANSIENT_CLASS.test(c) && !c.startsWith("proto-num-"))
      .sort()
      .slice(0, 3)
      .join(".");
  }

  function directLabelText(el) {
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
    let out = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent;
    }
    return out.trim().replace(/\s+/g, " ");
  }

  function associatedLabelText(el) {
    if (el.id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (forLabel && !isAnnotationUi(forLabel)) {
        const t = (forLabel.innerText || forLabel.textContent || "").trim().replace(/\s+/g, " ");
        if (t) return t;
      }
    }
    const wrap = el.closest("label");
    if (wrap && !isAnnotationUi(wrap)) {
      const clone = wrap.cloneNode(true);
      clone.querySelectorAll("input, select, textarea, button").forEach((n) => n.remove());
      const t = (clone.textContent || "").trim().replace(/\s+/g, " ");
      if (t) return t;
    }
    return "";
  }

  /** Visible / accessible copy for reviewer search — does not affect stableKey. */
  function visibleLabelText(el) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter((node) => node && !isAnnotationUi(node))
        .map((node) => (node.innerText || node.textContent || "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ");
      if (text) return text;
    }
    const assoc = associatedLabelText(el);
    if (assoc) return assoc;
    const placeholder = el.getAttribute("placeholder");
    if (placeholder && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      return placeholder.trim();
    }
    const title = el.getAttribute("title");
    if (title) return title.trim();
    const direct = directLabelText(el);
    if (direct) return direct;
    const nested = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    return nested;
  }

  function isTextLeaf(el) {
    const tag = el.tagName;
    return ["SPAN", "SMALL", "STRONG", "EM", "B", "I", "LABEL", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TH", "TD"].includes(tag);
  }

  function ancestorContext(el) {
    const parts = [];
    let node = el.parentElement;
    let depth = 0;
    while (node && node !== document.body && depth < 12) {
      if (isAnnotationUi(node)) break;
      if (SKIP_TAGS.has(node.tagName)) {
        node = node.parentElement;
        continue;
      }
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      const tid = node.getAttribute("data-testid");
      if (tid) part += `[tid=${tid}]`;
      const act = node.getAttribute("data-action");
      if (act) part += `[act=${act}]`;
      const role = node.getAttribute("role");
      if (role) part += `[role=${role}]`;
      if (node.tagName === "DIALOG") {
        const title =
          node.getAttribute("aria-labelledby") ||
          node.querySelector("h2, h3, #accrual-panel-title")?.textContent?.trim().slice(0, 40) ||
          node.id ||
          "dialog";
        part += `{dlg:${title}}`;
      }
      const sc = stableClassToken(node);
      if (sc) part += `.${sc}`;
      const idx = node.parentElement ? [...node.parentElement.children].indexOf(node) : 0;
      parts.unshift(`${part}~${idx}`);
      node = node.parentElement;
      depth++;
    }
    return parts.join("/");
  }

  function stableKey(el) {
    const bits = [];
    if (el.id) bits.push(`id:${el.id}`);
    const tid = el.getAttribute("data-testid");
    if (tid) bits.push(`testid:${tid}`);
    const action = el.getAttribute("data-action");
    if (action) bits.push(`action:${action}`);
    const name = el.getAttribute("name");
    if (name) bits.push(`name:${name}`);
    const type = el.getAttribute("type");
    if (type) bits.push(`type:${type}`);
    const role = el.getAttribute("role");
    if (role) bits.push(`role:${role}`);
    if (el.tagName === "A") bits.push(`href:${el.getAttribute("href") ?? ""}`);
    const aria = el.getAttribute("aria-label");
    if (aria) bits.push(`aria:${aria.slice(0, 80)}`);
    bits.push(`tag:${el.tagName.toLowerCase()}`);
    bits.push(`path:${ancestorContext(el)}`);
    const parent = el.parentElement;
    const sibIdx = parent ? [...parent.children].indexOf(el) : 0;
    bits.push(`sib:${sibIdx}`);
    if (isTextLeaf(el)) {
      const label = directLabelText(el);
      if (label) bits.push(`label:${label.slice(0, 80)}`);
    }
    return bits.join("|");
  }

  function inClosedDialog(el) {
    const dlg = el.closest("dialog");
    return dlg && !dlg.open;
  }

  function isVisible(el) {
    if (!el?.getBoundingClientRect) return false;
    if (isAnnotationUi(el)) return false;
    if (inClosedDialog(el)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function intersectsViewport(r, pad = 0) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return r.bottom >= -pad && r.right >= -pad && r.top <= vh + pad && r.left <= vw + pad;
  }

  function rectsIntersect(a, b, pad = 0) {
    return (
      a.left - pad < b.right + pad &&
      a.right + pad > b.left - pad &&
      a.top - pad < b.bottom + pad &&
      a.bottom + pad > b.top - pad
    );
  }

  function badgeBox(x, y, w, h) {
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  }

  const PROTECTED_CONTROL_SELECTOR =
    "button, a[href], input:not([type='hidden']), select, textarea, label, summary, td, th, caption, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='radio'], .btn, .nav-btn, .nav-link, [data-action], [contenteditable='true']";

  function collectProtectedRects() {
    const rects = [];
    const rectKeys = new Set();
    const pushRect = (r) => {
      if (!r || r.width < 1 || r.height < 1) return;
      if (!intersectsViewport(r, 4)) return;
      const key = `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}`;
      if (rectKeys.has(key)) return;
      rectKeys.add(key);
      rects.push({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      });
    };

    const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !/\S/.test(node.textContent)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isAnnotationUi(parent) || parent.closest(`[${UI_ATTR}]`)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;
        const st = getComputedStyle(parent);
        if (st.display === "none" || st.visibility === "hidden") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (textWalker.nextNode()) {
      const range = document.createRange();
      try {
        range.selectNodeContents(textWalker.currentNode);
        for (const r of range.getClientRects()) pushRect(r);
      } catch {
        /* skip detached */
      }
    }

    document.querySelectorAll(PROTECTED_CONTROL_SELECTOR).forEach((el) => {
      if (isAnnotationUi(el) || el.closest(`[${UI_ATTR}]`)) return;
      if (!isVisible(el)) return;
      pushRect(el.getBoundingClientRect());
    });

    return rects;
  }

  function badgeHitsProtected(x, y, w, h, protectedRects, pad = 2) {
    const box = badgeBox(x, y, w, h);
    for (const r of protectedRects) {
      if (rectsIntersect(box, r, pad)) return true;
    }
    return false;
  }

  function badgeMetricsForRef(ref) {
    const baseH = window.matchMedia("(max-width: 640px)").matches ? 18 : 16;
    const w = Math.min(118, Math.max(90, Math.ceil(ref.length * 6.4) + 12));
    return { badgeW: w, badgeH: baseH };
  }

  function interactiveAncestor(el) {
    return el.closest(
      "button, a[href], label, summary, [role='button'], [role='link'], .nav-btn, .btn",
    );
  }

  function shouldNumber(el, labeledInputs) {
    if (!el || SKIP_TAGS.has(el.tagName)) return false;
    if (isAnnotationUi(el)) return false;
    if (el.closest("[hidden], template")) return false;
    if (!isVisible(el)) return false;
    if (el.tagName === "LABEL") {
      const f = el.htmlFor;
      if (f && labeledInputs.has(f)) return false;
    }
    const outer = interactiveAncestor(el);
    if (outer && outer !== el) {
      if (
        outer.tagName === "BUTTON" ||
        outer.tagName === "A" ||
        outer.classList.contains("btn") ||
        outer.classList.contains("nav-btn")
      ) {
        return false;
      }
    }
    if (el.tagName === "SPAN" || el.tagName === "SMALL" || el.tagName === "STRONG") {
      if ((el.textContent || "").trim().length < 2) return false;
      if (el.children.length > 0 && !el.getAttribute("role")) return false;
    }
    if (el.tagName === "DIV" && el.classList.contains("stat")) return true;
    if (el.tagName === "DIV" && !el.id && !el.getAttribute("data-testid") && !el.getAttribute("data-action")) {
      const t = directLabelText(el);
      if (t.length < 3 && !el.querySelector("button, a, input, select, h1, h2, h3, [data-action]")) return false;
    }
    return true;
  }

  function snippet(el) {
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim();
    const visible = visibleLabelText(el);
    if (visible) return visible.slice(0, 120);
    const tid = el.getAttribute("data-testid");
    if (tid) return `[${tid}]`;
    const action = el.getAttribute("data-action");
    if (action) return action;
    return `<${el.tagName.toLowerCase()}>`;
  }

  function locationHint(el) {
    const dlg = el.closest("dialog[open]");
    if (dlg) {
      const t = dlg.querySelector("h2, h3")?.textContent?.trim().slice(0, 40) || dlg.id || "modal";
      return `модальное · ${t}`;
    }
    const nav = document.querySelector(".nav-btn[aria-current='page']");
    const page = nav?.textContent?.trim() || pageFileKey();
    const region = el.closest("main, #main, #app, section.panel")?.id || "экран";
    return `${page} · ${region}`;
  }

  function clearTargetMarkers() {
    document.querySelectorAll(`[${TARGET_ATTR}]`).forEach((el) => {
      if (!isAnnotationUi(el)) el.removeAttribute(TARGET_ATTR);
    });
  }

  function collectTargets() {
    const labeledInputs = new Set();
    document.querySelectorAll("label[for]").forEach((lb) => {
      if (!isAnnotationUi(lb) && lb.htmlFor) labeledInputs.add(lb.htmlFor);
    });
    const out = [];
    document.querySelectorAll(CANDIDATE_SELECTOR).forEach((el) => {
      if (!shouldNumber(el, labeledInputs)) return;
      out.push(el);
    });
    return out;
  }

  function buildRegistry() {
    scanning = true;
    clearTargetMarkers();
    const ns = detectNamespace();
    const stateKey = pageStateKey(ns);
    const pageHash = fnv1a(stateKey);
    const items = [];
    const usedRefs = new Set();

    collectTargets().forEach((el) => {
      const sk = stableKey(el);
      const seed = `${stateKey}|${sk}`;
      let elemHash = fnv1a(seed);
      let ref = formatRef(ns, pageHash, elemHash);
      let guard = 0;
      while (usedRefs.has(ref) && guard < 32) {
        elemHash += 1;
        ref = formatRef(ns, pageHash, elemHash);
        guard++;
      }
      usedRefs.add(ref);
      el.setAttribute(TARGET_ATTR, ref);
      items.push({
        ref,
        ns,
        el,
        label: snippet(el),
        stableKey: sk,
        location: locationHint(el),
        pageState: stateKey,
      });
    });

    items.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    registry = items;
    registryByRef = new Map(items.map((i) => [i.ref, i]));
    window.__protoNumRegistry = {
      ns,
      nsLabel: NS_LABELS[ns],
      pageState: stateKey,
      page: pageFileKey(),
      logicalState: readPrototypeState(),
      count: items.length,
      items: items.map(({ ref, label, stableKey: sk, location, pageState }) => ({
        ref,
        label,
        stableKey: sk,
        location,
        pageState,
      })),
      resolve(ref) {
        const hit = registryByRef.get(String(ref).trim());
        if (!hit?.el?.isConnected) return null;
        return {
          ref: hit.ref,
          label: hit.label,
          stableKey: hit.stableKey,
          pageState: hit.pageState,
          location: hit.location,
          element: hit.el,
        };
      },
    };
    window.__protoNumResolve = window.__protoNumRegistry.resolve;
    scanning = false;
    return items;
  }

  function clearHighlights() {
    highlightEl?.classList.remove("proto-num-target-highlight");
    highlightEl = null;
    badgeHost?.querySelectorAll(".proto-num-badge--highlight").forEach((b) => {
      b.classList.remove("proto-num-badge--highlight");
    });
  }

  function highlightRef(ref) {
    const item = registryByRef.get(ref);
    if (!item?.el?.isConnected) return;
    clearHighlights();
    highlightEl = item.el;
    highlightEl.classList.add("proto-num-target-highlight");
    highlightEl.scrollIntoView({ block: "center", behavior: "smooth" });
    badgeHost?.querySelector(`[data-proto-ref="${CSS.escape(ref)}"]`)?.classList.add("proto-num-badge--highlight");
  }

  function setCopyFeedback(ok, text) {
    if (copyStatusEl) {
      copyStatusEl.textContent = ok
        ? "Скопировано в буфер."
        : "Буфер недоступен — выделите текст в поле ниже.";
    }
    if (copyFieldEl) {
      copyFieldEl.value = text;
      copyFieldEl.hidden = false;
    }
  }

  async function copyText(text) {
    if (copyFieldEl) copyFieldEl.value = text;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyFeedback(true, text);
        return;
      }
    } catch (e) {
      /* fallback */
    }
    if (copyFieldEl) {
      copyFieldEl.hidden = false;
      copyFieldEl.focus();
      copyFieldEl.select();
      try {
        const ok = document.execCommand("copy");
        setCopyFeedback(ok, text);
      } catch (e2) {
        setCopyFeedback(false, text);
      }
    }
  }

  function placeBadges() {
    if (!badgeHost || !enabled) return;
    badgeHost.textContent = "";
    const placed = [];
    const protectedRects = collectProtectedRects();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 4;
    let visible = 0;
    let hidden = 0;

    function clampPosition(x, y, badgeW, badgeH) {
      return [
        Math.min(Math.max(x, 2), vw - badgeW - 2),
        Math.min(Math.max(y, 2), vh - badgeH - 2),
      ];
    }

    function overlapsPlaced(x, y, badgeW, badgeH) {
      const box = badgeBox(x, y, badgeW, badgeH);
      return placed.some((p) =>
        rectsIntersect(box, badgeBox(p.x, p.y, p.w, p.h), margin),
      );
    }

    const protectPad = window.matchMedia("(max-width: 640px)").matches ? 3 : 2;

    function slotOk(x, y, badgeW, badgeH) {
      return (
        !overlapsPlaced(x, y, badgeW, badgeH) &&
        !badgeHitsProtected(x, y, badgeW, badgeH, protectedRects, protectPad)
      );
    }

    registry.forEach((item) => {
      if (!item.el.isConnected || !isVisible(item.el)) return;
      const r = item.el.getBoundingClientRect();
      if (!intersectsViewport(r, 8)) return;
      const { badgeW, badgeH } = badgeMetricsForRef(item.ref);
      const candidates = [
        [r.right - badgeW - 2, r.top - badgeH - 2],
        [r.right - badgeW - 2, r.bottom + 2],
        [r.left, r.bottom + 2],
        [r.left, r.top - badgeH - 2],
        [r.right + 2, r.top],
        [r.left - badgeW - 2, r.top],
        [r.right + 2, r.bottom - badgeH],
        [r.left - badgeW - 2, r.bottom - badgeH - 2],
      ];
      let x = 0;
      let y = 0;
      let found = false;
      for (const [cx, cy] of candidates) {
        const [px, py] = clampPosition(cx, cy, badgeW, badgeH);
        if (slotOk(px, py, badgeW, badgeH)) {
          x = px;
          y = py;
          found = true;
          break;
        }
      }
      if (!found) {
        for (let ring = 1; ring <= 10 && !found; ring++) {
          for (let tries = 0; tries < 12; tries++) {
            const angle = (tries / 12) * Math.PI * 2;
            const cx = r.left + r.width / 2 + Math.cos(angle) * (r.width / 2 + ring * (badgeH + 4)) - badgeW / 2;
            const cy = r.top + r.height / 2 + Math.sin(angle) * (r.height / 2 + ring * (badgeH + 4)) - badgeH / 2;
            const [px, py] = clampPosition(cx, cy, badgeW, badgeH);
            if (slotOk(px, py, badgeW, badgeH)) {
              x = px;
              y = py;
              found = true;
              break;
            }
          }
        }
      }
      if (!found || badgeHitsProtected(x, y, badgeW, badgeH, protectedRects, protectPad)) {
        item.badgeHidden = true;
        hidden += 1;
        return;
      }
      item.badgeHidden = false;
      visible += 1;
      const badge = document.createElement("span");
      badge.className = "proto-num-badge";
      badge.dataset.protoRef = item.ref;
      badge.title = `${item.ref} · ${item.label}`;
      badge.textContent = item.ref;
      badge.setAttribute("aria-hidden", "true");
      badge.style.left = `${x}px`;
      badge.style.top = `${y}px`;
      badge.style.maxWidth = `${badgeW}px`;
      badgeHost.appendChild(badge);
      placed.push({ x, y, w: badgeW, h: badgeH });
    });

    if (window.__protoNumRegistry) {
      window.__protoNumRegistry.badgePlacement = {
        visible,
        hidden,
        protectedRects: protectedRects.length,
      };
    }
  }

  function renderIndexList(filter) {
    if (!listEl) return;
    const q = (filter || "").trim().toLowerCase();
    listEl.textContent = "";
    registry.forEach((item) => {
      const hay = `${item.ref} ${item.label} ${item.location} ${item.stableKey}`.toLowerCase();
      if (q && !hay.includes(q)) return;
      const li = document.createElement("li");
      li.className = "proto-num-panel__item";
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      const code = document.createElement("code");
      code.textContent = item.ref;
      const span = document.createElement("span");
      const main = document.createTextNode(`${item.label} `);
      const small = document.createElement("small");
      small.style.color = "#888";
      small.textContent = `· ${item.location}`;
      span.append(main, small);
      li.append(code, span);
      const activate = () => {
        highlightRef(item.ref);
        copyText(item.ref);
      };
      li.addEventListener("click", activate);
      li.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activate();
        }
      });
      listEl.appendChild(li);
    });
  }

  function updateMeta() {
    if (!metaEl) return;
    const ns = detectNamespace();
    metaEl.textContent = `${NS_LABELS[ns] || ns} · ${pageFileKey()} · ${readPrototypeState() || "—"} · ${registry.length} в индексе`;
  }

  function activeAppDialog() {
    const open = document.querySelectorAll(`dialog[open]:not([${UI_ATTR}])`);
    return open.length ? open[open.length - 1] : null;
  }

  function appModalOpen() {
    return !!activeAppDialog();
  }

  function moveNodeIfNeeded(node, parent) {
    if (!node || !parent || node.parentNode === parent) return false;
    parent.append(node);
    return true;
  }

  function setClassMembership(el, className, present) {
    if (!el?.classList) return false;
    const has = el.classList.contains(className);
    if (present === has) return false;
    if (present) el.classList.add(className);
    else el.classList.remove(className);
    return true;
  }

  function appendUiToBody() {
    if (!badgeHost || !chromeEl || !panelEl) return;
    moveNodeIfNeeded(badgeHost, document.body);
    moveNodeIfNeeded(chromeEl, document.body);
    moveNodeIfNeeded(panelEl, document.body);
    if (dockedDialog) {
      setClassMembership(dockedDialog, "proto-num-dialog-host", false);
      dockedDialog = null;
    }
  }

  function mountAnnotationInDialog(dlg) {
    if (!dlg || !badgeHost || !chromeEl || !panelEl) return;
    if (dockedDialog && dockedDialog !== dlg) {
      setClassMembership(dockedDialog, "proto-num-dialog-host", false);
    }
    dockedDialog = dlg;
    setClassMembership(dlg, "proto-num-dialog-host", true);
    moveNodeIfNeeded(badgeHost, dlg);
    moveNodeIfNeeded(chromeEl, dlg);
    if (panelOpen && !panelEl.hasAttribute("hidden")) {
      moveNodeIfNeeded(panelEl, dlg);
    } else {
      moveNodeIfNeeded(panelEl, document.body);
    }
  }

  function syncModalDock() {
    const dlg = activeAppDialog();
    setClassMembership(document.documentElement, "proto-num-modal-open", !!dlg);
    if (dlg) mountAnnotationInDialog(dlg);
    else appendUiToBody();
  }

  function onAppModalTransition() {
    syncModalDock();
    const open = appModalOpen();
    if (open !== lastAppModalOpen) {
      lastAppModalOpen = open;
      scheduleRescan();
    } else {
      requestAnimationFrame(placeBadges);
    }
  }

  function bindModalDockSync() {
    if (modalDockSyncBound) return;
    modalDockSyncBound = true;
    document.addEventListener(
      "toggle",
      (ev) => {
        if (ev.target instanceof HTMLDialogElement && !ev.target.hasAttribute(UI_ATTR)) {
          onAppModalTransition();
        }
      },
      true,
    );
    document.addEventListener(
      "beforetoggle",
      (ev) => {
        if (
          ev.target instanceof HTMLDialogElement &&
          !ev.target.hasAttribute(UI_ATTR) &&
          ev.newState === "open"
        ) {
          queueMicrotask(onAppModalTransition);
        }
      },
      true,
    );
  }

  function rescan() {
    syncModalDock();
    if (!enabled) {
      badgeHost && (badgeHost.textContent = "");
      return;
    }
    buildRegistry();
    placeBadges();
    updateMeta();
    if (panelOpen) renderIndexList(searchEl?.value || "");
  }

  function scheduleRescan() {
    if (scanning) return;
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(rescan, 320);
  }

  const DOCK_MARKER_CLASSES = new Set([
    "proto-num-modal-open",
    "proto-num-off",
    "proto-num-dialog-host",
  ]);

  function classMutationIsDockMarkerOnly(mutation) {
    if (mutation.type !== "attributes" || mutation.attributeName !== "class") return false;
    const el = mutation.target;
    if (el === document.documentElement) {
      const prev = (mutation.oldValue || "").trim().split(/\s+/).filter(Boolean);
      const next = [...el.classList];
      const changed = [
        ...next.filter((c) => !prev.includes(c)),
        ...prev.filter((c) => !el.classList.contains(c)),
      ];
      return changed.length > 0 && changed.every((c) => DOCK_MARKER_CLASSES.has(c));
    }
    if (
      el instanceof HTMLDialogElement &&
      !el.hasAttribute(UI_ATTR)
    ) {
      const prev = (mutation.oldValue || "").trim().split(/\s+/).filter(Boolean);
      const changed = [
        ...[...el.classList].filter((c) => !prev.includes(c)),
        ...prev.filter((c) => !el.classList.contains(c)),
      ];
      return (
        changed.length > 0 &&
        changed.every((c) => c === "proto-num-dialog-host")
      );
    }
    return false;
  }

  function mutationIsRelevant(mutation) {
    if (scanning) return false;
    if (classMutationIsDockMarkerOnly(mutation)) return false;
    if (mutation.type === "childList") {
      const t = mutation.target;
      if (t?.nodeType === 1) {
        if (t.classList?.contains(BADGE_HOST_CLASS) || t.closest?.(`[${UI_ATTR}]`)) return false;
      }
    }
    const targets = [mutation.target, ...mutation.addedNodes, ...mutation.removedNodes];
    for (const node of targets) {
      if (!node || node.nodeType !== 1) continue;
      if (isAnnotationUi(node)) return false;
      if (node.closest?.(`[${UI_ATTR}]`)) return false;
    }
    if (mutation.type === "attributes") {
      if (mutation.attributeName === TARGET_ATTR) return false;
      if (mutation.attributeName === "class" && mutation.target?.hasAttribute?.(TARGET_ATTR)) {
        const cls = mutation.target.classList;
        const onlyHighlight =
          cls.length <= 2 &&
          (cls.contains("proto-num-target-highlight") || cls.length === 0);
        if (onlyHighlight) return false;
      }
    }
    return true;
  }

  function bindScroll() {
    if (scrollBound) return;
    scrollBound = true;
    const onScroll = () => requestAnimationFrame(placeBadges);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", () => scheduleRescan(), { passive: true });
  }

  function ensureUi() {
    if (chromeEl) return;

    badgeHost = document.createElement("div");
    badgeHost.className = BADGE_HOST_CLASS;
    badgeHost.setAttribute(UI_ATTR, "");
    badgeHost.setAttribute("aria-hidden", "true");

    chromeEl = document.createElement("div");
    chromeEl.className = "proto-num-chrome";
    chromeEl.setAttribute(UI_ATTR, "");

    const LEGEND_TEXT =
      "Пространства: 1 — общий вход, 2 — клиент, 3 — партнёр, 4 — админ";
    const legend = document.createElement("div");
    legend.className = "proto-num-legend";
    legend.textContent = LEGEND_TEXT;

    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = "Номера: вкл";
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.addEventListener("click", () => {
      enabled = !enabled;
      toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggleBtn.textContent = enabled ? "Номера: вкл" : "Номера: выкл";
      document.documentElement.classList.toggle("proto-num-off", !enabled);
      if (enabled) rescan();
      else {
        badgeHost.textContent = "";
        clearTargetMarkers();
      }
    });

    panelBtn = document.createElement("button");
    panelBtn.type = "button";
    panelBtn.textContent = "Список номеров";
    panelBtn.setAttribute("aria-expanded", "false");
    panelBtn.setAttribute("aria-controls", "proto-num-panel");
    panelBtn.addEventListener("click", () => {
      panelOpen = !panelOpen;
      panelBtn.setAttribute("aria-expanded", panelOpen ? "true" : "false");
      panelEl.classList.toggle("is-open", panelOpen);
      panelEl.toggleAttribute("hidden", !panelOpen);
      syncModalDock();
      if (panelOpen) {
        rescan();
        renderIndexList(searchEl?.value || "");
        searchEl?.focus();
      }
    });

    chromeEl.append(legend, toggleBtn, panelBtn);

    panelEl = document.createElement("div");
    panelEl.id = "proto-num-panel";
    panelEl.className = "proto-num-panel";
    panelEl.setAttribute(UI_ATTR, "");
    panelEl.setAttribute("hidden", "");
    panelEl.setAttribute("role", "region");
    panelEl.setAttribute("aria-label", "Индекс номеров прототипа");

    const head = document.createElement("div");
    head.className = "proto-num-panel__head";
    const h2 = document.createElement("h2");
    h2.textContent = "Индекс номеров (текущий экран)";
    const legendInPanel = document.createElement("details");
    legendInPanel.className = "proto-num-panel__ns-legend";
    legendInPanel.innerHTML = `<summary>Пространства номеров</summary><p>${LEGEND_TEXT}</p>`;
    searchEl = document.createElement("input");
    searchEl.type = "search";
    searchEl.placeholder = "Поиск по номеру или тексту…";
    searchEl.autocomplete = "off";
    metaEl = document.createElement("div");
    metaEl.className = "proto-num-panel__meta";
    head.append(h2, legendInPanel, searchEl, metaEl);

    listEl = document.createElement("ul");
    listEl.className = "proto-num-panel__list";

    const actions = document.createElement("div");
    actions.className = "proto-num-panel__actions";
    copyStatusEl = document.createElement("p");
    copyStatusEl.className = "proto-num-panel__copy-status";
    copyStatusEl.setAttribute("aria-live", "polite");
    copyFieldEl = document.createElement("textarea");
    copyFieldEl.className = "proto-num-panel__copy-field";
    copyFieldEl.readOnly = true;
    copyFieldEl.hidden = true;
    copyFieldEl.setAttribute("aria-label", "Поле для ручного копирования номера");
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Скопировать индекс";
    copyBtn.addEventListener("click", () => {
      const lines = registry.map(
        (r) => `${r.ref}\t${r.label}\t${r.location}\t${r.stableKey}`,
      );
      copyText(lines.join("\n"));
    });
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Закрыть";
    closeBtn.addEventListener("click", () => {
      panelOpen = false;
      panelBtn.setAttribute("aria-expanded", "false");
      panelEl.classList.remove("is-open");
      panelEl.setAttribute("hidden", "");
    });
    actions.append(copyStatusEl, copyFieldEl, copyBtn, closeBtn);

    panelEl.append(head, listEl, actions);
    searchEl.addEventListener("input", () => renderIndexList(searchEl.value));

    document.body.append(badgeHost, chromeEl, panelEl);
    bindModalDockSync();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      if (scanning) return;
      if (records.every((m) => !mutationIsRelevant(m))) return;
      scheduleRescan();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "class",
        "hidden",
        "open",
        "aria-current",
        "aria-pressed",
        "aria-expanded",
        "aria-selected",
        "aria-hidden",
        "data-view",
        "data-subview",
        "data-detail-open",
      ],
    });
  }

  function init() {
    ensureUi();
    bindScroll();
    startObserver();
    rescan();
    window.addEventListener("hashchange", scheduleRescan);
    window.addEventListener("popstate", scheduleRescan);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
