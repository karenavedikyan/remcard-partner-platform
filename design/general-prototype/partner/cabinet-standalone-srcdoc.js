/** Directory URL for partner standalone HTML assets (stable under preview/static proxy). */
export const STANDALONE_ASSET_BASE = new URL("./", import.meta.url).href;

const PREVIEW_HOST = /\.pplx\.app$/i;

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

export function injectSrcdocEmbedBoot(html, queryString, baseHref) {
  const q = queryString.startsWith("?") ? queryString.slice(1) : queryString;
  const boot = `<script>window.__protoCabinetEmbedSearch=${JSON.stringify(q)};</script>`;
  let out = html;
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${escapeAttr(baseHref)}">`);
  }
  if (!out.includes("__protoCabinetEmbedSearch")) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${boot}`);
  }
  return out;
}

export async function loadStandaloneSrcdoc(
  frame,
  pageN,
  defPath,
  extraQuery,
  bridge,
  { guestHash = "" } = {},
) {
  if (!defPath) throw new Error("unknown standalone page");
  const fetchUrl = buildStandaloneFetchUrl(pageN, defPath, extraQuery, bridge);
  if (!fetchUrl) throw new Error("standalone url");
  const docUrl = new URL(fetchUrl);
  const response = await fetch(fetchUrl, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(`fetch ${response.status}`);
  const html = await response.text();
  const baseHref = new URL("./", docUrl).href;
  const srcdoc = injectSrcdocEmbedBoot(html, docUrl.search, baseHref);
  frame.removeAttribute("src");
  frame.srcdoc = guestHash ? `${srcdoc}<!--#${guestHash}-->` : srcdoc;
  frame.dataset.embedUrl = fetchUrl;
  frame.dataset.embedMount = "srcdoc";
  return fetchUrl;
}
