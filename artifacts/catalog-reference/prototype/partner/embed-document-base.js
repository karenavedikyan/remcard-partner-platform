/** Base URL for partner/*.html resolution in iframe.src and srcdoc embeds (location.href may be about:srcdoc). */
export function partnerEmbedDocumentBase() {
  if (typeof document !== "undefined") {
    try {
      const base = document.baseURI || "";
      if (base && !base.startsWith("about:")) return base;
    } catch (_) {}
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return new URL("./", import.meta.url).href;
    }
  } catch (_) {}
  try {
    if (typeof window !== "undefined" && window.location?.href) {
      const href = window.location.href;
      if (!href.startsWith("about:")) return new URL("./", href).href;
    }
  } catch (_) {}
  return "";
}

export function resolvePartnerEmbedPageUrl(relativePath) {
  const base = partnerEmbedDocumentBase();
  if (!base) throw new TypeError("embed document base unavailable");
  return new URL(relativePath, base).href;
}
