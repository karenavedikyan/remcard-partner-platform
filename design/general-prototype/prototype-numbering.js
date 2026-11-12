/**
 * RemCard general-prototype reviewer numbering (annotation-only, in-memory).
 * Namespaces: 1=general hub, 2=client, 3=partner, 4=admin.
 */
(function () {
  "use strict";

  const ROOT_CLASS = "proto-num-root";
  const NS_LABELS = {
    1: "general",
    2: "client",
    3: "partner",
    4: "admin",
  };

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
    ".step",
    ".proto-launch",
    ".role",
  ].join(",");

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "LINK",
    "META",
    "TITLE",
    "HEAD",
  ]);

  let enabled = true;
  let panelOpen = false;
  let dense = false;
  let rootEl = null;
  let badgeLayer = null;
  let panelEl = null;
  let searchEl = null;
  let listEl = null;
  let metaEl = null;
  let registry = [];
  let highlightEl = null;
  let observer = null;
  let rescanTimer = null;
  let scrollBound = false;

  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function detectNamespace() {
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("/client/")) return 2;
    if (p.includes("/partner/")) return 3;
    if (p.includes("/admin/")) return 4;
    return 1;
  }

  function pageFileKey() {
    const p = location.pathname || "";
    const file = p.split("/").pop() || "index.html";
    return file.replace(/\.html?$/i, "");
  }

  function readPrototypeState() {
    const bits = [];
    const role = document.querySelector('[data-testid="scenario-role"]');
    if (role && role.value) bits.push(`role=${role.value}`);
    const rel = document.querySelector('[data-testid="prototype-release"]');
    if (rel && rel.value) bits.push(`release=${rel.value}`);
    const nav = document.querySelector(".nav-btn[aria-current='page']");
    if (nav) {
      const act = nav.getAttribute("data-action") || nav.dataset.action;
      if (act) bits.push(`nav=${act}`);
    }
    const viewCab = document.querySelector('[data-action="view:cabinet"][aria-pressed="true"]');
    if (viewCab) bits.push("screen=cabinet");
    const viewReg = document.querySelector('[data-action="view:registration"][aria-pressed="true"]');
    if (viewReg) bits.push("screen=registration");
    const hash = location.hash || "";
    if (hash) bits.push(`hash=${hash}`);
    const qs = location.search || "";
    if (qs) bits.push(`q=${qs}`);
    const openDlg = document.querySelector("dialog[open]");
    if (openDlg && openDlg.id) bits.push(`dialog=${openDlg.id}`);
    const caRoot = document.querySelector("[data-ca-root]");
    if (caRoot) {
      const v = document.querySelector("#main h1")?.textContent?.trim().slice(0, 48);
      if (v) bits.push(`ca=${v}`);
    }
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

  function inAnnotationLayer(el) {
    return !!el.closest(`.${ROOT_CLASS}`);
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    if (inAnnotationLayer(el)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function interactiveAncestor(el) {
    return el.closest(
      "button, a[href], label, summary, [role='button'], [role='link'], .nav-btn, .btn",
    );
  }

  function semanticDescriptor(el) {
    if (el.id) return `id:${el.id}`;
    const testId = el.getAttribute("data-testid");
    if (testId) return `testid:${testId}`;
    const action = el.getAttribute("data-action");
    if (action) return `action:${action}`;
    const name = el.getAttribute("name");
    if (name) return `name:${name}`;
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      return `a:${href.split("#")[0].split("?")[0]}`;
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return `aria:${aria.slice(0, 80)}`;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const cls = [...el.classList].sort().slice(0, 4).join(".");
    let idx = 0;
    const parent = el.parentElement;
    if (parent) {
      idx = [...parent.children].filter((c) => c.tagName === el.tagName).indexOf(el);
    }
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `t:${tag}|r:${role}|c:${cls}|i:${idx}|x:${text}`;
  }

  function shouldNumber(el, labeledInputs) {
    if (!el || SKIP_TAGS.has(el.tagName)) return false;
    if (inAnnotationLayer(el)) return false;
    if (el.closest("[hidden], template")) return false;
    if (!isVisible(el)) return false;

    const tag = el.tagName;
    if (tag === "LABEL") {
      const f = el.htmlFor;
      if (f && labeledInputs.has(f)) return false;
    }

    const outer = interactiveAncestor(el);
    if (outer && outer !== el) {
      const outerTag = outer.tagName;
      if (outerTag === "BUTTON" || outerTag === "A" || outer.classList.contains("btn")) {
        return false;
      }
    }

    if (tag === "P" || tag === "SPAN" || tag === "SMALL") {
      const t = (el.textContent || "").trim();
      if (t.length < 2) return false;
    }

    if (tag === "DIV" && !el.classList.length && !el.id && !el.getAttribute("data-testid")) {
      const t = (el.textContent || "").trim();
      if (t.length < 3 && !el.querySelector(CANDIDATE_SELECTOR)) return false;
    }

    return true;
  }

  function snippet(el) {
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim();
    const tid = el.getAttribute("data-testid");
    if (tid) return `[${tid}]`;
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (text) return text.slice(0, 120);
    return `<${el.tagName.toLowerCase()}>`;
  }

  function locationHint(el) {
    const main = el.closest("main, #main, #app, [role='main']");
    const region = main?.id || main?.className?.toString().split(/\s+/)[0] || "body";
    const nav = document.querySelector(".nav-btn[aria-current='page']");
    const page = nav?.textContent?.trim() || pageFileKey();
    return `${page} · ${region}`;
  }

  function collectTargets() {
    const labeledInputs = new Set();
    document.querySelectorAll("label[for]").forEach((lb) => {
      const id = lb.htmlFor;
      if (id) labeledInputs.add(id);
    });

    const seen = new Set();
    const out = [];
    document.querySelectorAll(CANDIDATE_SELECTOR).forEach((el) => {
      if (!shouldNumber(el, labeledInputs)) return;
      const key = semanticDescriptor(el);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(el);
    });

    if (dense || out.length > 220) dense = true;
    else dense = out.length > 120;
    return out;
  }

  function buildRegistry() {
    const ns = detectNamespace();
    const stateKey = pageStateKey(ns);
    const pageHash = fnv1a(stateKey);
    const items = [];
    const usedRefs = new Map();

    collectTargets().forEach((el) => {
      const elemSeed = `${stateKey}|${semanticDescriptor(el)}`;
      let elemHash = fnv1a(elemSeed);
      let ref = formatRef(ns, pageHash, elemHash);
      while (usedRefs.has(ref)) {
        elemHash += 1;
        ref = formatRef(ns, pageHash, elemHash);
      }
      usedRefs.set(ref, true);
      items.push({
        ref,
        ns,
        el,
        snippet: snippet(el),
        location: locationHint(el),
        stateKey,
      });
    });

    items.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    registry = items;
    window.__protoNumRegistry = {
      ns,
      nsLabel: NS_LABELS[ns],
      stateKey,
      page: pageFileKey(),
      state: readPrototypeState(),
      count: items.length,
      items: items.map(({ ref, snippet, location, stateKey: sk }) => ({
        ref,
        snippet,
        location,
        stateKey: sk,
      })),
    };
    return items;
  }

  function clearHighlights() {
    if (highlightEl) {
      highlightEl.classList.remove("proto-num-target-highlight");
      highlightEl = null;
    }
    badgeLayer?.querySelectorAll(".proto-num-badge--highlight").forEach((b) => {
      b.classList.remove("proto-num-badge--highlight");
    });
  }

  function highlightRef(ref) {
    const item = registry.find((r) => r.ref === ref);
    if (!item || !item.el.isConnected) return;
    clearHighlights();
    highlightEl = item.el;
    highlightEl.classList.add("proto-num-target-highlight");
    highlightEl.scrollIntoView({ block: "center", behavior: "smooth" });
    const badge = badgeLayer?.querySelector(`[data-proto-ref="${ref}"]`);
    badge?.classList.add("proto-num-badge--highlight");
  }

  function copyText(text) {
    const ta = document.querySelector(".proto-num-clipboard-fallback");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        if (ta) {
          ta.value = text;
          ta.select();
          try {
            document.execCommand("copy");
          } catch (e) {
            /* noop */
          }
        }
      });
      return;
    }
    if (ta) {
      ta.value = text;
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {
        /* noop */
      }
    }
  }

  function renderBadges() {
    if (!badgeLayer) return;
    badgeLayer.innerHTML = "";
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    registry.forEach((item) => {
      if (!item.el.isConnected || !isVisible(item.el)) return;
      const r = item.el.getBoundingClientRect();
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = `proto-num-badge${dense ? " proto-num-badge--dense" : ""}`;
      badge.dataset.protoRef = item.ref;
      badge.title = `${item.ref} · ${item.snippet}`;
      badge.textContent = item.ref;
      badge.style.left = `${r.left + scrollX}px`;
      badge.style.top = `${r.top + scrollY}px`;
      badge.addEventListener("click", (ev) => {
        ev.stopPropagation();
        copyText(item.ref);
        highlightRef(item.ref);
      });
      badgeLayer.appendChild(badge);
    });
  }

  function renderIndexList(filter) {
    if (!listEl) return;
    const q = (filter || "").trim().toLowerCase();
    listEl.innerHTML = "";
    registry.forEach((item) => {
      const hay = `${item.ref} ${item.snippet} ${item.location}`.toLowerCase();
      if (q && !hay.includes(q)) return;
      const li = document.createElement("li");
      li.className = "proto-num-panel__item";
      li.innerHTML = `<code>${item.ref}</code><span>${item.snippet} <small style="color:#888">· ${item.location}</small></span>`;
      li.addEventListener("click", () => {
        highlightRef(item.ref);
        copyText(item.ref);
      });
      listEl.appendChild(li);
    });
  }

  function updateMeta() {
    if (!metaEl) return;
    const ns = detectNamespace();
    metaEl.textContent = `${NS_LABELS[ns] || ns} · ${pageFileKey()} · ${readPrototypeState() || "—"} · ${registry.length} элементов`;
  }

  function rescan() {
    if (!enabled) {
      badgeLayer.innerHTML = "";
      return;
    }
    buildRegistry();
    renderBadges();
    updateMeta();
    if (panelOpen) renderIndexList(searchEl?.value || "");
  }

  function scheduleRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(rescan, 280);
  }

  function bindScroll() {
    if (scrollBound) return;
    scrollBound = true;
    window.addEventListener(
      "scroll",
      () => {
        requestAnimationFrame(renderBadges);
      },
      { passive: true, capture: true },
    );
    window.addEventListener(
      "resize",
      () => {
        scheduleRescan();
      },
      { passive: true },
    );
  }

  function ensureChrome() {
    if (rootEl) return;
    rootEl = document.createElement("div");
    rootEl.className = ROOT_CLASS;
    rootEl.setAttribute("aria-hidden", "true");

    badgeLayer = document.createElement("div");
    badgeLayer.className = "proto-num-badge-layer";
    rootEl.appendChild(badgeLayer);

    const chrome = document.createElement("div");
    chrome.className = "proto-num-chrome";

    const legend = document.createElement("div");
    legend.className = "proto-num-legend";
    legend.textContent = "1 general · 2 client · 3 partner · 4 admin";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "Номера: вкл";
    toggle.setAttribute("aria-pressed", "true");
    toggle.addEventListener("click", () => {
      enabled = !enabled;
      toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggle.textContent = enabled ? "Номера: вкл" : "Номера: выкл";
      rootEl.classList.toggle("proto-num-off", !enabled);
      if (enabled) rescan();
      else badgeLayer.innerHTML = "";
    });

    const openPanel = document.createElement("button");
    openPanel.type = "button";
    openPanel.textContent = "Список номеров";
    openPanel.addEventListener("click", () => {
      panelOpen = !panelOpen;
      panelEl.classList.toggle("is-open", panelOpen);
      if (panelOpen) {
        rescan();
        renderIndexList(searchEl?.value || "");
        searchEl?.focus();
      }
    });

    chrome.append(legend, toggle, openPanel);
    rootEl.appendChild(chrome);

    panelEl = document.createElement("div");
    panelEl.className = "proto-num-panel";
    panelEl.innerHTML = `
      <div class="proto-num-panel__head">
        <h2>Индекс номеров (текущий экран)</h2>
        <input type="search" placeholder="Поиск по номеру или тексту…" autocomplete="off" />
        <div class="proto-num-panel__meta"></div>
      </div>
      <ul class="proto-num-panel__list"></ul>
      <div class="proto-num-panel__actions">
        <button type="button" data-copy-index>Скопировать индекс</button>
        <button type="button" data-close-panel>Закрыть</button>
      </div>`;

    searchEl = panelEl.querySelector("input");
    metaEl = panelEl.querySelector(".proto-num-panel__meta");
    listEl = panelEl.querySelector(".proto-num-panel__list");

    searchEl.addEventListener("input", () => renderIndexList(searchEl.value));
    panelEl.querySelector("[data-close-panel]").addEventListener("click", () => {
      panelOpen = false;
      panelEl.classList.remove("is-open");
    });
    panelEl.querySelector("[data-copy-index]").addEventListener("click", () => {
      const lines = registry.map(
        (r) => `${r.ref}\t${r.snippet}\t${r.location}\t${r.stateKey}`,
      );
      copyText(lines.join("\n"));
    });

    const fallback = document.createElement("textarea");
    fallback.className = "proto-num-clipboard-fallback";
    fallback.setAttribute("aria-hidden", "true");
    fallback.setAttribute("tabindex", "-1");

    document.body.appendChild(fallback);
    document.body.appendChild(rootEl);
    document.body.appendChild(panelEl);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => scheduleRescan());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "open", "aria-current", "aria-pressed"],
    });
  }

  function init() {
    ensureChrome();
    bindScroll();
    startObserver();
    rescan();
    document.addEventListener("click", (ev) => {
      if (ev.target.closest(`.${ROOT_CLASS}`)) return;
    });
    window.addEventListener("hashchange", scheduleRescan);
    window.addEventListener("popstate", scheduleRescan);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
