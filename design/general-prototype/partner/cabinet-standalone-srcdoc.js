/** Directory URL for partner standalone HTML assets (stable under preview/static proxy). */
export const STANDALONE_ASSET_BASE = new URL("./", import.meta.url).href;

const PREVIEW_HOST = /\.pplx\.app$/i;

/** Native DOM markers — embed badge must not show until one matches (avoids about:blank false positives). */
export const STANDALONE_CONTENT_PROBE = {
  139: "#certificate-root, .cert-guest-page #certificate-root",
  140: "#recommendation-root, .cert-guest-page #recommendation-root",
  141: "#assignment-root",
  142: "#observer-root",
  143: "#partner-title",
  144: "#op-title",
  145: "#prr-main",
  146: "#pst-root, .pst-page",
  147: "#history-title",
};

export function standaloneContentSelector(pageN) {
  return STANDALONE_CONTENT_PROBE[pageN] || "#main, main";
}

export function frameHasStandaloneNativeContent(frame, pageN) {
  if (!frame) return false;
  try {
    const doc = frame.contentDocument;
    if (!doc || !doc.body) return false;
    const probe = standaloneContentSelector(pageN);
    for (const sel of probe.split(",").map((s) => s.trim())) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      if (el.id === "partner-title" || el.id === "history-title" || el.id === "op-title") {
        if ((el.textContent || "").trim().length > 0) return true;
        continue;
      }
      return true;
    }
    return doc.body.childElementCount > 0 && doc.body.textContent.trim().length > 0;
  } catch (_) {
    return false;
  }
}

export function waitForStandaloneFrameContent(frame, pageN, { timeoutMs = 20000 } = {}) {
  if (!frame) return Promise.reject(new Error("no frame"));
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (frameHasStandaloneNativeContent(frame, pageN)) {
        resolve(true);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`standalone native content timeout n=${pageN}`));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function embedReadyMessageMatches(d, { pageN, token }) {
  if (!d || d.source !== "proto-cabinet-embed" || d.type !== "embed-content-ready") return false;
  const expectToken = token != null ? String(token) : "";
  if (String(d.token ?? "") !== expectToken) return false;
  if (pageN != null && (d.pageN == null || Number(d.pageN) !== Number(pageN))) return false;
  return true;
}

/** Opaque sandbox: parent cannot read child DOM — wait for postMessage after model application. */
export function waitForEmbedChildContentReady(frame, { pageN, token, timeoutMs = 20000, signal = null } = {}) {
  if (!frame?.contentWindow) return Promise.reject(new Error("no frame"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const onMsg = (ev) => {
      if (ev.source !== frame.contentWindow) return;
      const d = ev.data;
      if (!embedReadyMessageMatches(d, { pageN, token })) return;
      finish(resolve, d);
    };
    const timer = setTimeout(() => {
      finish(reject, new Error(`embed-content-ready timeout n=${pageN}`));
    }, timeoutMs);
    const onAbort = () => {
      finish(reject, new DOMException("embed-content-ready aborted", "AbortError"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };
    window.addEventListener("message", onMsg);
    signal?.addEventListener("abort", onAbort);
  });
}

export function shouldUseSrcdocStandaloneLoad() {
  if (typeof window === "undefined") return false;
  try {
    if (window !== window.top) return true;
    if (PREVIEW_HOST.test(window.location.hostname || "")) return true;
  } catch (_) {
    return true;
  }
  return false;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function buildStandaloneFetchUrl(pageN, defPath, extraQuery, bridge, assetBase = STANDALONE_ASSET_BASE) {
  if (!defPath) return null;
  const params = new URLSearchParams({ cabinet_embed: "1", proto_n: String(pageN) });
  const role = bridge?.getRole?.();
  const employer = bridge?.getEmployer?.();
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
  const docUrl = new URL(defPath, assetBase);
  params.forEach((v, k) => docUrl.searchParams.set(k, v));
  return docUrl.href;
}

export function buildStandaloneNavigationUrl(pageN, defPath, extraQuery, bridge) {
  const fetchUrl = buildStandaloneFetchUrl(pageN, defPath, extraQuery, bridge);
  if (!fetchUrl) return null;
  try {
    return new URL(fetchUrl, window.location.href).href;
  } catch (_) {
    return fetchUrl;
  }
}

export function injectSrcdocEmbedBoot(html, queryString, baseHref, { sessionToken = "", guestHash = "" } = {}) {
  const q = queryString.startsWith("?") ? queryString.slice(1) : queryString;
  const hash = guestHash ? String(guestHash).replace(/^#/, "") : "";
  const boot = `<script>window.__protoCabinetEmbedSearch=${JSON.stringify(q)};window.__protoCabinetEmbedSessionToken=${JSON.stringify(sessionToken)};window.__protoCabinetEmbedHash=${JSON.stringify(hash)};</script>`;
  let out = html;
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${escapeAttr(baseHref)}">`);
  }
  if (!out.includes("__protoCabinetEmbedSearch")) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${boot}`);
  }
  return out;
}

export class StandaloneSrcdocStaleError extends Error {
  constructor(reason = "stale") {
    super(reason);
    this.name = "StandaloneSrcdocStaleError";
  }
}

export async function loadStandaloneSrcdoc(
  frame,
  pageN,
  defPath,
  extraQuery,
  bridge,
  { guestHash = "", sessionToken = "", signal = null, assertActive = null } = {},
) {
  if (!defPath) throw new Error("unknown standalone page");
  const fetchUrl = buildStandaloneFetchUrl(pageN, defPath, extraQuery, bridge);
  if (!fetchUrl) throw new Error("standalone url");
  if (assertActive && !assertActive()) throw new StandaloneSrcdocStaleError("pre-fetch");
  const docUrl = new URL(fetchUrl);
  const response = await fetch(fetchUrl, {
    credentials: "same-origin",
    cache: "no-store",
    signal: signal || undefined,
  });
  if (assertActive && !assertActive()) throw new StandaloneSrcdocStaleError("post-fetch");
  if (!response.ok) throw new Error(`fetch ${response.status}`);
  const html = await response.text();
  if (assertActive && !assertActive()) throw new StandaloneSrcdocStaleError("post-read");
  const baseHref = new URL("./", docUrl).href;
  const srcdoc = injectSrcdocEmbedBoot(html, docUrl.search, baseHref, {
    sessionToken,
    guestHash: guestHash ? String(guestHash).replace(/^#/, "") : "",
  });
  if (assertActive && !assertActive()) throw new StandaloneSrcdocStaleError("pre-mount");
  frame.removeAttribute("src");
  frame.srcdoc = srcdoc;
  frame.dataset.embedUrl = fetchUrl;
  frame.dataset.embedMount = "srcdoc";
  delete frame.dataset.embedContentReady;
  return fetchUrl;
}
