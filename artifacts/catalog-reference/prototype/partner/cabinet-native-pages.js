import { NATIVE_PAGES } from "./cabinet-native-pages.generated.js?v=native2";

export const hasNativeCabinetPage = n => Object.hasOwn(NATIVE_PAGES, n);

/** Reuse the accepted HTML/CSS/controllers in an isolated, same-document view.
 * The small document/window adapters only scope DOM and route existing actions.
 * Financial snapshots, actor copy and permission checks stay in their sources.
 */
export function mountNativeCabinetPage(container, n, payload, { dispatch, theme }) {
  const page = NATIVE_PAGES[n];
  if (!page) return null;
  const host = document.createElement("div");
  host.dataset.testid = "cabinet-native-page";
  host.dataset.pageN = String(n);
  host.style.cssText = "display:block;flex:1 1 auto;min-height:0;width:100%;overflow:auto;contain:layout paint style";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = page.css + `
    :host{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    .native-document{min-height:100%;width:100%}
    .native-body{min-height:100%!important;height:auto!important}
    [hidden]{display:none!important}
    .native-document .prr-top,.native-document .pst-top,.native-document .pst-skip{display:none!important}
    .native-document .prr-overlay{position:static!important;min-height:100%;align-items:flex-start!important}
    .native-document .prr-dialog{max-height:none!important;margin:0 auto!important}
    .native-document .partner-dialog{max-width:100%!important}
    .native-document .pst-overlay{display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden}
    .native-document .pst-dialog{max-height:100%!important;min-height:0}
    .native-document .pst-dialog>h2,.native-document .pst-dialog>.pst-dialog__actions{flex-shrink:0}
  `;
  const docElement = document.createElement("div");
  docElement.className = "native-document cabinet-embed-mode";
  docElement.dataset.theme = theme;
  if (n === 146) {
    // Keep the dialog's fixed containing block outside the scrolling form.
    host.style.overflow = "hidden";
    docElement.style.cssText = "height:100%;overflow:auto";
  }
  const body = document.createElement("div");
  body.className = `native-body ${page.bodyClass}`;
  body.innerHTML = page.html;
  docElement.append(body);
  shadow.append(style, docElement);
  container.append(host);

  const messages = new Set();
  const domReady = [];
  const params = new URLSearchParams({ cabinet_embed: "1", proto_n: String(n) });
  const location = { search: `?${params}`, hash: "", href: "" };
  let disposed = false;
  const observers = new Set();
  const animationFrames = new Set();
  const runtime = {
    MutationObserver: class extends MutationObserver {
      constructor(cb) {
        super((...args) => { if (!disposed) cb(...args); });
        observers.add(this);
      }
    },
    requestAnimationFrame(cb) {
      const id = requestAnimationFrame(time => {
        animationFrames.delete(id);
        if (!disposed) cb(time);
      });
      animationFrames.add(id);
      return id;
    },
  };
  function release() {
    disposed = true;
    observers.forEach(observer => observer.disconnect());
    animationFrames.forEach(id => cancelAnimationFrame(id));
    messages.clear();
    host.remove();
  }
  const nativeDocument = {
    documentElement: docElement, body, readyState: "complete",
    querySelector: s => shadow.querySelector(s),
    querySelectorAll: s => shadow.querySelectorAll(s),
    getElementById: id => shadow.getElementById(id),
    createElement: (...args) => document.createElement(...args),
    createTextNode: text => document.createTextNode(text),
    addEventListener(type, cb, opts) {
      if (type === "DOMContentLoaded") domReady.push(cb);
      else shadow.addEventListener(type, cb, opts);
    },
    removeEventListener: (...args) => shadow.removeEventListener(...args),
    get activeElement() { return shadow.activeElement; },
  };
  const nativeWindow = {
    location,
    matchMedia: window.matchMedia.bind(window),
    scrollTo: opts => host.scrollTo(opts),
    addEventListener(type, cb) { if (type === "message") messages.add(cb); },
    removeEventListener(type, cb) { if (type === "message") messages.delete(cb); },
    __protoCabinetEmbedParams: () => params,
    __protoCabinetEmbedAdapterReady() {},
    __protoCabinetEmbedSignalContentReady() {},
    __protoCabinetEmbedPost(data) {
      if (!disposed && !["need-context", "ready", "embed-content-ready"].includes(data.type)) dispatch(data);
    },
    __protoCabinetEmbedNavigate(pageN, query = "", ctx, opts = {}) {
      if (!disposed) dispatch({ type: "nav", pageN, query, ctx, replace: !!opts.replace });
      return true;
    },
    __protoCabinetEmbedBack() {
      if (!disposed) dispatch({ type: "back" });
      return true;
    },
  };
  nativeWindow.window = nativeWindow;
  nativeWindow.parent = nativeWindow;
  function update(nextPayload) {
    if (disposed) return;
    const ev = { data: { source: "proto-cabinet-host", type: "context", pageN: n, payload: nextPayload } };
    for (const cb of messages) cb(ev);
  }
  try {
    page.install(nativeDocument, nativeWindow, location, nativeWindow, nativeWindow.matchMedia, runtime);
    for (const cb of domReady) cb();
    update(payload);
    // Controllers may initialise their own preferred theme; the cabinet owns it.
    docElement.dataset.theme = theme;
  } catch (err) {
    release();
    throw err;
  }
  return {
    update,
    theme(t) { docElement.dataset.theme = t; },
    destroy: release,
  };
}
