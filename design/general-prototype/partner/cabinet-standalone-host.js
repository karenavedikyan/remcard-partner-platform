import {
  buildStandaloneNavigationUrl,
  loadStandaloneSrcdoc,
  shouldUseSrcdocStandaloneLoad,
  StandaloneSrcdocStaleError,
  waitForEmbedChildContentReady,
  waitForStandaloneFrameContent,
} from "./cabinet-standalone-srcdoc.js?v=embed10";
import { demoRandomToken } from "./demo-random-id.js";

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

/** Attach before fetch settles so close/abort during slow srcdoc load cannot surface as unhandled. */
function observeEmbedReadyAbort(promise) {
  if (!promise?.catch) return promise;
  void promise.catch((err) => {
    if (err?.name === "AbortError") return;
  });
  return promise;
}

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
    enrichEmbedPayload,
    buildCertificateGuestEmbedExtras,
    shouldResetOnRerender,
  } = config;
  const urlBridge = { getRole, getEmployer };

  const hostEl = document.createElement("div");
  hostEl.className = "cabinet-standalone-host cabinet-standalone-host--portal";
  hostEl.hidden = true;
  hostEl.setAttribute("data-testid", "cabinet-standalone-host");
  hostEl.innerHTML = `<header class="cabinet-standalone-host__bar">
      <button type="button" class="cabinet-standalone-host__btn" data-action="proto-standalone-back" data-testid="proto-standalone-back">Назад</button>
      <span class="cabinet-standalone-host__title" data-standalone-title></span>
      <button type="button" class="cabinet-standalone-host__btn" data-action="proto-standalone-close" data-testid="proto-standalone-close">Закрыть</button>
    </header>
    <iframe class="cabinet-standalone-host__frame" title="Встроенный макет прототипа" sandbox="allow-scripts allow-same-origin allow-forms" data-testid="cabinet-standalone-frame"></iframe>`;
  document.body.appendChild(hostEl);

  const frame = hostEl.querySelector("[data-testid='cabinet-standalone-frame']");
  const titleEl = hostEl.querySelector("[data-standalone-title]");

  let openPageN = null;
  let openQuery = "";
  let openCtx = null;
  let openEmbedToken = "";
  let resizeObserver = null;
  let embedGuardKey = "";
  let srcdocLoadGeneration = 0;
  let srcdocFetchAbort = null;
  let srcdocReadyAbort = null;
  let contextSendGeneration = 0;

  function embedTokenMatches(dataToken) {
    return String(dataToken ?? "") === String(openEmbedToken ?? "");
  }

  function abortPendingSrcdocWork() {
    srcdocFetchAbort?.abort();
    srcdocFetchAbort = null;
    srcdocReadyAbort?.abort();
    srcdocReadyAbort = null;
  }

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

  function observeLayoutTargets() {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    const shell = document.querySelector(".shell");
    if (shell) resizeObserver.observe(shell);
    const flow = document.querySelector(".proto-page-flow");
    if (flow) resizeObserver.observe(flow);
    const dockPanel = document.querySelector(".proto-page-panel");
    if (dockPanel) resizeObserver.observe(dockPanel);
  }

  function watchLayout() {
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => reposition());
      window.addEventListener("resize", reposition);
      window.addEventListener("scroll", onOuterScroll, { passive: true });
      document.addEventListener("scroll", onOuterScroll, { passive: true, capture: true });
      window.visualViewport?.addEventListener("resize", reposition);
      window.visualViewport?.addEventListener("scroll", reposition);
    }
    observeLayoutTargets();
  }

  function syncEmbedShellChrome() {
    if (hostEl.hidden) return;
    document.documentElement.classList.add("proto-cabinet-embed-host-active");
    document.querySelector(".shell")?.classList.add("cabinet-standalone-active");
    observeLayoutTargets();
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

  function assertCanOpen(pageN, embedCtx = null) {
    if (!STANDALONE_BY_N[pageN]) return deny(pageN);
    const pendingCtx = embedCtx || openCtx;
    if (STANDALONE_BY_N[pageN].workflowNA) {
      const r2Repair = pendingCtx?.r2Repair && pendingCtx?.guestHash;
      if (!(pageN === 141 && r2Repair)) {
        return deny(
          pageN,
          "Маршрут поручения (141) в прототипе только для согласования по TOC, без рабочего R2-сценария в ЛК.",
        );
      }
    }
    if (typeof canOpen === "function" && !canOpen(pageN, pendingCtx)) return deny(pageN);
    return true;
  }

  async function sendContextToFrame() {
    if (!openPageN || !resolveEmbedPayload) return;
    const sendGen = ++contextSendGeneration;
    let payload = resolveEmbedPayload(openPageN, openCtx, openQuery);
    if (!payload) return;
    if (typeof enrichEmbedPayload === "function") {
      try {
        payload = (await enrichEmbedPayload(openPageN, payload)) || payload;
      } catch (_) {}
    }
    if (sendGen !== contextSendGeneration) return;
    try {
      frame.contentWindow?.postMessage(
        { source: "proto-cabinet-host", type: "context", pageN: openPageN, payload },
        "*",
      );
    } catch (_) {}
  }

  function closeHost({ back = false, reset = false } = {}) {
    contextSendGeneration += 1;
    abortPendingSrcdocWork();
    srcdocLoadGeneration += 1;
    hostEl.hidden = true;
    document.querySelector(".shell")?.classList.remove("cabinet-standalone-active");
    document.documentElement.classList.remove("proto-cabinet-embed-host-active");
    frame.removeAttribute("src");
    frame.removeAttribute("srcdoc");
    delete frame.dataset.embedMount;
    delete frame.dataset.embedUrl;
    delete frame.dataset.embedContentReady;
    delete frame.dataset.embedSessionToken;
    delete frame.dataset.embedGuestMarker;
    openPageN = null;
    openQuery = "";
    openCtx = null;
    openEmbedToken = "";
    syncEmbeddedPageBadge(null);
    unwatchLayout();
    if (reset) writeStack([]);
    else if (back) {
      const ctx = popReturn();
      onReturn?.(ctx);
    }
  }

  function syncHostThemeChrome(theme) {
    const t = theme || currentTheme();
    hostEl.dataset.embedHostTheme = t;
    const tokens =
      t === "dark"
        ? { ink: "#f1f0eb", line: "#454b45", surface: "#222523", bg: "#181a19" }
        : { ink: "#242623", line: "#dedfd9", surface: "#ffffff", bg: "#f6f5f3" };
    hostEl.style.setProperty("--embed-host-ink", tokens.ink);
    hostEl.style.setProperty("--embed-host-line", tokens.line);
    hostEl.style.setProperty("--embed-host-surface", tokens.surface);
    hostEl.style.setProperty("--embed-host-bg", tokens.bg);
    const bar = hostEl.querySelector(".cabinet-standalone-host__bar");
    if (bar) {
      bar.style.backgroundColor = tokens.surface;
      bar.style.borderColor = tokens.line;
      bar.style.color = tokens.ink;
    }
    const chromeEls = [
      hostEl.querySelector('[data-testid="proto-standalone-back"]'),
      hostEl.querySelector('[data-testid="proto-standalone-close"]'),
      hostEl.querySelector(".cabinet-standalone-host__title"),
    ];
    chromeEls.forEach((el) => {
      if (!el) return;
      el.style.color = tokens.ink;
      if (el.tagName === "BUTTON") {
        el.style.borderColor = tokens.line;
        el.style.setProperty("-webkit-text-fill-color", tokens.ink);
      }
    });
  }

  function syncThemeToFrame(theme) {
    if (hostEl.hidden) return;
    const t = theme || currentTheme();
    syncHostThemeChrome(t);
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
    if (!assertCanOpen(pageN, embedCtx)) return false;
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

    abortPendingSrcdocWork();
    srcdocLoadGeneration += 1;
    const loadGeneration = srcdocLoadGeneration;
    titleEl.textContent = def.title;
    openPageN = pageN;
    openQuery = extraQuery;
    openEmbedToken = demoRandomToken(12);
    const loadToken = openEmbedToken;
    const loadPageN = pageN;
  const assertSrcdocSessionActive = () =>
    !hostEl.hidden &&
    openEmbedToken === loadToken &&
    openPageN === loadPageN &&
    srcdocLoadGeneration === loadGeneration;
    const useSrcdoc = shouldUseSrcdocStandaloneLoad();
    frame.setAttribute(
      "sandbox",
      useSrcdoc ? "allow-scripts allow-forms" : "allow-scripts allow-same-origin allow-forms",
    );
    if (useSrcdoc) syncEmbeddedPageBadge(null);
    else syncEmbeddedPageBadge(pageN);
    document.querySelector(".shell")?.classList.add("cabinet-standalone-active");
    document.documentElement.classList.add("proto-cabinet-embed-host-active");
    hostEl.hidden = false;
    syncHostThemeChrome();
    watchLayout();
    reposition();
    if (pageN === 139 && openCtx?.publicModel && typeof buildCertificateGuestEmbedExtras === "function") {
      const publicModel = openCtx.publicModel;
      void buildCertificateGuestEmbedExtras(publicModel).then((guestEmbedExtras) => {
        if (!guestEmbedExtras || openPageN !== loadPageN || srcdocLoadGeneration !== loadGeneration) return;
        openCtx = { ...openCtx, guestEmbedExtras };
        sendContextToFrame();
      });
    }
    const guestHash = embedCtx?.guestHash;
    const navUrl = buildStandaloneNavigationUrl(pageN, def.path, extraQuery, urlBridge) || url;
    const commitStandaloneReady = () => {
      if (!assertSrcdocSessionActive()) return;
      syncEmbeddedPageBadge(loadPageN);
      frame.dataset.embedContentReady = "1";
    };

    const waitReady = ({ timeoutMs = 20000, signal = null, requireToken = true } = {}) =>
      waitForEmbedChildContentReady(frame, {
        pageN: loadPageN,
        token: requireToken ? loadToken : "",
        timeoutMs,
        signal,
      });
    const contentReadyPromise = useSrcdoc ? null : waitReady({ timeoutMs: 20000, requireToken: false });

    frame.onload = () => {
      if (!assertSrcdocSessionActive() && useSrcdoc) return;
      if (!useSrcdoc) sendContextToFrame();
      if (!useSrcdoc && contentReadyPromise) {
        void contentReadyPromise
          .then(() => {
            if (openPageN !== loadPageN || openEmbedToken !== loadToken) return;
            commitStandaloneReady();
          })
          .catch((err) => {
            if (err?.name === "AbortError") return;
            if (openPageN !== loadPageN || openEmbedToken !== loadToken) return;
            notify?.("Встроенная страница не загрузилась. Обновите просмотр.", "info");
            closeHost();
          });
      }
    };
    if (useSrcdoc) {
      delete frame.dataset.embedContentReady;
      frame.dataset.embedSessionToken = loadToken;
      srcdocReadyAbort = new AbortController();
      const contentReady = observeEmbedReadyAbort(
        waitReady({
          timeoutMs: 25000,
          signal: srcdocReadyAbort.signal,
          requireToken: true,
        }),
      );
      srcdocFetchAbort = new AbortController();
      void loadStandaloneSrcdoc(frame, loadPageN, def.path, extraQuery, urlBridge, {
        guestHash,
        sessionToken: loadToken,
        signal: srcdocFetchAbort.signal,
        assertActive: assertSrcdocSessionActive,
      })
        .then((mountedUrl) => {
          if (!mountedUrl || !assertSrcdocSessionActive()) return null;
          return contentReady;
        })
        .then((ready) => {
          if (!ready || !assertSrcdocSessionActive()) return;
          commitStandaloneReady();
        })
        .catch((err) => {
          if (err?.name === "AbortError" || err instanceof StandaloneSrcdocStaleError) return;
          if (!assertSrcdocSessionActive()) return;
          notify?.(
            "В preview вложенный макет открывается через загрузку HTML, а не iframe.src (CSP frame-ancestors). Не удалось отобразить страницу.",
            "info",
          );
          closeHost({ reset: false });
        });
      return true;
    }
    frame.removeAttribute("srcdoc");
    delete frame.dataset.embedMount;
    delete frame.dataset.embedContentReady;
    frame.dataset.embedUrl = navUrl;
    frame.src = guestHash ? `${navUrl}#${guestHash}` : navUrl;
    return true;
  }

  function handleHostMessage(ev) {
    if (ev.source !== frame.contentWindow) return;
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-embed") return;

    if (data.type === "ready" || data.type === "need-context") {
      if (frame.dataset.embedMount === "srcdoc" && !embedTokenMatches(data.token)) return;
      try {
        frame.contentWindow?.postMessage(
          { source: "proto-cabinet-host", type: "theme", theme: currentTheme() },
          "*",
        );
      } catch (_) {}
      sendContextToFrame();
      return;
    }
    if (data.type === "embed-content-ready") {
      if (ev.source !== frame.contentWindow) return;
      if (openPageN == null || data.pageN == null || Number(data.pageN) !== Number(openPageN)) return;
      if (frame.dataset.embedMount === "srcdoc") {
        if (!embedTokenMatches(data.token)) return;
      } else if (String(data.token ?? "") !== "" && !embedTokenMatches(data.token)) return;
      syncEmbeddedPageBadge(openPageN);
      frame.dataset.embedContentReady = "1";
      if (data.guestMarker) frame.dataset.embedGuestMarker = String(data.guestMarker);
      else delete frame.dataset.embedGuestMarker;
      return;
    }
    if (data.type === "nav" && data.pageN) {
      const nextCtx = data.ctx ? { ...(openCtx || {}), ...data.ctx } : openCtx;
      if (!assertCanOpen(Number(data.pageN), nextCtx)) return;
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
        abortPendingSrcdocWork();
        srcdocLoadGeneration += 1;
        openPageN = null;
        openQuery = "";
        openCtx = null;
        openEmbedToken = "";
        syncEmbeddedPageBadge(null);
        frame.removeAttribute("src");
        frame.removeAttribute("srcdoc");
        delete frame.dataset.embedMount;
        delete frame.dataset.embedUrl;
        delete frame.dataset.embedContentReady;
        delete frame.dataset.embedSessionToken;
        delete frame.dataset.embedGuestMarker;
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
      syncEmbedShellChrome();
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

export function prepareGuestStandaloneOpen(pageN, suffix, embedCtx, returnCtx, hooks = {}) {
  const record =
    embedCtx?.record ||
    hooks.resolveRecord?.(suffix) ||
    null;
  let nextEmbed = { ...(embedCtx || {}) };
  let nextReturn = { ...(returnCtx || {}) };
  if (record) {
    nextEmbed.record = record;
    nextEmbed.recordId = record.id || suffix;
  }
  if (pageN === 139 && record && hooks.certificatePublicModel) {
    nextEmbed.publicModel = hooks.certificatePublicModel(record);
    nextEmbed.guestHash = hooks.certificateGuestHash?.(record) || "";
  }
  if (pageN === 140) {
    if (record && hooks.recommendationGuestHash) {
      nextEmbed.guestHash = hooks.recommendationGuestHash(record) || "";
      delete nextEmbed.record;
    } else if (hooks.recommendationDesignSampleHash) {
      nextEmbed.guestHash = hooks.recommendationDesignSampleHash();
      nextEmbed.designExample = true;
      delete nextEmbed.record;
    }
  }
  if (pageN === 142 && !nextEmbed.guestHash) {
    delete nextEmbed.observerModel;
  }
  if (pageN === 141 && nextEmbed.guestHash) {
    nextEmbed.r2Repair = true;
  }
  if ([139, 140].includes(pageN) && hooks.closeSourceDialog?.()) {
    if (record?.id) nextReturn.restoreCertificateId = record.id;
  }
  return { embedCtx: nextEmbed, returnCtx: nextReturn };
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
  let embedCtx = ctx?.buildEmbedCtx?.(pageN, suffix) ?? { suffix };
  let returnCtx =
    ctx?.buildReturnContext?.(pageN, suffix, embedCtx) || {
      page: ctx?.getPage?.(),
      role: ctx?.getRole?.(),
      embedCtx,
    };
  if (ctx?.prepareGuestOpen) {
    const prepared = ctx.prepareGuestOpen(pageN, suffix, embedCtx, returnCtx);
    embedCtx = prepared.embedCtx;
    returnCtx = prepared.returnCtx;
  }
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
