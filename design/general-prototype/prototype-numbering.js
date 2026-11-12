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
  /** @type {HTMLElement[]} */
  let topLayerUi = [];
  let topLayerSyncBound = false;

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
    const tid = el.getAttribute("data-testid");
    if (tid) return `[${tid}]`;
    const label = directLabelText(el);
    if (label) return label.slice(0, 120);
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 4;
    const badgeW = 92;
    const badgeH = 16;

    function overlaps(x, y) {
      return placed.some(
        (p) => x < p.x + badgeW + margin && x + badgeW + margin > p.x && y < p.y + badgeH + margin && y + badgeH + margin > p.y,
      );
    }

    function overlapsTarget(x, y, rect) {
      const pad = 3;
      return !(
        x + badgeW <= rect.left + pad ||
        x >= rect.right - pad ||
        y + badgeH <= rect.top + pad ||
        y >= rect.bottom - pad
      );
    }

    function clampPosition(x, y) {
      return [
        Math.min(Math.max(x, 2), vw - badgeW - 2),
        Math.min(Math.max(y, 2), vh - badgeH - 2),
      ];
    }

    registry.forEach((item) => {
      if (!item.el.isConnected || !isVisible(item.el)) return;
      const r = item.el.getBoundingClientRect();
      if (!intersectsViewport(r, 8)) return;
      const candidates = [
        [r.right - badgeW - 2, r.top - badgeH - 2],
        [r.right - badgeW - 2, r.bottom + 2],
        [r.left, r.bottom + 2],
        [r.left, r.top - badgeH - 2],
        [r.right + 2, r.top],
        [r.left - badgeW - 2, r.top],
      ];
      let x = 0;
      let y = 0;
      let found = false;
      for (const [cx, cy] of candidates) {
        const [px, py] = clampPosition(cx, cy);
        if (!overlaps(px, py) && !overlapsTarget(px, py, r)) {
          x = px;
          y = py;
          found = true;
          break;
        }
      }
      if (!found) {
        for (let tries = 0; tries < 14; tries++) {
          const [px, py] = clampPosition(
            r.left + ((tries % 4) * badgeW) / 4,
            r.top - badgeH - 2 - tries * (badgeH + 2),
          );
          if (!overlaps(px, py) && !overlapsTarget(px, py, r)) {
            x = px;
            y = py;
            found = true;
            break;
          }
        }
      }
      if (!found || overlapsTarget(x, y, r)) {
        item.badgeHidden = true;
        return;
      }
      item.badgeHidden = false;
      const badge = document.createElement("span");
      badge.className = "proto-num-badge";
      badge.dataset.protoRef = item.ref;
      badge.title = `${item.ref} · ${item.label}`;
      badge.textContent = item.ref;
      badge.setAttribute("aria-hidden", "true");
      badge.style.left = `${x}px`;
      badge.style.top = `${y}px`;
      badgeHost.appendChild(badge);
      placed.push({ x, y });
    });
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

  function appModalOpen() {
    return !!document.querySelector(`dialog[open]:not([${UI_ATTR}])`);
  }

  function liftAnnotationUi() {
    topLayerUi.forEach((el) => {
      if (!el) return;
      if (el === panelEl && panelEl.hasAttribute("hidden") && !panelOpen) {
        try {
          if (el.matches(":popover-open")) el.hidePopover();
        } catch {
          /* noop */
        }
        return;
      }
      try {
        if (!el.matches(":popover-open")) el.showPopover();
        if (el === chromeEl || el === panelEl) {
          document.body.append(el);
        }
      } catch {
        document.documentElement.classList.add("proto-num-popover-fallback");
      }
    });
  }

  function lowerAnnotationUi() {
    topLayerUi.forEach((el) => {
      if (!el) return;
      try {
        if (el.matches(":popover-open")) el.hidePopover();
      } catch {
        /* noop */
      }
    });
    document.documentElement.classList.remove("proto-num-popover-fallback");
  }

  function syncAnnotationTopLayer() {
    const lift = appModalOpen();
    document.documentElement.classList.toggle("proto-num-modal-open", lift);
    if (lift) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          liftAnnotationUi();
        });
      });
    } else {
      lowerAnnotationUi();
    }
  }

  function bindTopLayerSync() {
    if (topLayerSyncBound) return;
    topLayerSyncBound = true;
    const onModalChange = () => {
      syncAnnotationTopLayer();
      scheduleRescan();
    };
    document.addEventListener(
      "toggle",
      (ev) => {
        if (ev.target instanceof HTMLDialogElement && !ev.target.hasAttribute(UI_ATTR)) {
          onModalChange();
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
          queueMicrotask(onModalChange);
        }
      },
      true,
    );
    const obs = new MutationObserver(() => {
      if (appModalOpen()) onModalChange();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
  }

  function markTopLayerPopover(el) {
    if (!el || el.getAttribute("popover") === "manual") return;
    el.setAttribute("popover", "manual");
    topLayerUi.push(el);
  }

  function rescan() {
    syncAnnotationTopLayer();
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

  function mutationIsRelevant(mutation) {
    if (scanning) return false;
    const targets = [mutation.target, ...mutation.addedNodes, ...mutation.removedNodes];
    for (const node of targets) {
      if (!node || node.nodeType !== 1) continue;
      if (isAnnotationUi(node)) return false;
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

    const legend = document.createElement("div");
    legend.className = "proto-num-legend";
    legend.textContent =
      "Пространства: 1 — общий вход, 2 — клиент, 3 — партнёр, 4 — админ";

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
    searchEl = document.createElement("input");
    searchEl.type = "search";
    searchEl.placeholder = "Поиск по номеру или тексту…";
    searchEl.autocomplete = "off";
    metaEl = document.createElement("div");
    metaEl.className = "proto-num-panel__meta";
    head.append(h2, searchEl, metaEl);

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

    markTopLayerPopover(badgeHost);
    markTopLayerPopover(chromeEl);
    markTopLayerPopover(panelEl);

    document.body.append(badgeHost, chromeEl, panelEl);
    bindTopLayerSync();
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
