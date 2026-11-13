(function protoCabinetEmbedChild() {
  if (typeof window === "undefined") return;
  function embedSearchString() {
    if (window.location.search && window.location.search.length > 1) {
      return window.location.search;
    }
    if (typeof window.__protoCabinetEmbedSearch === "string" && window.__protoCabinetEmbedSearch) {
      return "?" + window.__protoCabinetEmbedSearch;
    }
    return "";
  }
  window.__protoCabinetEmbedParams = function protoCabinetEmbedParams() {
    try {
      return new URLSearchParams(embedSearchString().replace(/^\?/, ""));
    } catch (_) {
      return new URLSearchParams();
    }
  };
  window.__protoCabinetEffectiveHash = function protoCabinetEffectiveHash() {
    var fromLoc = window.location.hash || "";
    if (fromLoc) return fromLoc;
    var boot = window.__protoCabinetEmbedHash;
    if (!boot) return "";
    return boot.charAt(0) === "#" ? boot : "#" + boot;
  };
  function applyBootHashBeforeLock() {
    var raw = window.__protoCabinetEmbedHash;
    if (!raw) return;
    var hash = raw.charAt(0) === "#" ? raw : "#" + raw;
    try {
      if (!window.location.hash) {
        var q = embedSearchString();
        history.replaceState(null, "", (q || window.location.pathname || "") + hash);
      }
    } catch (_) {}
  }
  applyBootHashBeforeLock();
  var params;
  try {
    params = window.__protoCabinetEmbedParams();
  } catch (_) {
    return;
  }
  if (params.get("cabinet_embed") !== "1") return;
  if (window.__protoCabinetEmbedChildBooted) return;
  window.__protoCabinetEmbedChildBooted = true;

  document.documentElement.classList.add("cabinet-embed-mode");

  var FILE_TO_N = {
    "certificate.html": 139,
    "recommendation.html": 140,
    "assignment.html": 141,
    "observer.html": 142,
    "partner-cooperation-detail.html": 143,
    "partner-purchase-detail.html": 144,
    "partner-reward-receipt.html": 145,
    "partner-scan-transaction.html": 146,
    "partner-wallet-history.html": 147,
  };

  function embedSessionToken() {
    return typeof window.__protoCabinetEmbedSessionToken === "string"
      ? window.__protoCabinetEmbedSessionToken
      : "";
  }

  function post(msg) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          Object.assign({ source: "proto-cabinet-embed", token: embedSessionToken() }, msg),
          "*",
        );
      }
    } catch (_) {}
  }

  window.__protoCabinetEmbedPost = post;

  window.__protoCabinetEmbedSignalContentReady = function protoCabinetEmbedSignalContentReady(pageN, extra) {
    var n = pageN != null ? Number(pageN) : Number(params.get("proto_n") || 0) || null;
    var msg = { type: "embed-content-ready", pageN: n };
    if (extra && typeof extra === "object") {
      if (extra.guestMarker) msg.guestMarker = String(extra.guestMarker);
    } else if (typeof extra === "string" && extra) {
      msg.guestMarker = extra;
    }
    post(msg);
  };

  window.__protoCabinetEmbedNavigate = function embedNavigate(targetN, extraQuery, ctx, opts) {
    if (window.parent === window) return false;
    post({
      type: "nav",
      pageN: Number(targetN),
      query: extraQuery || "",
      ctx: ctx || null,
      replace: !!(opts && opts.replace),
    });
    return true;
  };

  window.__protoCabinetEmbedBack = function embedBack() {
    if (window.parent === window) return false;
    post({ type: "back" });
    return true;
  };

  function embedLinkBase() {
    try {
      var base = document.baseURI || "";
      if (base && !/^about:/.test(base)) return base;
    } catch (_) {}
    try {
      var href = window.location.href || "";
      if (href && !/^about:/.test(href)) return href;
    } catch (_) {}
    return "";
  }

  function resolvePageFromHref(href) {
    try {
      var u = new URL(href, embedLinkBase());
      var name = u.pathname.split("/").pop() || "";
      var pageN = FILE_TO_N[name] || null;
      if (!pageN && /certificate\.html/i.test(u.pathname || href)) pageN = 139;
      if (!pageN && /recommendation\.html/i.test(u.pathname || href)) pageN = 140;
      return pageN;
    } catch (_) {
      return null;
    }
  }

  function isSameCertificatePartnerLink(href) {
    try {
      var u = new URL(href, embedLinkBase());
      var currentN = Number(params.get("proto_n") || 0) || 0;
      if (currentN !== 139) return false;
      if (u.searchParams.get("partner") === null) return false;
      return /certificate\.html/i.test(u.pathname || href);
    } catch (_) {
      return false;
    }
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest("a[href]");
      if (!a || a.hasAttribute("data-proto-embed-ignore")) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
      if (isSameCertificatePartnerLink(href)) {
        e.preventDefault();
        return;
      }
      var pageN = resolvePageFromHref(href);
      if (pageN) {
        var currentN = Number(params.get("proto_n") || 0) || 0;
        if (currentN && pageN === currentN) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        try {
          var u = new URL(href, embedLinkBase());
          post({ type: "nav", pageN: pageN, query: u.search || "" });
        } catch (_) {
          post({ type: "nav", pageN: pageN, query: "" });
        }
        return;
      }
      if (/index\.html|\.\.\//.test(href)) {
        e.preventDefault();
        post({ type: "back" });
      }
    },
    true,
  );

  function blockStorage(name) {
    try {
      var blocked = {
        getItem: function () {
          return null;
        },
        setItem: function () {},
        removeItem: function () {},
        clear: function () {},
        key: function () {
          return null;
        },
        length: 0,
      };
      Object.defineProperty(window, name, {
        configurable: true,
        get: function () {
          return blocked;
        },
      });
    } catch (_) {}
  }

  blockStorage("localStorage");
  blockStorage("sessionStorage");

  try {
    var noop = function () {};
    history.pushState = noop;
    history.replaceState = noop;
  } catch (_) {}

  var EMBED_ADAPTER_PAGE_N = {
    "139": 1,
    "140": 1,
    "141": 1,
    "142": 1,
    "143": 1,
    "144": 1,
    "145": 1,
    "146": 1,
    "147": 1,
  };
  var domHandshakeReady = false;
  var embedAdapterReady = false;
  var embedChildReadySent = false;

  function embedPageN() {
    return Number(params.get("proto_n") || 0) || 0;
  }

  function pageUsesEmbedAdapter() {
    var n = embedPageN();
    return n && EMBED_ADAPTER_PAGE_N[String(n)];
  }

  window.__protoCabinetEmbedAdapterReady = function protoCabinetEmbedAdapterReady(pageN) {
    var expected = embedPageN();
    if (expected && Number(pageN) !== expected) return;
    embedAdapterReady = true;
    maybeEmitChildReady();
  };

  function maybeEmitChildReady() {
    if (embedChildReadySent) return;
    if (!domHandshakeReady) return;
    if (pageUsesEmbedAdapter() && !embedAdapterReady) return;
    embedChildReadySent = true;
    post({ type: "ready", pageN: embedPageN() || null });
  }

  function onDomHandshakeReady() {
    domHandshakeReady = true;
    if (!pageUsesEmbedAdapter()) embedAdapterReady = true;
    maybeEmitChildReady();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomHandshakeReady, { once: true });
  } else if (typeof queueMicrotask === "function") {
    queueMicrotask(onDomHandshakeReady);
  } else {
    setTimeout(onDomHandshakeReady, 0);
  }

  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.source !== "proto-cabinet-host") return;
    if (data.type === "theme" && typeof data.theme === "string") {
      document.documentElement.dataset.theme = data.theme;
    }
    if (data.type === "context" && data.payload && data.payload.permissions) {
      var p = data.payload.permissions;
      if (p.readOnlyWallet || p.viewOnly) {
        document.documentElement.dataset.embedReadonly = "1";
      } else {
        delete document.documentElement.dataset.embedReadonly;
      }
    }
  });
})();
