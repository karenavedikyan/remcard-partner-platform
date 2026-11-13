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

  window.__protoCabinetEmbedSignalContentReady = function protoCabinetEmbedSignalContentReady(pageN) {
    var n = pageN != null ? Number(pageN) : Number(params.get("proto_n") || 0) || null;
    post({ type: "embed-content-ready", pageN: n });
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
      return FILE_TO_N[name] || null;
    } catch (_) {
      return null;
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
      var pageN = resolvePageFromHref(href);
      if (pageN) {
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

  post({ type: "ready", pageN: Number(params.get("proto_n") || 0) || null });

  (function scheduleGuestRootReadyProbe() {
    var n = Number(params.get("proto_n") || 0);
    if (n !== 141 && n !== 142) return;
    var sel = n === 141 ? "#assignment-root" : "#observer-root";
    var started = Date.now();
    (function tick() {
      var root = document.querySelector(sel);
      if (root && root.childElementCount > 0) {
        window.__protoCabinetEmbedSignalContentReady(n);
        return;
      }
      if (Date.now() - started > 18000) return;
      requestAnimationFrame(tick);
    })();
  })();

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
