(function () {
  "use strict";

  const WAIT_DAYS = 14;
  const RECEIVING = {
    id: "DEMO-PARTNER-017",
    name: 'РемТех на Ленина',
    city: "Казань",
  };
  const REFERRER_VIEWER = {
    id: "DEMO-PARTNER-0100",
    name: "Мария Орлова",
    kind: "специалист",
  };

  const INCOMING_ACTOR = "Демо-роль: менеджер принимающего партнёра";
  const OUTGOING_ACTOR = "Демо-роль: рекомендатель · только свои referral";

  const SOURCE_OPTIONS = [
    { key: "all", label: "Все источники" },
    { key: "scan", label: "Сертификат (скан)" },
    { key: "manual", label: "Вручную" },
    { key: "phone", label: "Звонок" },
    { key: "visit", label: "Визит в магазин" },
  ];

  /** @type {Record<string, {kind:string, title:string, appealId:string, amountLabel:string, statusLabel:string, note:string}>} */
  const walletPurchases = {};

  /** @type {Record<string, {name:string, city?:string}>} */
  const PARTNERS = {
    "DEMO-PARTNER-017": { name: "РемТех на Ленина", city: "Казань" },
    "DEMO-PARTNER-022": { name: "ФормаПро", city: "Екатеринбург" },
    "DEMO-PARTNER-008": { name: "Андрей Ким", city: "Москва" },
    "DEMO-PARTNER-0100": { name: "Мария Орлова", city: "Казань" },
    "DEMO-PARTNER-031": { name: "Елена · дизайн", city: "Санкт-Петербург" },
  };

  const SYSTEM = {
    NEW: "sys_new",
    PAID: "sys_paid",
    SHIPPED: "sys_shipped",
    RETURN: "sys_return",
    REFUSED: "sys_refused",
  };

  /** @typedef {{id:string, label:string}} WorkingStage */

  /** @type {Record<string, {workingStages:WorkingStage[], refusalReasons:string[], archivedStages:WorkingStage[]}>} */
  const partnerSettings = {
    "DEMO-PARTNER-017": {
      workingStages: [
        { id: "ws_measure", label: "Замер" },
        { id: "ws_proposal", label: "Коммерческое предложение" },
      ],
      refusalReasons: ["Цена", "Сроки", "Ассортимент"],
      archivedStages: [],
    },
    "DEMO-PARTNER-022": {
      workingStages: [
        { id: "ws_materials", label: "Подбор материалов" },
        { id: "ws_proposal", label: "Коммерческое предложение" },
      ],
      refusalReasons: ["Цена", "Сроки", "Ассортимент"],
      archivedStages: [],
    },
  };

  /**
   * @typedef {{
   *   id: string,
   *   clientName: string,
   *   certificateId: string,
   *   receivingPartnerId: string,
   *   referrerPartnerId: string,
   *   discountPercent: number,
   *   certValidUntil: string,
   *   interest: string,
   *   clientCity: string,
   *   budgetHint: string,
   *   stageId: string,
   *   refusedReason: string|null,
   *   shippedAt: string|null,
   *   paidAmount: number|null,
   *   paidAt: string|null,
   *   privateNotes: string,
   *   sourceKey: string,
   *   clientContact: string|null,
   *   purchaseId: string|null,
   *   createdAt: string,
   *   history: {at:string, author:string, text:string, reason?:string}[],
   *   updatedAt: string,
   * }} Appeal
   */

  /** @type {Appeal[]} */
  let appeals = [];

  /** @type {Record<string, Omit<Appeal, "id"|"history"|"updatedAt"|"stageId"|"receivingPartnerId"> & {appealId?:string}>} */
  const CERT_TEMPLATES = {
    "DEMO-CERT-2048": {
      clientName: "Олег Петров",
      certificateId: "DEMO-CERT-2048",
      referrerPartnerId: "DEMO-PARTNER-0100",
      discountPercent: 10,
      certValidUntil: "2026-04-15",
      interest: "Гостиная, мягкая мебель",
      clientCity: "Казань",
      budgetHint: "до 450 000 ₽",
      refusedReason: null,
      shippedAt: null,
      paidAmount: null,
      paidAt: null,
      privateNotes: "",
    },
    "DEMO-CERT-1999": {
      clientName: "Анна Смирнова",
      certificateId: "DEMO-CERT-1999",
      referrerPartnerId: "DEMO-PARTNER-008",
      discountPercent: 12,
      certValidUntil: "2026-03-01",
      interest: "Кухня на заказ",
      clientCity: "Казань",
      budgetHint: "до 800 000 ₽",
      refusedReason: null,
      shippedAt: null,
      paidAmount: null,
      paidAt: null,
      privateNotes: "",
      appealId: "DEMO-REQ-1048",
    },
  };

  let activeTab = "incoming";
  let selectedAppealId = null;
  let detailSubTab = "cert";
  let settingsDraft = null;
  let pendingReview = null;
  let pendingRefusalAppealId = null;
  let appealIdSeq = 1100;

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  function sourceLabel(key) {
    return SOURCE_OPTIONS.find((s) => s.key === key)?.label || key;
  }

  function ensureWalletPurchase(appeal) {
    if (!appeal.purchaseId) {
      appeal.purchaseId = `DEMO-PURCHASE-${appeal.id.replace(/\D/g, "").slice(-4) || "0000"}`;
    }
    if (!walletPurchases[appeal.purchaseId]) {
      const amount = appeal.paidAmount != null ? `${appeal.paidAmount.toLocaleString("ru-RU")} ₽` : "сумма в демо не зафиксирована";
      walletPurchases[appeal.purchaseId] = {
        kind: "client_purchase",
        title: "Оплата покупки клиентом",
        appealId: appeal.id,
        amountLabel: amount,
        statusLabel: "Проведена (демо)",
        note: "Это платёж клиента магазину. Не путать с реферальным вознаграждением.",
      };
    }
    return walletPurchases[appeal.purchaseId];
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function todayIsoDate() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  function addDays(iso, days) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  function daysBetween(fromIso, toIso) {
    const a = new Date(fromIso);
    const b = new Date(toIso);
    return Math.max(0, Math.ceil((b - a) / 86400000));
  }

  function systemLabel(stageId) {
    const map = {
      [SYSTEM.NEW]: "Новое обращение",
      [SYSTEM.PAID]: "Оплачено",
      [SYSTEM.SHIPPED]: "Отгружено",
      [SYSTEM.RETURN]: "Возврат",
      [SYSTEM.REFUSED]: "Отказ",
    };
    return map[stageId] || null;
  }

  function getWorkingStage(partnerId, stageId) {
    const settings = partnerSettings[partnerId];
    if (!settings) return null;
    return settings.workingStages.find((s) => s.id === stageId) || null;
  }

  function stageLabel(appeal) {
    if (appeal.stageId === SYSTEM.REFUSED) {
      const reason = appeal.refusedReason ? ` (${appeal.refusedReason})` : "";
      return `Отказ${reason}`;
    }
    const sys = systemLabel(appeal.stageId);
    if (sys) return sys;
    const custom = getWorkingStage(appeal.receivingPartnerId, appeal.stageId);
    return custom ? custom.label : "—";
  }

  function pipelineFor(partnerId) {
    const settings = partnerSettings[partnerId];
    const working = settings ? settings.workingStages.map((s) => s.id) : [];
    return [SYSTEM.NEW, ...working, SYSTEM.PAID, SYSTEM.SHIPPED, SYSTEM.RETURN];
  }

  function nextStageId(appeal) {
    if (appeal.stageId === SYSTEM.REFUSED || appeal.stageId === SYSTEM.RETURN) return null;
    const pipe = pipelineFor(appeal.receivingPartnerId);
    const idx = pipe.indexOf(appeal.stageId);
    if (idx < 0 || idx >= pipe.length - 1) return null;
    return pipe[idx + 1];
  }

  function canRefuseFrom(appeal) {
    const pipe = pipelineFor(appeal.receivingPartnerId);
    const idx = pipe.indexOf(appeal.stageId);
    if (idx < 0) return false;
    const paidIdx = pipe.indexOf(SYSTEM.PAID);
    return idx > 0 && idx < paidIdx;
  }

  function pushHistory(appeal, text, reason) {
    appeal.history.unshift({
      at: new Date().toISOString(),
      author: "Менеджер РемТех",
      text,
      reason: reason || undefined,
    });
    appeal.updatedAt = appeal.history[0].at;
  }

  function seedAppeals() {
    const shippedAt = new Date(2026, 10, 12, 15, 0, 0).toISOString();
    appeals = [
      {
        id: "DEMO-REQ-1048",
        clientName: "Анна Смирнова",
        certificateId: "DEMO-CERT-1999",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: "DEMO-PARTNER-008",
        discountPercent: 12,
        certValidUntil: "2026-03-01",
        interest: "Кухня на заказ",
        clientCity: "Казань",
        budgetHint: "до 800 000 ₽",
        stageId: SYSTEM.NEW,
        refusedReason: null,
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "Перезвонить в пятницу утром.",
        updatedAt: new Date(2026, 10, 11, 10, 0, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 11, 10, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1055",
        clientName: "Игорь Власов",
        certificateId: "DEMO-CERT-3011",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: "DEMO-PARTNER-031",
        discountPercent: 8,
        certValidUntil: "2026-05-20",
        interest: "Шкафы-купе",
        clientCity: "Набережные Челны",
        budgetHint: "до 120 000 ₽",
        stageId: "ws_measure",
        refusedReason: null,
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "",
        updatedAt: new Date(2026, 10, 10, 14, 30, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 10, 14, 30, 0).toISOString(), author: "Менеджер РемТех", text: "Статус: Замер" },
          { at: new Date(2026, 10, 9, 11, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1033",
        clientName: "Дмитрий Зайцев",
        certificateId: "DEMO-CERT-1180",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: "DEMO-PARTNER-0100",
        discountPercent: 15,
        certValidUntil: "2026-02-01",
        interest: "Стол и стулья",
        clientCity: "Казань",
        budgetHint: "до 95 000 ₽",
        stageId: SYSTEM.REFUSED,
        refusedReason: "Цена",
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "",
        updatedAt: new Date(2026, 10, 5, 16, 0, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 5, 16, 0, 0).toISOString(), author: "Менеджер РемТех", text: "Отказ", reason: "Цена" },
          { at: new Date(2026, 10, 4, 9, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1020",
        clientName: "Светлана Крылова",
        certificateId: "DEMO-CERT-1502",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: "DEMO-PARTNER-0100",
        discountPercent: 11,
        certValidUntil: "2026-06-01",
        interest: "Диван и кресло",
        clientCity: "Казань",
        budgetHint: "до 210 000 ₽",
        stageId: SYSTEM.SHIPPED,
        refusedReason: null,
        shippedAt,
        paidAmount: null,
        paidAt: new Date(2026, 10, 8, 12, 0, 0).toISOString(),
        privateNotes: "Доставка курьером, без монтажа.",
        updatedAt: shippedAt,
        history: [
          { at: shippedAt, author: "Менеджер РемТех", text: "Отгружено — начат срок ожидания подтверждения (14 дней, демо)" },
          { at: new Date(2026, 10, 8, 12, 0, 0).toISOString(), author: "Менеджер РемТех", text: "Оплачено" },
          { at: new Date(2026, 10, 1, 10, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1062",
        clientName: "Павел Никитин",
        certificateId: "DEMO-CERT-2044",
        receivingPartnerId: "DEMO-PARTNER-022",
        referrerPartnerId: REFERRER_VIEWER.id,
        discountPercent: 9,
        certValidUntil: "2026-07-10",
        interest: "Офисная мебель",
        clientCity: "Екатеринбург",
        budgetHint: "до 1 200 000 ₽",
        stageId: "ws_materials",
        refusedReason: null,
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "",
        updatedAt: new Date(2026, 10, 9, 9, 20, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 9, 9, 20, 0).toISOString(), author: "Менеджер ФормаПро", text: "Статус: Подбор материалов" },
          { at: new Date(2026, 10, 7, 15, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1015",
        clientName: "Наталья Орлова",
        certificateId: "DEMO-CERT-0920",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: REFERRER_VIEWER.id,
        discountPercent: 7,
        certValidUntil: "2026-01-15",
        interest: "Комод и прикроватные",
        clientCity: "Казань",
        budgetHint: "до 60 000 ₽",
        stageId: SYSTEM.RETURN,
        refusedReason: null,
        shippedAt: new Date(2026, 9, 20, 10, 0, 0).toISOString(),
        paidAmount: null,
        paidAt: new Date(2026, 9, 18, 10, 0, 0).toISOString(),
        privateNotes: "Клиент вернул часть позиций — уточнить у склада.",
        updatedAt: new Date(2026, 10, 3, 11, 0, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 3, 11, 0, 0).toISOString(), author: "Менеджер РемТех", text: "Возврат — ожидание реферального вознаграждения приостановлено (демо)" },
          { at: new Date(2026, 9, 20, 10, 0, 0).toISOString(), author: "Менеджер РемТех", text: "Отгружено" },
          { at: new Date(2026, 9, 1, 9, 0, 0).toISOString(), author: "Система", text: "Создано обращение по сертификату" },
        ],
      },
      {
        id: "DEMO-REQ-1077",
        clientName: "Виктор Рябов",
        certificateId: "",
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: "DEMO-NO-REFERRER",
        discountPercent: 0,
        certValidUntil: "",
        interest: "Уточнить на встрече",
        clientCity: "Казань",
        budgetHint: "не указан",
        stageId: SYSTEM.NEW,
        refusedReason: null,
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "",
        sourceKey: "visit",
        clientContact: "+7 903 000-55-44",
        purchaseId: null,
        createdAt: new Date(2026, 10, 12, 9, 0, 0).toISOString(),
        updatedAt: new Date(2026, 10, 12, 9, 0, 0).toISOString(),
        history: [
          { at: new Date(2026, 10, 12, 9, 0, 0).toISOString(), author: "Менеджер РемТех", text: "Создано вручную без сертификата" },
        ],
      },
    ];
    const meta = {
      "DEMO-REQ-1048": { sourceKey: "scan", clientContact: null, createdAt: new Date(2026, 10, 11, 10, 0, 0).toISOString() },
      "DEMO-REQ-1055": { sourceKey: "scan", clientContact: null, createdAt: new Date(2026, 10, 9, 11, 0, 0).toISOString() },
      "DEMO-REQ-1033": { sourceKey: "phone", clientContact: null, createdAt: new Date(2026, 10, 4, 9, 0, 0).toISOString() },
      "DEMO-REQ-1020": {
        sourceKey: "scan",
        clientContact: null,
        createdAt: new Date(2026, 10, 1, 10, 0, 0).toISOString(),
        purchaseId: "DEMO-PURCHASE-1020",
        paidAmount: 189000,
      },
      "DEMO-REQ-1062": { sourceKey: "scan", clientContact: null, createdAt: new Date(2026, 10, 7, 15, 0, 0).toISOString() },
      "DEMO-REQ-1015": {
        sourceKey: "scan",
        clientContact: null,
        createdAt: new Date(2026, 9, 1, 9, 0, 0).toISOString(),
        purchaseId: "DEMO-PURCHASE-1015",
        paidAmount: 52000,
      },
    };
    appeals.forEach((a) => {
      const m = meta[a.id] || {};
      a.sourceKey = a.sourceKey || m.sourceKey || "scan";
      a.clientContact = a.clientContact ?? m.clientContact ?? null;
      a.purchaseId = a.purchaseId ?? m.purchaseId ?? null;
      a.createdAt = a.createdAt || m.createdAt || a.updatedAt;
      if (m.paidAmount != null) a.paidAmount = m.paidAmount;
      if (a.purchaseId) ensureWalletPurchase(a);
    });
    appeals.find((a) => a.id === "DEMO-REQ-1020")?.history.splice(1, 1, {
      at: new Date(2026, 10, 8, 12, 0, 0).toISOString(),
      author: "Менеджер РемТех",
      text: "Оплачено · создана демо-покупка в кошельке",
    });
  }

  function allStatusOptions() {
    const labels = new Set(["Все статусы"]);
    appeals.forEach((a) => labels.add(stageLabel(a)));
    return Array.from(labels);
  }

  function populateStatusSelects() {
    const options = allStatusOptions();
    ["filter-status-incoming", "filter-status-outgoing"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const prev = el.value;
      el.textContent = "";
      options.forEach((label) => {
        const opt = document.createElement("option");
        opt.value = label;
        opt.textContent = label;
        el.appendChild(opt);
      });
      if (options.includes(prev)) el.value = prev;
    });
  }

  function populateSourceSelects() {
    ["filter-source-incoming", "filter-source-outgoing", "manual-source"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const prev = el.value;
      const options = id === "manual-source" ? SOURCE_OPTIONS.filter((s) => s.key !== "all") : SOURCE_OPTIONS;
      el.textContent = "";
      options.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.key;
        opt.textContent = s.label;
        el.appendChild(opt);
      });
      if (prev && Array.from(el.options).some((o) => o.value === prev)) el.value = prev;
      else if (id === "manual-source") el.value = "manual";
    });
  }

  function populateOutgoingPartnerFilter() {
    const el = document.getElementById("filter-partner-outgoing");
    if (!el) return;
    const prev = el.value;
    const partners = new Map();
    appeals
      .filter((a) => a.referrerPartnerId === REFERRER_VIEWER.id)
      .forEach((a) => {
        partners.set(a.receivingPartnerId, PARTNERS[a.receivingPartnerId]?.name || a.receivingPartnerId);
      });
    el.textContent = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "Все партнёры";
    el.appendChild(all);
    partners.forEach((name, id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      el.appendChild(opt);
    });
    if (prev && Array.from(el.options).some((o) => o.value === prev)) el.value = prev;
  }

  function filterAppeals(mode) {
    const searchId = mode === "incoming" ? "search-incoming" : "search-outgoing";
    const statusId = mode === "incoming" ? "filter-status-incoming" : "filter-status-outgoing";
    const sourceId = mode === "incoming" ? "filter-source-incoming" : "filter-source-outgoing";
    const q = (document.getElementById(searchId)?.value || "").trim().toLowerCase();
    const status = document.getElementById(statusId)?.value || "Все статусы";
    const source = document.getElementById(sourceId)?.value || "all";
    let list = appeals.slice();
    if (mode === "incoming") {
      list = list.filter((a) => a.receivingPartnerId === RECEIVING.id);
    } else {
      list = list.filter((a) => a.referrerPartnerId === REFERRER_VIEWER.id);
      const partner = document.getElementById("filter-partner-outgoing")?.value || "all";
      if (partner !== "all") list = list.filter((a) => a.receivingPartnerId === partner);
    }
  list = list.filter((a) => {
      if (source !== "all" && a.sourceKey !== source) return false;
      if (status !== "Все статусы" && stageLabel(a) !== status) return false;
      if (!q) return true;
      const hay = [a.clientName, a.certificateId, a.id, PARTNERS[a.referrerPartnerId]?.name, PARTNERS[a.receivingPartnerId]?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return list;
  }

  function renderList(mode) {
    const containerId = mode === "incoming" ? "list-incoming" : "list-outgoing";
    const root = document.getElementById(containerId);
    if (!root) return;
    const items = filterAppeals(mode);
    if (!items.length) {
      root.innerHTML = `<p class="cl-empty">Ничего не найдено. Измените фильтр или выполните демо-сканирование.</p>`;
      return;
    }

    const cards = items
      .map((a) => {
        const counterparty =
          mode === "incoming"
            ? `Рекомендовал: ${PARTNERS[a.referrerPartnerId]?.name || a.referrerPartnerId}`
            : `Принимает: ${PARTNERS[a.receivingPartnerId]?.name || a.receivingPartnerId}`;
        return `<button type="button" class="cl-card" data-appeal-id="${esc(a.id)}" data-mode="${esc(mode)}">
          <div class="cl-card-head">
            <h3 class="cl-card-title">${esc(a.clientName)}</h3>
            <span class="cl-badge">${esc(stageLabel(a))}</span>
          </div>
          <p class="cl-meta">${esc(a.id)} · ${esc(a.certificateId || "без сертификата")} · скидка ${esc(a.discountPercent)}%</p>
          <p class="cl-meta">${esc(counterparty)}</p>
          <p class="cl-meta">Источник: ${esc(sourceLabel(a.sourceKey))}</p>
          <p class="cl-meta">Обновлено: ${esc(formatDateTime(a.updatedAt))}</p>
        </button>`;
      })
      .join("");

    const rows = items
      .map((a) => {
        const counterparty =
          mode === "incoming"
            ? PARTNERS[a.referrerPartnerId]?.name || a.referrerPartnerId
            : PARTNERS[a.receivingPartnerId]?.name || a.receivingPartnerId;
        const counterLabel = mode === "incoming" ? "Рекомендовал" : "Принимает";
        return `<tr>
          <td><button type="button" class="cl-row-link" data-appeal-id="${esc(a.id)}" data-mode="${esc(mode)}">${esc(a.clientName)}<br><span class="cl-meta">${esc(a.id)}</span></button></td>
          <td>${esc(counterLabel)}: ${esc(counterparty)}</td>
          <td>${esc(a.certificateId)}<br><span class="cl-meta">−${esc(a.discountPercent)}%</span></td>
          <td><span class="cl-badge">${esc(stageLabel(a))}</span></td>
          <td>${esc(formatDateTime(a.updatedAt))}</td>
        </tr>`;
      })
      .join("");

    root.innerHTML = `
      <div class="cl-cards-only">${cards}</div>
      <div class="cl-table-wrap">
        <table class="cl-table">
          <thead>
            <tr>
              <th>Клиент / обращение</th>
              <th>${mode === "incoming" ? "Рекомендовал" : "Принимает"}</th>
              <th>Сертификат</th>
              <th>Статус</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderActorBadge() {
    const el = document.getElementById("actor-badge");
    const hint = document.getElementById("outgoing-scope-hint");
    if (!el) return;
    if (activeTab === "incoming") {
      el.textContent = INCOMING_ACTOR;
      if (hint) hint.hidden = true;
    } else {
      el.textContent = OUTGOING_ACTOR;
      if (hint) {
        hint.hidden = false;
        hint.textContent = `Только referral от ${REFERRER_VIEWER.name} (${REFERRER_VIEWER.id}). Чужие рекомендации скрыты.`;
      }
    }
  }

  function renderContextLine() {
    const el = document.getElementById("context-line");
    if (!el) return;
    renderActorBadge();
    if (activeTab === "incoming") {
      el.textContent = `Демо-контекст принимающего: ${RECEIVING.name}, ${RECEIVING.city} (${RECEIVING.id})`;
    } else {
      el.textContent = `Демо-контекст отправителя: ${REFERRER_VIEWER.name} · ${REFERRER_VIEWER.id}`;
    }
    renderFunnel();
  }

  function paidPurchaseHtml(appeal, readOnly) {
    const everPaid =
      appeal.stageId === SYSTEM.PAID ||
      appeal.stageId === SYSTEM.SHIPPED ||
      appeal.stageId === SYSTEM.RETURN ||
      appeal.paidAt;
    if (!everPaid || !appeal.purchaseId) return "";
    const purchase = ensureWalletPurchase(appeal);
    const link = readOnly
      ? ""
      : `<button type="button" class="pp-btn" id="detail-wallet" data-purchase="${esc(appeal.purchaseId)}">Покупка в кошельке</button>`;
    return `<div class="cl-paid-row">
      <div><strong>Оплата клиентом</strong> · ${esc(purchase.amountLabel)}</div>
      <div class="cl-meta">ID: ${esc(appeal.purchaseId)} — отдельно от реферального payout</div>
      ${link}
    </div>`;
  }

  function waitBlockHtml(appeal) {
    if (appeal.stageId !== SYSTEM.SHIPPED || !appeal.shippedAt) return "";
    if (appeal.stageId === SYSTEM.RETURN) return "";
    const releaseAt = addDays(appeal.shippedAt, WAIT_DAYS);
    const left = daysBetween(new Date().toISOString(), releaseAt);
    return `<div class="cl-wait-block" role="status">
      <div class="cl-wallet-kind cl-wallet-kind--referral">Реферальное вознаграждение (не покупка)</div>
      <div>Отгрузка: <strong>${esc(formatDate(appeal.shippedAt))}</strong></div>
      <div>Кошелёк · ожидание: <strong>${esc(String(Math.max(left, 0)))}</strong> из ${WAIT_DAYS} календ. дн.</div>
      <div>Плановое снятие ожидания: ${esc(formatDate(releaseAt))}</div>
      <p class="cl-note cl-note--legal">Тот же 14-дневный жизненный цикл, что в демо-кошельке. Без новой машины «подтверждений» и без гарантии выплаты.</p>
    </div>`;
  }

  function renderFunnel() {
    const body = document.getElementById("funnel-body");
    if (!body) return;
    const periodStart = new Date(2026, 9, 1);
    const scoped =
      activeTab === "incoming"
        ? appeals.filter((a) => a.receivingPartnerId === RECEIVING.id)
        : appeals.filter((a) => a.referrerPartnerId === REFERRER_VIEWER.id);
    const inPeriod = scoped.filter((a) => new Date(a.createdAt) >= periodStart);
    const everPaid = inPeriod.filter(
      (a) => a.paidAt || [SYSTEM.PAID, SYSTEM.SHIPPED, SYSTEM.RETURN].includes(a.stageId)
    );
    const everShipped = inPeriod.filter((a) => a.shippedAt || a.stageId === SYSTEM.SHIPPED);
    const returns = inPeriod.filter((a) => a.stageId === SYSTEM.RETURN);
    body.innerHTML = `
      <p class="cl-meta">Период: с 1 октября 2026 (демо). Возвраты считаются отдельно.</p>
      <div class="cl-funnel-row"><span>Создано обращений</span><strong>${esc(String(inPeriod.length))}</strong></div>
      <div class="cl-funnel-row"><span>Когда-либо «Оплачено»</span><strong>${esc(String(everPaid.length))}</strong></div>
      <div class="cl-funnel-row"><span>Когда-либо «Отгружено»</span><strong>${esc(String(everShipped.length))}</strong></div>
      <div class="cl-funnel-row"><span>Возврат (отдельно)</span><strong>${esc(String(returns.length))}</strong></div>`;
  }

  function renderDetail() {
    const body = document.getElementById("detail-body");
    const appeal = appeals.find((a) => a.id === selectedAppealId);
    if (!body || !appeal) return;
    const readOnly = activeTab === "outgoing";
    const referrer =
      appeal.referrerPartnerId === "DEMO-NO-REFERRER"
        ? { name: "Прямой клиент (без referrer)" }
        : PARTNERS[appeal.referrerPartnerId];
    const receiver = PARTNERS[appeal.receivingPartnerId];
    const certId = appeal.certificateId ? appeal.certificateId : "Без сертификата";

    const certTab = `
      <section aria-labelledby="cert-heading">
        <h3 id="cert-heading" class="cl-visually-hidden">Сертификат</h3>
        <div class="cl-cert-block">
          <div class="cl-cert-row"><span class="cl-cert-label">ID обращения</span><p class="cl-readonly-value">${esc(appeal.id)}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">ID сертификата</span><p class="cl-readonly-value">${esc(certId)}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Источник</span><p class="cl-readonly-value">${esc(sourceLabel(appeal.sourceKey))}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Контакт</span><p class="cl-readonly-value">${esc(appeal.clientContact || "—")}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Рекомендовал</span><p class="cl-readonly-value">${esc(referrer?.name || appeal.referrerPartnerId)} · ${esc(appeal.referrerPartnerId)}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Клиент</span><p class="cl-readonly-value">${esc(appeal.clientName)} · ${esc(appeal.clientCity)} · ${esc(appeal.interest)} · ${esc(appeal.budgetHint)}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Скидка</span><p class="cl-readonly-value">${esc(appeal.discountPercent)}%</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Действует до</span><p class="cl-readonly-value">${esc(formatDate(appeal.certValidUntil))}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Принимает</span><p class="cl-readonly-value">${esc(receiver?.name || appeal.receivingPartnerId)}</p></div>
        </div>
      </section>`;

    const timeline = appeal.history
      .map(
        (h) => `<li>
          <time datetime="${esc(h.at)}">${esc(formatDateTime(h.at))} · ${esc(h.author)}</time>
          <p>${esc(h.text)}${h.reason ? ` — ${esc(h.reason)}` : ""}</p>
        </li>`
      )
      .join("");

    let workTab = "";
    if (!readOnly) {
      const next = nextStageId(appeal);
      const nextLabel = next ? (systemLabel(next) || getWorkingStage(appeal.receivingPartnerId, next)?.label) : null;
      const statusOptions = pipelineFor(appeal.receivingPartnerId)
        .filter((id) => id !== appeal.stageId)
        .map((id) => {
          const label = systemLabel(id) || getWorkingStage(appeal.receivingPartnerId, id)?.label || id;
          return `<option value="${esc(id)}">${esc(label)}</option>`;
        })
        .join("");
      const refuseBtn = canRefuseFrom(appeal)
        ? `<button type="button" class="pp-btn" id="detail-refuse">Отказ</button>`
        : "";

      workTab = `
        ${paidPurchaseHtml(appeal, false)}
        ${waitBlockHtml(appeal)}
        <div class="cl-work-actions">
          ${nextLabel ? `<button type="button" class="pp-btn cl-btn-primary" id="detail-next" data-next="${esc(next)}">Следующий шаг: ${esc(nextLabel)}</button>` : ""}
          <div class="cl-status-picker">
            <label class="cl-field-label" for="detail-status-pick">Изменить статус</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
              <select id="detail-status-pick" class="cl-select" style="flex:1;min-width:0">${statusOptions}</select>
              <button type="button" class="pp-btn" id="detail-apply-status">Применить</button>
            </div>
          </div>
          ${refuseBtn}
        </div>
        <span class="cl-private-tag">Служебные заметки · только у принимающего</span>
        <label class="cl-field">
          <span class="cl-visually-hidden">Заметки</span>
          <textarea id="detail-notes" class="cl-textarea" rows="3">${esc(appeal.privateNotes)}</textarea>
        </label>
        <button type="button" class="pp-btn" id="detail-save-notes">Сохранить заметку</button>
        <h3 style="margin:16px 0 8px;font-size:var(--pp-sm)">История</h3>
        <ul class="cl-timeline">${timeline}</ul>`;
    } else {
      const publicHistory = appeal.history
        .filter((h) => !/заметк/i.test(h.text))
        .map(
          (h) => `<li>
          <time datetime="${esc(h.at)}">${esc(formatDateTime(h.at))}</time>
          <p>${esc(h.text)}${h.reason ? ` — ${esc(h.reason)}` : ""}</p>
        </li>`
        )
        .join("");
      workTab = `
        ${paidPurchaseHtml(appeal, true)}
        ${waitBlockHtml(appeal)}
        <p class="cl-readonly-hint">История и служебные заметки принимающего партнёра в этом прототипе скрыты.</p>
        <h3 style="margin:16px 0 8px;font-size:var(--pp-sm)">Публичные этапы</h3>
        <ul class="cl-timeline">${publicHistory}</ul>`;
    }

    body.innerHTML = `
      <div class="cl-detail-head">
        <h2 id="detail-title">${esc(appeal.clientName)}</h2>
        <p class="cl-meta">${esc(appeal.id)} · <span class="cl-badge cl-badge--accent">${esc(stageLabel(appeal))}</span></p>
      </div>
      <div class="cl-subtabs" role="tablist">
        <button type="button" class="cl-subtab" role="tab" id="subtab-cert" aria-selected="${detailSubTab === "cert"}">Сертификат</button>
        <button type="button" class="cl-subtab" role="tab" id="subtab-work" aria-selected="${detailSubTab === "work"}">Работа</button>
      </div>
      <div id="detail-panel-cert" ${detailSubTab === "cert" ? "" : 'hidden'}>${certTab}</div>
      <div id="detail-panel-work" ${detailSubTab === "work" ? "" : 'hidden'}>${workTab}</div>`;

    document.getElementById("subtab-cert")?.addEventListener("click", () => {
      detailSubTab = "cert";
      renderDetail();
    });
    document.getElementById("subtab-work")?.addEventListener("click", () => {
      detailSubTab = "work";
      renderDetail();
    });
    document.getElementById("detail-next")?.addEventListener("click", (e) => {
      const target = /** @type {HTMLButtonElement} */ (e.currentTarget);
      applyStageChange(appeal.id, target.getAttribute("data-next"), false);
    });
    document.getElementById("detail-apply-status")?.addEventListener("click", () => {
      const pick = /** @type {HTMLSelectElement|null} */ (document.getElementById("detail-status-pick"));
      if (!pick?.value) return;
      applyStageChange(appeal.id, pick.value, false);
    });
    document.getElementById("detail-refuse")?.addEventListener("click", () => openRefusalDialog(appeal.id));
    document.getElementById("detail-save-notes")?.addEventListener("click", () => {
      const notes = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("detail-notes"));
      if (!notes) return;
      appeal.privateNotes = notes.value.slice(0, 2000);
      pushHistory(appeal, "Обновлена служебная заметка");
      renderDetail();
    });
    document.getElementById("detail-wallet")?.addEventListener("click", (e) => {
      const id = /** @type {HTMLButtonElement} */ (e.currentTarget).getAttribute("data-purchase");
      if (id) openWalletDialog(id);
    });
  }

  function needsReview(stageId) {
    return stageId === SYSTEM.PAID || stageId === SYSTEM.SHIPPED || stageId === SYSTEM.RETURN;
  }

  function applyStageChange(appealId, stageId, fromRefusal) {
    const appeal = appeals.find((a) => a.id === appealId);
    if (!appeal || !stageId) return;
    if (!fromRefusal && needsReview(stageId)) {
      pendingReview = { appealId, stageId };
      openReviewDialog();
      return;
    }
    commitStageChange(appeal, stageId, fromRefusal ? { reason: appeal.refusedReason } : null);
  }

  function commitStageChange(appeal, stageId, extra) {
    const label = systemLabel(stageId) || getWorkingStage(appeal.receivingPartnerId, stageId)?.label || stageId;
    appeal.stageId = stageId;
    if (stageId === SYSTEM.SHIPPED) {
      appeal.shippedAt = todayIsoDate();
    }
    if (stageId === SYSTEM.PAID) {
      if (extra?.paidAt) appeal.paidAt = extra.paidAt;
      if (extra?.amount != null) appeal.paidAmount = extra.amount;
      ensureWalletPurchase(appeal);
      pushHistory(appeal, `Привязана демо-покупка ${appeal.purchaseId} (кошелёк)`);
    }
    if (stageId === SYSTEM.REFUSED && extra?.reason) {
      appeal.refusedReason = extra.reason;
      pushHistory(appeal, "Отказ", extra.reason);
    } else if (stageId !== SYSTEM.PAID) {
      pushHistory(appeal, `Статус: ${label}`);
    }
    populateStatusSelects();
    renderList("incoming");
    renderList("outgoing");
    renderFunnel();
    if (selectedAppealId === appeal.id) renderDetail();
  }

  function openWalletDialog(purchaseId) {
    const purchase = walletPurchases[purchaseId];
    const body = document.getElementById("wallet-body");
    if (!purchase || !body) return;
    body.innerHTML = `
      <div class="cl-wallet-card">
        <span class="cl-wallet-kind cl-wallet-kind--purchase">${esc(purchase.title)}</span>
        <div>ID: <strong>${esc(purchaseId)}</strong></div>
        <div>Обращение: ${esc(purchase.appealId)}</div>
        <div>Сумма (демо): ${esc(purchase.amountLabel)}</div>
        <div>Статус: ${esc(purchase.statusLabel)}</div>
        <p class="cl-note">${esc(purchase.note)}</p>
        <p class="cl-note cl-note--legal">Реферальный payout по этой сделке живёт отдельной записью и попадает в 14-дневное ожидание только после отгрузки.</p>
      </div>`;
    /** @type {HTMLDialogElement|null} */ (document.getElementById("wallet-dialog"))?.showModal();
  }

  function openManualDialog() {
    const err = document.getElementById("manual-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    /** @type {HTMLInputElement|null} */ (document.getElementById("manual-name"))?.focus();
    /** @type {HTMLDialogElement|null} */ (document.getElementById("manual-dialog"))?.showModal();
  }

  function submitManual(event) {
    event.preventDefault();
    const nameEl = /** @type {HTMLInputElement|null} */ (document.getElementById("manual-name"));
    const contactEl = /** @type {HTMLInputElement|null} */ (document.getElementById("manual-contact"));
    const sourceEl = /** @type {HTMLSelectElement|null} */ (document.getElementById("manual-source"));
    const err = document.getElementById("manual-error");
    const name = nameEl?.value.trim();
    if (!name) {
      if (err) {
        err.hidden = false;
        err.textContent = "Укажите имя клиента.";
      }
      return;
    }
    appealIdSeq += 1;
    const id = `DEMO-REQ-${appealIdSeq}`;
    const now = new Date().toISOString();
    /** @type {Appeal} */
    const created = {
      id,
      clientName: name,
      certificateId: "",
      receivingPartnerId: RECEIVING.id,
      referrerPartnerId: "DEMO-NO-REFERRER",
      discountPercent: 0,
      certValidUntil: "",
      interest: "—",
      clientCity: RECEIVING.city,
      budgetHint: "—",
      stageId: SYSTEM.NEW,
      refusedReason: null,
      shippedAt: null,
      paidAmount: null,
      paidAt: null,
      privateNotes: "",
      sourceKey: sourceEl?.value || "manual",
      clientContact: contactEl?.value.trim() || null,
      purchaseId: null,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, author: "Менеджер РемТех", text: "Создано вручную без сертификата" }],
    };
    appeals.unshift(created);
    populateStatusSelects();
    renderList("incoming");
    renderFunnel();
    /** @type {HTMLDialogElement|null} */ (document.getElementById("manual-dialog"))?.close();
    if (nameEl) nameEl.value = "";
    if (contactEl) contactEl.value = "";
    openDetail(id, "incoming");
  }

  function openDetail(appealId, mode) {
    selectedAppealId = appealId;
    activeTab = mode;
    detailSubTab = "cert";
    const dialog = /** @type {HTMLDialogElement|null} */ (document.getElementById("detail-dialog"));
    if (dialog) {
      renderDetail();
      if (!dialog.open) dialog.showModal();
    }
  }

  function closeDetail() {
    const dialog = /** @type {HTMLDialogElement|null} */ (document.getElementById("detail-dialog"));
    dialog?.close();
    selectedAppealId = null;
  }

  function openScanDialog() {
    const err = document.getElementById("scan-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    /** @type {HTMLDialogElement|null} */ (document.getElementById("scan-dialog"))?.showModal();
  }

  function closeScanDialog() {
    /** @type {HTMLDialogElement|null} */ (document.getElementById("scan-dialog"))?.close();
  }

  function handleScanSubmit(event) {
    event.preventDefault();
    const outcome = /** @type {HTMLInputElement|null} */ (
      document.querySelector('input[name="scan-outcome"]:checked')
    );
    const err = document.getElementById("scan-error");
    if (!outcome || !err) return;
    if (outcome.value === "invalid") {
      err.hidden = false;
      err.textContent = "Сертификат недействителен или срок истёк. Обращение не создано.";
      return;
    }
    if (outcome.value === "repeat") {
      const existing = appeals.find(
        (a) => a.certificateId === "DEMO-CERT-1999" && a.receivingPartnerId === RECEIVING.id
      );
      if (existing) {
        closeScanDialog();
        openDetail(existing.id, "incoming");
        return;
      }
    }
    if (outcome.value === "new") {
      const tpl = CERT_TEMPLATES["DEMO-CERT-2048"];
      const dup = appeals.some(
        (a) => a.certificateId === tpl.certificateId && a.receivingPartnerId === RECEIVING.id
      );
      if (dup) {
        err.hidden = false;
        err.textContent = "Этот сертификат уже привязан к обращению. Выберите «Повторное сканирование».";
        return;
      }
      appealIdSeq += 1;
      const id = `DEMO-REQ-${appealIdSeq}`;
      const now = new Date().toISOString();
      /** @type {Appeal} */
      const created = {
        id,
        clientName: tpl.clientName,
        certificateId: tpl.certificateId,
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: tpl.referrerPartnerId,
        discountPercent: tpl.discountPercent,
        certValidUntil: tpl.certValidUntil,
        interest: tpl.interest,
        clientCity: tpl.clientCity,
        budgetHint: tpl.budgetHint,
        stageId: SYSTEM.NEW,
        refusedReason: null,
        shippedAt: null,
        paidAmount: null,
        paidAt: null,
        privateNotes: "",
        sourceKey: "scan",
        clientContact: null,
        purchaseId: null,
        createdAt: now,
        updatedAt: now,
        history: [{ at: now, author: "Система", text: "Создано обращение по демо-сканированию" }],
      };
      appeals.unshift(created);
      populateStatusSelects();
      renderList("incoming");
      renderList("outgoing");
      closeScanDialog();
      openDetail(id, "incoming");
    }
  }

  function openSettingsDialog() {
    settingsDraft = JSON.parse(JSON.stringify(partnerSettings[RECEIVING.id]));
    renderSettingsBody();
    /** @type {HTMLDialogElement|null} */ (document.getElementById("settings-dialog"))?.showModal();
  }

  function renderSettingsBody() {
    const body = document.getElementById("settings-body");
    if (!body || !settingsDraft) return;
    const systemRows = [
      ["Новое обращение", "Создание по сертификату"],
      ["Оплачено", "Финансовое событие"],
      ["Отгружено", "Финансовое событие · 14 дней ожидания (демо)"],
      ["Возврат", "Финансовое событие"],
      ["Отказ", "С причиной из списка"],
    ]
      .map(
        ([name, hint]) => `<div class="cl-system-row">
        <span>${esc(name)}</span>
        <span class="cl-system-tag">Системный этап · ${esc(hint)}</span>
      </div>`
      )
      .join("");

    const stages = settingsDraft.workingStages
      .map((stage, index) => {
        return `<div class="cl-stage-row" data-stage-index="${index}">
          <input type="text" class="cl-input stage-label" value="${esc(stage.label)}" aria-label="Название этапа ${index + 1}" />
          <button type="button" class="pp-btn stage-up" aria-label="Выше">↑</button>
          <button type="button" class="pp-btn stage-down" aria-label="Ниже">↓</button>
        </div>`;
      })
      .join("");

    const reasons = settingsDraft.refusalReasons
      .map(
        (r, i) =>
          `<div class="cl-stage-row"><input type="text" class="cl-input reason-label" data-reason-index="${i}" value="${esc(r)}" aria-label="Причина отказа ${i + 1}" />
          <button type="button" class="pp-btn reason-remove" data-reason-index="${i}">Удалить</button></div>`
      )
      .join("");

    body.innerHTML = `
      <p class="cl-note">Настройки только для <strong>${esc(RECEIVING.name)}</strong>. Партнёр «ФормаПро» в демо не меняется.</p>
      <p class="cl-note">Свои этапы не меняют скидку по сертификату, финансовые правила и демо-срок 14 дней.</p>
      <section class="cl-settings-section">
        <h3>Системные этапы</h3>
        ${systemRows}
      </section>
      <section class="cl-settings-section">
        <h3>Рабочие этапы (до оплаты)</h3>
        <div id="stage-list">${stages}</div>
        <button type="button" class="pp-btn" id="add-stage">Добавить этап</button>
      </section>
      <section class="cl-settings-section">
        <h3>Причины отказа</h3>
        <div id="reason-list">${reasons}</div>
        <button type="button" class="pp-btn" id="add-reason">Добавить причину</button>
      </section>
      <p id="settings-error" class="cl-form-error" role="alert" hidden></p>`;

    body.querySelector("#add-stage")?.addEventListener("click", () => {
      settingsDraft.workingStages.push({
        id: `ws_custom_${Date.now()}`,
        label: "Например: Подбор материалов",
      });
      renderSettingsBody();
    });
    body.querySelector("#add-reason")?.addEventListener("click", () => {
      settingsDraft.refusalReasons.push("Новая причина");
      renderSettingsBody();
    });
    body.querySelectorAll(".stage-up").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = /** @type {HTMLElement} */ (e.currentTarget).closest(".cl-stage-row");
        const idx = Number(row?.getAttribute("data-stage-index"));
        if (idx > 0) {
          const tmp = settingsDraft.workingStages[idx - 1];
          settingsDraft.workingStages[idx - 1] = settingsDraft.workingStages[idx];
          settingsDraft.workingStages[idx] = tmp;
          renderSettingsBody();
        }
      });
    });
    body.querySelectorAll(".stage-down").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = /** @type {HTMLElement} */ (e.currentTarget).closest(".cl-stage-row");
        const idx = Number(row?.getAttribute("data-stage-index"));
        if (idx >= 0 && idx < settingsDraft.workingStages.length - 1) {
          const tmp = settingsDraft.workingStages[idx + 1];
          settingsDraft.workingStages[idx + 1] = settingsDraft.workingStages[idx];
          settingsDraft.workingStages[idx] = tmp;
          renderSettingsBody();
        }
      });
    });
    body.querySelectorAll(".reason-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(/** @type {HTMLElement} */ (e.currentTarget).getAttribute("data-reason-index"));
        const removed = settingsDraft.refusalReasons.splice(idx, 1)[0];
        if (removed) settingsDraft.archivedStages.push({ id: `arch_${removed}`, label: removed });
        renderSettingsBody();
      });
    });
  }

  function saveSettings(event) {
    event.preventDefault();
    const body = document.getElementById("settings-body");
    if (!body || !settingsDraft) return;
    const stageInputs = body.querySelectorAll(".stage-label");
    const labels = [];
    stageInputs.forEach((input) => {
      const value = /** @type {HTMLInputElement} */ (input).value.trim();
      if (value) labels.push(value);
    });
    const unique = new Set(labels.map((l) => l.toLowerCase()));
    const settingsErr = document.getElementById("settings-error");
    if (labels.length !== stageInputs.length || unique.size !== labels.length) {
      if (settingsErr) {
        settingsErr.hidden = false;
        settingsErr.textContent = "Заполните все этапы без пустых полей и дубликатов.";
      }
      return;
    }
    settingsDraft.workingStages.forEach((stage, i) => {
      const oldLabel = stage.label;
      stage.label = labels[i];
      appeals
        .filter((a) => a.receivingPartnerId === RECEIVING.id && a.stageId === stage.id)
        .forEach((a) => {
          if (!systemLabel(a.stageId)) pushHistory(a, `Этап переименован: ${oldLabel} → ${stage.label}`);
        });
    });
    const reasonInputs = body.querySelectorAll(".reason-label");
    const reasons = [];
    reasonInputs.forEach((input) => {
      const value = /** @type {HTMLInputElement} */ (input).value.trim();
      if (value) reasons.push(value);
    });
    const rUnique = new Set(reasons.map((r) => r.toLowerCase()));
    if (reasons.length !== reasonInputs.length || rUnique.size !== reasons.length) {
      if (settingsErr) {
        settingsErr.hidden = false;
        settingsErr.textContent = "Заполните все причины отказа без пустых полей и дубликатов.";
      }
      return;
    }
    if (settingsErr) settingsErr.hidden = true;
    settingsDraft.refusalReasons = reasons;
    partnerSettings[RECEIVING.id] = settingsDraft;
    settingsDraft = null;
    populateStatusSelects();
    renderList("incoming");
    /** @type {HTMLDialogElement|null} */ (document.getElementById("settings-dialog"))?.close();
  }

  function openRefusalDialog(appealId) {
    pendingRefusalAppealId = appealId;
    const select = document.getElementById("refusal-reason");
    const appeal = appeals.find((a) => a.id === appealId);
    if (!select || !appeal) return;
    select.textContent = "";
    partnerSettings[appeal.receivingPartnerId].refusalReasons.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      select.appendChild(opt);
    });
    /** @type {HTMLDialogElement|null} */ (document.getElementById("refusal-dialog"))?.showModal();
  }

  function submitRefusal(event) {
    event.preventDefault();
    const appeal = appeals.find((a) => a.id === pendingRefusalAppealId);
    const select = /** @type {HTMLSelectElement|null} */ (document.getElementById("refusal-reason"));
    const err = document.getElementById("refusal-error");
    if (!appeal || !select || !err) return;
    if (!select.value.trim()) {
      err.hidden = false;
      err.textContent = "Выберите причину отказа.";
      return;
    }
    err.hidden = true;
    appeal.refusedReason = select.value;
    appeal.stageId = SYSTEM.REFUSED;
    const comment = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("refusal-comment"));
    const note = comment?.value.trim();
    pushHistory(appeal, note ? `Отказ: ${note}` : "Отказ", select.value);
    pendingRefusalAppealId = null;
    populateStatusSelects();
    renderList("incoming");
    renderList("outgoing");
    renderDetail();
    /** @type {HTMLDialogElement|null} */ (document.getElementById("refusal-dialog"))?.close();
  }

  function openReviewDialog() {
    if (!pendingReview) return;
    const body = document.getElementById("review-body");
    const title = document.getElementById("review-title");
    const appeal = appeals.find((a) => a.id === pendingReview.appealId);
    if (!body || !title || !appeal) return;
    const label = systemLabel(pendingReview.stageId) || pendingReview.stageId;
    title.textContent = `Подтверждение: ${label}`;
    let fields = "";
    if (pendingReview.stageId === SYSTEM.PAID) {
      fields = `<label class="cl-field"><span class="cl-field-label">Дата оплаты</span><input type="date" class="cl-input" id="review-date" required /></label>
        <label class="cl-field"><span class="cl-field-label">Сумма (демо, необязательно)</span><input type="number" class="cl-input" id="review-amount" min="0" step="1000" placeholder="Только для иллюстрации" /></label>`;
    } else if (pendingReview.stageId === SYSTEM.SHIPPED) {
      fields = `<p class="cl-note">После отгрузки в демо запускается ${WAIT_DAYS}-дневное ожидание в кошельке для referral (не для покупки).</p>
        <label class="cl-field"><span class="cl-field-label">Дата отгрузки</span><input type="date" class="cl-input" id="review-date" required /></label>`;
    } else if (pendingReview.stageId === SYSTEM.RETURN) {
      fields = `<p class="cl-note">Возврат приостанавливает демо-ожидание начисления. Расчёт удержаний не показан — открытый вопрос спецификации.</p>
        <label class="cl-field"><span class="cl-field-label">Дата возврата</span><input type="date" class="cl-input" id="review-date" required /></label>`;
    }
    body.innerHTML = `${fields}<p class="cl-note cl-note--legal">Демо-форма: реальных платежей и проводок нет.</p>`;
    /** @type {HTMLDialogElement|null} */ (document.getElementById("review-dialog"))?.showModal();
  }

  function submitReview(event) {
    event.preventDefault();
    if (!pendingReview) return;
    const appeal = appeals.find((a) => a.id === pendingReview.appealId);
    const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById("review-date"));
    if (!appeal || !dateInput?.value) return;
    const iso = new Date(dateInput.value + "T12:00:00").toISOString();
    const amountInput = /** @type {HTMLInputElement|null} */ (document.getElementById("review-amount"));
    const extra = { paidAt: iso, amount: amountInput?.value ? Number(amountInput.value) : null };
    if (pendingReview.stageId === SYSTEM.SHIPPED) {
      appeal.shippedAt = iso;
    }
    commitStageChange(appeal, pendingReview.stageId, pendingReview.stageId === SYSTEM.PAID ? extra : null);
    pendingReview = null;
    /** @type {HTMLDialogElement|null} */ (document.getElementById("review-dialog"))?.close();
  }

  function switchTab(tab) {
    activeTab = tab;
    const incoming = document.getElementById("panel-incoming");
    const outgoing = document.getElementById("panel-outgoing");
    const tIn = document.getElementById("tab-incoming");
    const tOut = document.getElementById("tab-outgoing");
    const isIn = tab === "incoming";
    incoming?.classList.toggle("cl-panel--hidden", !isIn);
    outgoing?.classList.toggle("cl-panel--hidden", isIn);
    if (incoming) incoming.hidden = !isIn;
    if (outgoing) outgoing.hidden = isIn;
    tIn?.setAttribute("aria-selected", String(isIn));
    tOut?.setAttribute("aria-selected", String(!isIn));
    renderContextLine();
    renderList(tab);
    renderFunnel();
  }

  function initTheme() {
    const stored = localStorage.getItem("pp-proto-theme");
    const dark = stored === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.textContent = dark ? "Светлая тема" : "Тёмная тема";
      btn.setAttribute("aria-pressed", String(dark));
    }
  }

  function toggleTheme() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pp-proto-theme", next);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.textContent = next === "dark" ? "Светлая тема" : "Тёмная тема";
      btn.setAttribute("aria-pressed", String(next === "dark"));
    }
  }

  function bindGlobal() {
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    document.getElementById("tab-incoming")?.addEventListener("click", () => switchTab("incoming"));
    document.getElementById("tab-outgoing")?.addEventListener("click", () => switchTab("outgoing"));
    ["search-incoming", "search-outgoing"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        renderList(id.includes("incoming") ? "incoming" : "outgoing");
      });
    });
    ["filter-status-incoming", "filter-status-outgoing", "filter-partner-outgoing", "filter-source-incoming", "filter-source-outgoing"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        renderList(id.includes("incoming") ? "incoming" : "outgoing");
      });
    });
    document.getElementById("btn-add-client")?.addEventListener("click", openManualDialog);
    document.getElementById("manual-form")?.addEventListener("submit", submitManual);
    document.getElementById("manual-cancel")?.addEventListener("click", () => {
      /** @type {HTMLDialogElement|null} */ (document.getElementById("manual-dialog"))?.close();
    });
    document.getElementById("manual-close")?.addEventListener("click", () => {
      /** @type {HTMLDialogElement|null} */ (document.getElementById("manual-dialog"))?.close();
    });
    document.getElementById("wallet-done")?.addEventListener("click", () => {
      /** @type {HTMLDialogElement|null} */ (document.getElementById("wallet-dialog"))?.close();
    });
    document.getElementById("wallet-close")?.addEventListener("click", () => {
      /** @type {HTMLDialogElement|null} */ (document.getElementById("wallet-dialog"))?.close();
    });
    document.getElementById("btn-scan")?.addEventListener("click", openScanDialog);
    document.getElementById("btn-settings")?.addEventListener("click", openSettingsDialog);
    document.getElementById("scan-form")?.addEventListener("submit", handleScanSubmit);
    document.getElementById("scan-cancel")?.addEventListener("click", closeScanDialog);
    document.getElementById("scan-close")?.addEventListener("click", closeScanDialog);
    document.getElementById("settings-form")?.addEventListener("submit", saveSettings);
    document.getElementById("settings-cancel")?.addEventListener("click", () => {
      settingsDraft = null;
      /** @type {HTMLDialogElement|null} */ (document.getElementById("settings-dialog"))?.close();
    });
    document.getElementById("settings-close")?.addEventListener("click", () => {
      settingsDraft = null;
      /** @type {HTMLDialogElement|null} */ (document.getElementById("settings-dialog"))?.close();
    });
    document.getElementById("refusal-form")?.addEventListener("submit", submitRefusal);
    document.getElementById("refusal-cancel")?.addEventListener("click", () => {
      /** @type {HTMLDialogElement|null} */ (document.getElementById("refusal-dialog"))?.close();
    });
    document.getElementById("review-form")?.addEventListener("submit", submitReview);
    document.getElementById("review-cancel")?.addEventListener("click", () => {
      pendingReview = null;
      /** @type {HTMLDialogElement|null} */ (document.getElementById("review-dialog"))?.close();
    });
    document.getElementById("detail-back")?.addEventListener("click", closeDetail);
    document.getElementById("detail-close")?.addEventListener("click", closeDetail);

    document.body.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target).closest("[data-appeal-id]");
      if (!target) return;
      openDetail(target.getAttribute("data-appeal-id"), target.getAttribute("data-mode") || "incoming");
    });

    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("cancel", (ev) => {
        ev.preventDefault();
        /** @type {HTMLDialogElement} */ (dialog).close();
      });
      dialog.addEventListener("close", () => {
        const active = document.activeElement;
        if (active && dialog.contains(active)) {
          const trigger =
            dialog.id === "detail-dialog"
              ? document.getElementById("btn-scan")
              : document.getElementById("btn-settings");
          /** @type {HTMLElement|null} */ (trigger)?.focus();
        }
      });
    });
  }

  seedAppeals();
  initTheme();
  populateSourceSelects();
  populateStatusSelects();
  populateOutgoingPartnerFilter();
  renderContextLine();
  renderList("incoming");
  renderList("outgoing");
  bindGlobal();
})();
