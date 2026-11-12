export const STANDALONE_BY_N = {
  139: { path: "certificate.html", title: "Гостевой сертификат", guest: true },
  140: { path: "recommendation.html", title: "Гостевая рекомендация", guest: true },
  141: { path: "assignment.html", title: "Поручение исполнителю", guest: true, workflowNA: "r2-assignment-handoff" },
  142: { path: "observer.html", title: "Наблюдение за объектом", guest: true },
  143: { path: "partner-cooperation-detail.html", title: "Условия сотрудничества" },
  144: { path: "partner-purchase-detail.html", title: "Деталь покупки" },
  145: { path: "partner-reward-receipt.html", title: "Квитанция вознаграждения" },
  146: { path: "partner-scan-transaction.html", title: "Макет оформления покупки" },
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

function buildEmbedUrl(pageN, extraQuery = "", bridge = {}) {
  const def = STANDALONE_BY_N[pageN];
  if (!def) return null;
  const params = new URLSearchParams({ cabinet_embed: "1", proto_n: String(pageN) });
  const role = bridge.getRole?.();
  const employer = bridge.getEmployer?.();
  if (role) params.set("embed_role", role);
  if (employer) params.set("embed_employer", employer);
  if (extraQuery) {
    new URLSearchParams(extraQuery.startsWith("?") ? extraQuery.slice(1) : extraQuery).forEach((v, k) =>
      params.set(k, v),
    );
  }
  try {
    const rel = window.rcDemoMemory?.getItem?.("rc_release");
    if (rel === "1" || rel === "2") params.set("rc_demo_release", rel);
  } catch (_) {}
  return new URL(`./${def.path}?${params}`, window.location.href).href;
}

/**
 * One portal host on document.body — survives roles R() innerHTML refresh.
 */
export function createCabinetStandaloneHost(config) {
  const {
    getScreen,
    getRole,
    getEmployer,
    canOpen,
    notify,
    onReturn,
    onCoopAction,
    onSupplementalAction,
    resolveEmbedPayload,
    shouldResetOnRerender,
  } = config;
  const urlBridge = { getRole, getEmployer };

  const hostEl = document.createElement("div");
  hostEl.className = "cabinet-standalone-host cabinet-standalone-host--portal";
  hostEl.hidden = true;
  hostEl.setAttribute("data-testid", "cabinet-standalone-host");
  hostEl.innerHTML = `<header class="cabinet-standalone-host__bar">
      <button type="button" class="btn ghost" data-action="proto-standalone-back" data-testid="proto-standalone-back">Назад</button>
      <span class="cabinet-standalone-host__title" data-standalone-title></span>
      <button type="button" class="btn ghost" data-action="proto-standalone-close" data-testid="proto-standalone-close">Закрыть</button>
    </header>
    <iframe class="cabinet-standalone-host__frame" title="Встроенный макет прототипа" sandbox="allow-scripts allow-same-origin allow-forms" data-testid="cabinet-standalone-frame"></iframe>`;
  document.body.appendChild(hostEl);

  const frame = hostEl.querySelector("[data-testid='cabinet-standalone-frame']");
  const titleEl = hostEl.querySelector("[data-standalone-title]");

  let openPageN = null;
  let openQuery = "";
  let openCtx = null;
  let resizeObserver = null;
  let embedGuardKey = "";

  function contentTarget() {
    return document.querySelector(".shell .content.main, .shell main.content, .shell .content");
  }

  function mobileBottomInset() {
    const bar = document.querySelector(".sidebar.mobile-navigation");
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    if (rect.width < 8) return 0;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (rect.bottom >= vh - 2 && rect.top > vh * 0.45) {
      return Math.min(rect.height, vh);
    }
    return 0;
  }

  function reviewerDockBottomReserve(viewportHeight) {
    const flow = document.querySelector(".proto-page-flow");
    let reserve = 0;
    if (flow) {
      const fr = flow.getBoundingClientRect();
      if (fr.height > 4 && fr.top < viewportHeight) {
        reserve = Math.max(reserve, viewportHeight - fr.top + 8);
      }
    }
    const panel = document.querySelector('.proto-page-panel[data-open="true"]');
    if (panel) {
      const pr = panel.getBoundingClientRect();
      if (pr.height > 4 && pr.top < viewportHeight) {
        reserve = Math.max(reserve, viewportHeight - pr.top + 8);
      }
    }
    return reserve;
  }

  function reposition() {
    if (hostEl.hidden) return;
    const target = contentTarget();
    if (!target) {
      requestAnimationFrame(reposition);
      return;
    }
    const rect = target.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportTop = vv?.offsetTop ?? 0;
    const viewportHeight = vv?.height ?? window.innerHeight;
    const bottomInset = Math.max(mobileBottomInset(), reviewerDockBottomReserve(viewportHeight));
    const top = Math.max(viewportTop, rect.top);
    const barH = hostEl.querySelector(".cabinet-standalone-host__bar")?.offsetHeight || 48;
    const available = viewportHeight - bottomInset - (top - viewportTop) - 4;
    const height = Math.max(160, Math.min(available, viewportHeight - (top - viewportTop) - bottomInset));
    hostEl.style.position = "fixed";
    hostEl.style.left = `${rect.left}px`;
    hostEl.style.top = `${top}px`;
    hostEl.style.width = `${rect.width}px`;
    hostEl.style.height = `${height}px`;
    hostEl.style.maxHeight = `${height}px`;
    hostEl.style.zIndex = "1100";
    const frameH = Math.max(80, height - barH);
    frame.style.height = `${frameH}px`;
    frame.style.maxHeight = `${frameH}px`;
  }

  function onOuterScroll() {
    reposition();
  }

  function watchLayout() {
    if (resizeObserver) return;
    resizeObserver = new ResizeObserver(() => reposition());
    const shell = document.querySelector(".shell");
    if (shell) resizeObserver.observe(shell);
    const flow = document.querySelector(".proto-page-flow");
    if (flow) resizeObserver.observe(flow);
    const dockPanel = document.querySelector(".proto-page-panel");
    if (dockPanel) resizeObserver.observe(dockPanel);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onOuterScroll, { passive: true });
    document.addEventListener("scroll", onOuterScroll, { passive: true, capture: true });
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
  }

  function unwatchLayout() {
    resizeObserver?.disconnect();
    resizeObserver = null;
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", onOuterScroll);
    document.removeEventListener("scroll", onOuterScroll, { capture: true });
    window.visualViewport?.removeEventListener("resize", reposition);
    window.visualViewport?.removeEventListener("scroll", reposition);
    hostEl.style.cssText = "";
    frame.style.height = "";
    frame.style.maxHeight = "";
  }

  function pushReturn(ctx) {
    if (!ctx) return;
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

  function deny(pageN, reason) {
    notify?.(reason || "Раздел недоступен для этой роли в демо.", "info");
    return false;
  }

  function assertCanOpen(pageN) {
    if (!STANDALONE_BY_N[pageN]) return deny(pageN);
    if (STANDALONE_BY_N[pageN].workflowNA) {
      return deny(pageN, "Маршрут поручения (141) в прототипе только для согласования по TOC, без рабочего R2-сценария в ЛК.");
    }
    if (typeof canOpen === "function" && !canOpen(pageN, openCtx)) return deny(pageN);
    return true;
  }

  function sendContextToFrame() {
    if (!openPageN || !resolveEmbedPayload) return;
    const payload = resolveEmbedPayload(openPageN, openCtx, openQuery);
    if (!payload) return;
    try {
      frame.contentWindow?.postMessage(
        { source: "proto-cabinet-host", type: "context", pageN: openPageN, payload },
        "*",
      );
    } catch (_) {}
  }

  function closeHost({ back = false, reset = false } = {}) {
    hostEl.hidden = true;
    document.querySelector(".shell")?.classList.remove("cabinet-standalone-active");
    document.documentElement.classList.remove("proto-cabinet-embed-host-active");
    frame.removeAttribute("src");
    openPageN = null;
    openQuery = "";
    openCtx = null;
    syncEmbeddedPageBadge(null);
    unwatchLayout();
    if (reset) writeStack([]);
    else if (back) {
      const ctx = popReturn();
      onReturn?.(ctx);
    }
  }

  function syncThemeToFrame(theme) {
    if (hostEl.hidden) return;
    const t = theme || currentTheme();
    try {
      frame.contentWindow?.postMessage(
        { source: "proto-cabinet-host", type: "theme", theme: t },
        "*",
      );
    } catch (_) {}
  }

  function doOpen(
    pageN,
    { extraQuery = "", returnCtx = null, chain = false, replace = false, embedCtx = null } = {},
  ) {
    if (config.getEmbedGuardKey) embedGuardKey = config.getEmbedGuardKey();
    if (!assertCanOpen(pageN)) return false;
    if (getScreen?.() !== "cabinet") {
      return deny(pageN, "Сначала откройте кабинет в режиме просмотра.");
    }
    const def = STANDALONE_BY_N[pageN];
    const url = buildEmbedUrl(pageN, extraQuery, urlBridge);
    if (!url || !def) return false;

    if (!replace && chain && openPageN) {
      const leavingCtx = { ...(openCtx || {}) };
      if (embedCtx?.walletState != null) {
        leavingCtx.walletState = embedCtx.walletState;
      }
      pushReturn({
        pageN: openPageN,
        query: openQuery,
        ctx: leavingCtx,
        kind: "embed-chain",
      });
    } else if (returnCtx) {
      pushReturn(returnCtx);
    }
    if (embedCtx != null) openCtx = embedCtx;

    titleEl.textContent = def.title;
    openPageN = pageN;
    openQuery = extraQuery;
    syncEmbeddedPageBadge(pageN);
    document.querySelector(".shell")?.classList.add("cabinet-standalone-active");
    document.documentElement.classList.add("proto-cabinet-embed-host-active");
    hostEl.hidden = false;
    watchLayout();
    reposition();
    frame.onload = () => {
      sendContextToFrame();
    };
    frame.src = url;
    return true;
  }

  function handleHostMessage(ev) {
    if (ev.source !== frame.contentWindow) return;
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-embed") return;

    if (data.type === "ready" || data.type === "need-context") {
      try {
        frame.contentWindow?.postMessage(
          { source: "proto-cabinet-host", type: "theme", theme: currentTheme() },
          "*",
        );
      } catch (_) {}
      sendContextToFrame();
      return;
    }
    if (data.type === "nav" && data.pageN) {
      if (!assertCanOpen(Number(data.pageN))) return;
      const nextCtx = data.ctx ? { ...(openCtx || {}), ...data.ctx } : openCtx;
      doOpen(Number(data.pageN), {
        extraQuery: data.query || "",
        chain: !data.replace,
        replace: !!data.replace,
        embedCtx: nextCtx,
      });
      return;
    }
    if (data.type === "back") {
      closeHost({ back: true });
      return;
    }
    if (data.type === "coop" && data.action) {
      if (!onCoopAction?.(data.action, data.partnerId, openCtx)) return;
      sendContextToFrame();
    }
    if (data.type === "supplemental") {
      if (!onSupplementalAction?.(data, openCtx)) return;
      sendContextToFrame();
    }
  }

  window.addEventListener("message", handleHostMessage);

  try {
    const themeObs = new MutationObserver(() => syncThemeToFrame());
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  } catch (_) {}

  hostEl.addEventListener("click", (e) => {
    const back = e.target.closest('[data-action="proto-standalone-back"]');
    const close = e.target.closest('[data-action="proto-standalone-close"]');
    if (!back && !close) return;
    e.preventDefault();
    e.stopPropagation();
    closeHost({ back: true });
  });

  return {
    openStandalone(pageN, opts = {}) {
      const embedCtx = opts.embedCtx ?? opts.ctx ?? null;
      const { embedCtx: _e, ctx: _c, ...rest } = opts;
      return doOpen(pageN, { ...rest, embedCtx });
    },
    closeHost,
    resetHost(reason) {
      if (!hostEl.hidden) closeHost({ reset: true });
      else {
        openPageN = null;
        openQuery = "";
        openCtx = null;
        syncEmbeddedPageBadge(null);
        frame.removeAttribute("src");
        unwatchLayout();
        document.documentElement.classList.remove("proto-cabinet-embed-host-active");
      }
      if (reason && notify) notify(reason, "info");
    },
    syncTheme: syncThemeToFrame,
    afterCabinetRender() {
      if (hostEl.hidden) return;
      const guardMismatch =
        config.getEmbedGuardKey && embedGuardKey && config.getEmbedGuardKey() !== embedGuardKey;
      if (shouldResetOnRerender?.() || guardMismatch) {
        closeHost({ reset: true });
        embedGuardKey = "";
        return;
      }
      if (openPageN && typeof canOpen === "function" && !canOpen(openPageN, openCtx)) {
        closeHost({ reset: true });
        embedGuardKey = "";
        notify?.("Встроенный макет закрыт: изменились роль или права.", "info");
        return;
      }
      reposition();
      syncThemeToFrame();
    },
    isOpen: () => !hostEl.hidden,
    currentPageN: () => openPageN,
    setOpenCtx(ctx) {
      openCtx = ctx;
    },
    refreshContext() {
      sendContextToFrame();
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
  e.preventDefault();
  const suffix = parts.slice(2).join(":");
  const embedCtx = ctx?.buildEmbedCtx?.(pageN, suffix) ?? { suffix };
  const returnCtx = ctx?.buildReturnContext?.(pageN, suffix, embedCtx) || {
    page: ctx?.getPage?.(),
    role: ctx?.getRole?.(),
    embedCtx,
  };
  return host.openStandalone(pageN, {
    extraQuery: ctx?.extraQuery?.(pageN, suffix, embedCtx) || "",
    returnCtx,
    embedCtx,
  });
  return true;
}

export function parseStandaloneDeepLink(searchParams) {
  const raw = searchParams.get("proto_standalone");
  if (!raw) return null;
  const pageN = Number(raw);
  return STANDALONE_BY_N[pageN] ? pageN : null;
}
