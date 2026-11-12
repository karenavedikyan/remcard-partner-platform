(function protoCabinetEmbedChild() {
  if (typeof window === "undefined") return;
  var params;
  try {
    params = new URLSearchParams(window.location.search);
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

  function post(msg) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
      }
    } catch (_) {}
  }

  window.__protoCabinetEmbedNavigate = function embedNavigate(targetN, extraQuery) {
    if (window.parent === window) return false;
    post({ type: "nav", pageN: Number(targetN), query: extraQuery || "" });
    return true;
  };

  window.__protoCabinetEmbedBack = function embedBack() {
    if (window.parent === window) return false;
    post({ type: "back" });
    return true;
  };

  function resolvePageFromHref(href) {
    try {
      var u = new URL(href, window.location.href);
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
          var u = new URL(href, window.location.href);
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
