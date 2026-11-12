export const STANDALONE_BY_N = {
  139: { path: "certificate.html", title: "Гостевой сертификат", guest: true },
  140: { path: "recommendation.html", title: "Гостевая рекомендация", guest: true },
  141: { path: "assignment.html", title: "Поручение исполнителю", guest: true },
  142: { path: "observer.html", title: "Наблюдение за объектом", guest: true },
  143: { path: "partner-cooperation-detail.html", title: "Условия сотрудничества" },
  144: { path: "partner-purchase-detail.html", title: "Деталь покупки" },
  145: { path: "partner-reward-receipt.html", title: "Квитанция вознаграждения" },
  146: { path: "partner-scan-transaction.html", title: "Макет сканера" },
  147: { path: "partner-wallet-history.html", title: "История покупок и начислений" },
};

const RETURN_KEY = "proto_embed_return_stack";

function readStack() {
  try {
    const raw = window.rcDemoMemory?.getItem?.(RETURN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeStack(stack) {
  try {
    if (!stack.length) window.rcDemoMemory?.removeItem?.(RETURN_KEY);
    else window.rcDemoMemory?.setItem?.(RETURN_KEY, JSON.stringify(stack));
  } catch (_) {}
}

function cabinetDomReady() {
  const cabinetBtn = document.querySelector('[data-testid="view-cabinet"]');
  if (cabinetBtn && cabinetBtn.getAttribute("aria-pressed") === "true") return true;
  return !!document.querySelector(".shell aside.sidebar");
}

export function waitForCabinetReady({ getScreen, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (getScreen?.() === "cabinet" && cabinetDomReady()) {
        resolve(true);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("cabinet not ready"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function syncEmbeddedPageBadge(pageN) {
  if (!pageN) {
    delete window.__protoCabinetEmbeddedPage;
  } else {
    window.__protoCabinetEmbeddedPage = { n: pageN, id: STANDALONE_BY_N[pageN]?.path || String(pageN) };
  }
  try {
    window.dispatchEvent(new CustomEvent("proto-embed-change"));
  } catch (_) {}
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function buildEmbedUrl(pageN, extraQuery = "") {
  const def = STANDALONE_BY_N[pageN];
  if (!def) return null;
  const params = new URLSearchParams({ cabinet_embed: "1", proto_n: String(pageN) });
  if (extraQuery) {
    new URLSearchParams(extraQuery).forEach((v, k) => params.set(k, v));
  }
  try {
    const rel = window.rcDemoMemory?.getItem?.("rc_release");
    if (rel === "1" || rel === "2") params.set("rc_demo_release", rel);
  } catch (_) {}
  return new URL(`./${def.path}?${params}`, window.location.href).href;
}

export function initCabinetStandaloneHost(config) {
  const { getScreen, button, notify, onReturn } = config;
  let hostEl = document.querySelector("[data-testid='cabinet-standalone-host']");
  if (!hostEl) {
    hostEl = document.createElement("div");
    hostEl.className = "cabinet-standalone-host";
    hostEl.hidden = true;
    hostEl.setAttribute("data-testid", "cabinet-standalone-host");
    hostEl.innerHTML = `<header class="cabinet-standalone-host__bar">
      <button type="button" class="btn ghost" data-action="proto-standalone-back" data-testid="proto-standalone-back">Назад</button>
      <span class="cabinet-standalone-host__title" data-standalone-title></span>
      <button type="button" class="btn ghost" data-action="proto-standalone-close" data-testid="proto-standalone-close">Закрыть</button>
    </header>
    <iframe class="cabinet-standalone-host__frame" title="Встроенный макет прототипа" sandbox="allow-scripts allow-same-origin allow-forms" data-testid="cabinet-standalone-frame"></iframe>`;
    const mount = document.querySelector(".shell .content") || document.querySelector("#app");
    (mount || document.body).appendChild(hostEl);
  }
  const frame = hostEl.querySelector("[data-testid='cabinet-standalone-frame']");
  const titleEl = hostEl.querySelector("[data-standalone-title]");

  let openPageN = null;

  function pushReturn(ctx) {
    const stack = readStack();
    stack.push(ctx);
    writeStack(stack);
  }

  function popReturn() {
    const stack = readStack();
    const ctx = stack.pop();
    writeStack(stack);
    return ctx;
  }

  function closeHost({ back = false } = {}) {
    hostEl.hidden = true;
    document.querySelector(".shell")?.classList.remove("cabinet-standalone-active");
    frame.removeAttribute("src");
    openPageN = null;
    syncEmbeddedPageBadge(null);
    if (back) {
      const ctx = popReturn();
      onReturn?.(ctx);
    }
  }

  function openStandalone(pageN, { extraQuery = "", returnCtx = null, replace = false } = {}) {
    const def = STANDALONE_BY_N[pageN];
    if (!def) return false;
    if (getScreen?.() !== "cabinet") {
      notify?.("Сначала откройте кабинет в режиме просмотра.", "info");
      return false;
    }
    const url = buildEmbedUrl(pageN, extraQuery);
    if (!url) return false;
    if (!replace && returnCtx) pushReturn(returnCtx);
    titleEl.textContent = def.title;
    openPageN = pageN;
    syncEmbeddedPageBadge(pageN);
    document.querySelector(".shell")?.classList.add("cabinet-standalone-active");
    hostEl.hidden = false;
    frame.src = url;
    return true;
  }

  function handleHostMessage(ev) {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-embed") return;
    if (data.type === "ready") {
      try {
        frame.contentWindow?.postMessage(
          { source: "proto-cabinet-host", type: "theme", theme: currentTheme() },
          "*",
        );
      } catch (_) {}
      return;
    }
    if (data.type === "nav" && data.pageN) {
      openStandalone(Number(data.pageN), {
        replace: true,
        returnCtx: { pageN: openPageN, kind: "embed-chain" },
      });
      return;
    }
    if (data.type === "back") {
      closeHost({ back: true });
    }
  }

  window.addEventListener("message", handleHostMessage);

  return {
    openStandalone,
    closeHost,
    pushReturn,
    popReturn,
    isOpen: () => !hostEl.hidden,
    currentPageN: () => openPageN,
    buttonFor: (pageN, actionSuffix = "", kind = "ghost") => {
      const def = STANDALONE_BY_N[pageN];
      if (!def || !button) return "";
      const action = actionSuffix ? `proto-standalone:${pageN}:${actionSuffix}` : `proto-standalone:${pageN}`;
      return button(def.title, action, kind);
    },
  };
}

export function handleStandaloneHostClick(e, host, ctx) {
  const t = e.target.closest("[data-action]");
  if (!t) return false;
  const parts = (t.dataset.action || "").split(":");
  if (parts[0] === "proto-standalone-back" || (parts[0] === "proto-standalone" && parts[1] === "back")) {
    e.preventDefault();
    host.closeHost({ back: true });
    return true;
  }
  if (parts[0] === "proto-standalone-close" || (parts[0] === "proto-standalone" && parts[1] === "close")) {
    e.preventDefault();
    host.closeHost({ back: true });
    return true;
  }
  if (parts[0] !== "proto-standalone" && parts[0] !== "proto-guest-preview") return false;
  const pageN = Number(parts[1]);
  if (!STANDALONE_BY_N[pageN]) return false;
  if (ctx?.canOpen && !ctx.canOpen(pageN)) {
    ctx.notify?.("Раздел недоступен для этой роли в демо.", "info");
    return true;
  }
  e.preventDefault();
  const extra = parts.slice(2).join(":");
  const returnCtx = ctx?.buildReturnContext?.(pageN, extra) || { pageN: ctx?.getPage?.(), role: ctx?.getRole?.() };
  host.openStandalone(pageN, { extraQuery: ctx?.extraQuery?.(pageN, extra) || "", returnCtx });
  return true;
}

export function parseStandaloneDeepLink(searchParams) {
  const raw = searchParams.get("proto_standalone");
  if (!raw) return null;
  const pageN = Number(raw);
  return STANDALONE_BY_N[pageN] ? pageN : null;
}
