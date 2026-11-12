/**
 * Prototype reviewer: one stable page number per logical screen.
 * See PROTOTYPE-PAGES.md.
 */
(function protoPageNumbering() {
  if (typeof window === "undefined" || window.__protoPageNumberingBooted) return;
  window.__protoPageNumberingBooted = true;

  const ROOT_MARKER = "design/general-prototype/";

  function hubPath(rel) {
    const here = location.pathname;
    const idx = here.indexOf(ROOT_MARKER);
    if (idx >= 0) {
      const base = here.slice(0, idx + ROOT_MARKER.length);
      return base + rel.replace(/^\//, "");
    }
    return "../".repeat(6) + rel.replace(/^\//, "");
  }

  function partnerCabinet(section, role) {
    const params = new URLSearchParams({ role });
    if (section && section !== "home") params.set("open", section);
    return `${hubPath("partner/roles.html")}?${params}`;
  }

  const PAGES = [
    { n: 1, id: "hub", title: "Общий вход прототипа", href: () => hubPath("index.html") },
    { n: 2, id: "client:catalog", title: "Клиент · каталог", href: () => `${hubPath("client/index.html")}#/catalog`, clientHash: "catalog" },
    { n: 3, id: "client:navigator", title: "Клиент · навигатор ремонта", href: () => `${hubPath("client/index.html")}#/navigator`, clientHash: "navigator" },
    { n: 4, id: "client:care", title: "Клиент · забота", href: () => `${hubPath("client/index.html")}#/care`, clientHash: "care" },
    { n: 5, id: "client:calc", title: "Клиент · калькулятор материалов", href: () => `${hubPath("client/index.html")}#/calc/materials`, clientHash: "calc/materials" },
    { n: 6, id: "partner:registration", title: "Партнёр · регистрация и вход", href: () => hubPath("partner/index.html") },
    { n: 7, id: "partner:specialist:home", title: "Кабинет специалиста · главная", role: "specialist", section: "home" },
    { n: 8, id: "partner:specialist:clients", title: "Кабинет специалиста · клиенты", role: "specialist", section: "clients" },
    { n: 9, id: "partner:specialist:partners", title: "Кабинет специалиста · партнёры", role: "specialist", section: "partners" },
    { n: 10, id: "partner:specialist:recommendations", title: "Кабинет специалиста · сертификаты", role: "specialist", section: "recommendations" },
    { n: 11, id: "partner:specialist:bonus", title: "Кабинет специалиста · бонусы", role: "specialist", section: "bonus" },
    { n: 12, id: "partner:specialist:scanner", title: "Кабинет специалиста · сканер", role: "specialist", section: "scanner" },
    { n: 13, id: "partner:specialist:procurement", title: "Кабинет специалиста · закупки (R2)", role: "specialist", section: "procurement", r2: true },
    { n: 14, id: "partner:specialist:care", title: "Кабинет специалиста · забота (R2)", role: "specialist", section: "care", r2: true },
    { n: 15, id: "partner:specialist:profile", title: "Кабинет специалиста · профиль", role: "specialist", section: "profile" },
    { n: 16, id: "partner:store:home", title: "Кабинет магазина · главная", role: "store", section: "home" },
    { n: 17, id: "partner:store:clients", title: "Кабинет магазина · клиенты", role: "store", section: "clients" },
    { n: 18, id: "partner:store:recommendations", title: "Кабинет магазина · сертификаты", role: "store", section: "recommendations" },
    { n: 19, id: "partner:store:partners", title: "Кабинет магазина · партнёры", role: "store", section: "partners" },
    { n: 20, id: "partner:store:scanner", title: "Кабинет магазина · сканер", role: "store", section: "scanner" },
    { n: 21, id: "partner:store:history", title: "Кабинет магазина · история", role: "store", section: "history" },
    { n: 22, id: "partner:store:settlements", title: "Кабинет магазина · кошелёк", role: "store", section: "settlements" },
    { n: 23, id: "partner:store:procurement", title: "Кабинет магазина · закупки (R2)", role: "store", section: "procurement", r2: true },
    { n: 24, id: "partner:store:care", title: "Кабинет магазина · забота (R2)", role: "store", section: "care", r2: true },
    { n: 25, id: "partner:store:profile", title: "Кабинет магазина · профиль", role: "store", section: "profile" },
    { n: 26, id: "partner:company:home", title: "Кабинет компании · главная", role: "company", section: "home" },
    { n: 27, id: "partner:company:recommendations", title: "Кабинет компании · сертификаты", role: "company", section: "recommendations" },
    { n: 28, id: "partner:company:partners", title: "Кабинет компании · партнёры", role: "company", section: "partners" },
    { n: 29, id: "partner:company:clients", title: "Кабинет компании · клиенты", role: "company", section: "clients" },
    { n: 30, id: "partner:company:scanner", title: "Кабинет компании · сканер", role: "company", section: "scanner" },
    { n: 31, id: "partner:company:history", title: "Кабинет компании · история", role: "company", section: "history" },
    { n: 32, id: "partner:company:settlements", title: "Кабинет компании · кошелёк", role: "company", section: "settlements" },
    { n: 33, id: "partner:company:team", title: "Кабинет компании · сотрудники", role: "company", section: "team" },
    { n: 34, id: "partner:company:procurement", title: "Кабинет компании · закупки (R2)", role: "company", section: "procurement", r2: true },
    { n: 35, id: "partner:company:care", title: "Кабинет компании · забота (R2)", role: "company", section: "care", r2: true },
    { n: 36, id: "partner:company:profile", title: "Кабинет компании · профиль", role: "company", section: "profile" },
    { n: 37, id: "partner:agent:home", title: "Кабинет агента · главная", role: "agent", section: "home" },
    { n: 38, id: "partner:agent:clients", title: "Кабинет агента · клиенты", role: "agent", section: "clients" },
    { n: 39, id: "partner:agent:partners", title: "Кабинет агента · партнёры", role: "agent", section: "partners" },
    { n: 40, id: "partner:agent:recommendations", title: "Кабинет агента · сертификаты", role: "agent", section: "recommendations" },
    { n: 41, id: "partner:agent:bonus", title: "Кабинет агента · бонусы", role: "agent", section: "bonus" },
    { n: 42, id: "partner:agent:procurement", title: "Кабинет агента · закупки (R2)", role: "agent", section: "procurement", r2: true },
    { n: 43, id: "partner:agent:care", title: "Кабинет агента · забота (R2)", role: "agent", section: "care", r2: true },
    { n: 44, id: "partner:agent:profile", title: "Кабинет агента · профиль", role: "agent", section: "profile" },
    { n: 45, id: "partner:employee:home", title: "Кабинет сотрудника · главная", role: "employee", section: "home" },
    { n: 46, id: "partner:employee:partners", title: "Кабинет сотрудника · партнёры", role: "employee", section: "partners" },
    { n: 47, id: "partner:employee:clients", title: "Кабинет сотрудника · клиенты", role: "employee", section: "clients" },
    { n: 48, id: "partner:employee:scanner", title: "Кабинет сотрудника · сканер", role: "employee", section: "scanner" },
    { n: 49, id: "partner:employee:history", title: "Кабинет сотрудника · история", role: "employee", section: "history" },
    { n: 50, id: "partner:employee:settlements", title: "Кабинет сотрудника · взаиморасчёты", role: "employee", section: "settlements" },
    { n: 51, id: "partner:employee:team", title: "Кабинет сотрудника · команда", role: "employee", section: "team" },
    { n: 52, id: "partner:employee:procurement", title: "Кабинет сотрудника · закупки (R2)", role: "employee", section: "procurement", r2: true },
    { n: 53, id: "partner:employee:care", title: "Кабинет сотрудника · забота (R2)", role: "employee", section: "care", r2: true },
    { n: 54, id: "partner:employee:profile", title: "Кабинет сотрудника · профиль", role: "employee", section: "profile" },
    { n: 55, id: "partner:legacy", title: "Партнёр · legacy", href: () => hubPath("partner/legacy.html") },
    { n: 56, id: "partner:certificate-guest", title: "Гостевой сертификат", href: () => hubPath("partner/certificate.html") },
    { n: 57, id: "partner:recommendation-guest", title: "Гостевая рекомендация", href: () => hubPath("partner/recommendation.html") },
    { n: 58, id: "partner:assignment-guest", title: "Поручение исполнителю", href: () => hubPath("partner/assignment.html") },
    { n: 59, id: "partner:observer-guest", title: "Наблюдение за объектом", href: () => hubPath("partner/observer.html") },
    { n: 60, id: "partner:cooperation-detail", title: "Деталь сотрудничества", href: () => hubPath("partner/partner-cooperation-detail.html") },
    { n: 61, id: "partner:purchase-detail", title: "Деталь покупки", href: () => hubPath("partner/partner-purchase-detail.html") },
    { n: 62, id: "partner:reward-receipt", title: "Квитанция вознаграждения", href: () => hubPath("partner/partner-reward-receipt.html") },
    { n: 63, id: "partner:scan-transaction", title: "Сканер · эталон", href: () => hubPath("partner/partner-scan-transaction.html") },
    { n: 64, id: "partner:wallet-history", title: "История кошелька", href: () => hubPath("partner/partner-wallet-history.html") },
    { n: 65, id: "admin:moderation", title: "Админ · модерация", href: () => `${hubPath("admin/index.html")}#/moderation`, adminHash: "moderation" },
    { n: 66, id: "admin:catalog", title: "Админ · каталог", href: () => `${hubPath("admin/index.html")}#/catalog`, adminHash: "catalog" },
    { n: 67, id: "admin:partners", title: "Админ · партнёры", href: () => `${hubPath("admin/index.html")}#/partners`, adminHash: "partners" },
  ];

  PAGES.forEach((p) => {
    if (!p.href && p.role) {
      p.href = () => {
        let url = partnerCabinet(p.section, p.role);
        if (p.r2) url += (url.includes("?") ? "&" : "?") + "rc_demo_release=2";
        return url;
      };
    }
  });

  const byId = new Map(PAGES.map((p) => [p.id, p]));
  const byN = new Map(PAGES.map((p) => [p.n, p]));

  function normalizeRelPath() {
    const path = location.pathname || "";
    const idx = path.indexOf(ROOT_MARKER);
    const rel = idx >= 0 ? path.slice(idx + ROOT_MARKER.length) : path.replace(/^\//, "");
    return rel || "index.html";
  }

  function clientHashRoute() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const route = raw.split("?")[0] || "catalog";
    return route;
  }

  function adminHashRoute() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    return raw.split("?")[0] || "moderation";
  }

  const STANDALONE_MAP = {
    "partner/legacy.html": "partner:legacy",
    "partner/certificate.html": "partner:certificate-guest",
    "partner/recommendation.html": "partner:recommendation-guest",
    "partner/assignment.html": "partner:assignment-guest",
    "partner/observer.html": "partner:observer-guest",
    "partner/partner-cooperation-detail.html": "partner:cooperation-detail",
    "partner/partner-purchase-detail.html": "partner:purchase-detail",
    "partner/partner-reward-receipt.html": "partner:reward-receipt",
    "partner/partner-scan-transaction.html": "partner:scan-transaction",
    "partner/partner-wallet-history.html": "partner:wallet-history",
  };

  function partnerContextFromDom() {
    const rel = normalizeRelPath();
    const isPartnerSpa =
      rel === "partner/index.html" ||
      rel === "partner/roles.html" ||
      rel.endsWith("/partner/index.html") ||
      rel.endsWith("/partner/roles.html");
    if (!isPartnerSpa) return null;

    const qs = new URLSearchParams(location.search);
    const qsRole = qs.get("role");
    const cabinetBtn = document.querySelector('[data-testid="view-cabinet"]');
    const openFromQs = qs.get("open");

    if (cabinetBtn) {
      if (cabinetBtn.getAttribute("aria-pressed") !== "true" && !openFromQs) {
        return { mode: "registration" };
      }
    } else if (!openFromQs && !document.querySelector(".cabinet-shell, aside.sidebar, .nav-btn")) {
      return { mode: "registration" };
    }

    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    const role = (roleEl && roleEl.value) || qsRole || "store";

    let section = qs.get("open") || "home";
    const currentNav = document.querySelector(".nav-btn[aria-current='page']");
    if (currentNav) {
      const act = currentNav.getAttribute("data-action") || "";
      const m = act.match(/^nav:(.+)$/);
      if (m) section = m[1];
    }
    if (section === "links") section = "team";
    if (section === "wallet") section = "settlements";
    return { mode: "cabinet", role, section };
  }

  function resolveCurrentPage() {
    const rel = normalizeRelPath();

    if (rel === "index.html" || rel === "") return byId.get("hub");
    if (rel === "client/index.html") {
      const route = clientHashRoute();
      const id =
        route === "navigator"
          ? "client:navigator"
          : route.startsWith("care")
            ? "client:care"
            : route.startsWith("calc")
              ? "client:calc"
              : "client:catalog";
      return byId.get(id);
    }
    if (rel === "admin/index.html") {
      const route = adminHashRoute();
      const id =
        route === "catalog" ? "admin:catalog" : route === "partners" ? "admin:partners" : "admin:moderation";
      return byId.get(id);
    }
    const standalone = STANDALONE_MAP[rel];
    if (standalone) return byId.get(standalone);

    const partner = partnerContextFromDom();
    if (partner) {
      if (partner.mode === "registration") return byId.get("partner:registration");
      const id = `partner:${partner.role}:${partner.section}`;
      return byId.get(id) || byId.get(`partner:${partner.role}:home`);
    }

    return byId.get("hub");
  }

  let badgeEl;
  let panelEl;
  let listEl;
  let searchEl;
  let tocBtn;
  let scheduled = false;

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshBadge();
    });
  }

  function refreshBadge() {
    const page = resolveCurrentPage();
    if (!page || !badgeEl) return;
    badgeEl.textContent = `Страница ${page.n} · ${page.title}`;
    badgeEl.title = page.id;
    window.__protoCurrentPage = page;
    listEl?.querySelectorAll("a[data-current]").forEach((a) => a.removeAttribute("data-current"));
    const link = listEl?.querySelector(`a[data-page-n="${page.n}"]`);
    if (link) link.setAttribute("data-current", "true");
  }

  function buildToc() {
    listEl.innerHTML = PAGES.map(
      (p) =>
        `<li><a href="${escapeAttr(p.href())}" data-page-n="${p.n}"><span class="n">${p.n}</span> ${escapeHtml(p.title)}</a></li>`,
    ).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function togglePanel(open) {
    const next = open ?? panelEl.getAttribute("data-open") !== "true";
    panelEl.setAttribute("data-open", next ? "true" : "false");
    tocBtn.setAttribute("aria-expanded", next ? "true" : "false");
    if (next) searchEl.focus();
  }

  function mountChrome() {
    document.body.classList.add("proto-page-reviewer");

    const flow = document.createElement("div");
    flow.className = "proto-page-flow";
    flow.setAttribute("aria-hidden", "false");

    badgeEl = document.createElement("div");
    badgeEl.className = "proto-page-badge";
    badgeEl.setAttribute("aria-live", "polite");

    tocBtn = document.createElement("button");
    tocBtn.type = "button";
    tocBtn.className = "proto-page-toc-btn";
    tocBtn.textContent = "Страницы";
    tocBtn.setAttribute("aria-expanded", "false");
    tocBtn.addEventListener("click", () => togglePanel());

    flow.append(badgeEl, tocBtn);
    document.body.appendChild(flow);

    panelEl = document.createElement("div");
    panelEl.className = "proto-page-panel";
    panelEl.setAttribute("data-open", "false");
    panelEl.innerHTML = `<div class="proto-page-panel-head"><input class="proto-page-search" type="search" placeholder="Поиск по номеру или названию" autocomplete="off" /></div><ul class="proto-page-list"></ul>`;
    document.body.appendChild(panelEl);

    searchEl = panelEl.querySelector(".proto-page-search");
    listEl = panelEl.querySelector(".proto-page-list");
    buildToc();

    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      listEl.querySelectorAll("li").forEach((li) => {
        const text = li.textContent.toLowerCase();
        li.hidden = q.length > 0 && !text.includes(q);
      });
    });

    document.addEventListener(
      "click",
      (e) => {
        if (panelEl.contains(e.target) || flow.contains(e.target)) return;
        if (panelEl.getAttribute("data-open") === "true") togglePanel(false);
      },
      true,
    );
  }

  window.PROTOTYPE_PAGE_CATALOG = Object.freeze(PAGES.map((p) => ({ n: p.n, id: p.id, title: p.title })));
  window.protoResolvePage = resolveCurrentPage;
  window.protoPageByNumber = (n) => byN.get(Number(n));

  mountChrome();
  refreshBadge();

  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("popstate", scheduleRefresh);
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-action^='nav:'], [data-action^='view:'], [data-testid^='nav-'], [data-control]")) {
        scheduleRefresh();
      }
    },
    true,
  );

  const appRoot = document.getElementById("app") || document.getElementById("main");
  if (appRoot && typeof MutationObserver !== "undefined") {
    let t = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(scheduleRefresh, 280);
    });
    mo.observe(appRoot, { childList: true });
  }
})();
