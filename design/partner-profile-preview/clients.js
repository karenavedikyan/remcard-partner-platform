(function () {
  "use strict";

  const WAIT_DAYS = 14;
  /** Зеркало prod: src/lib/history-labels.ts ORDER_STATUS_LABELS */
  const ORDER_STATUS_LABELS = {
    CONFIRMED: "Подтверждена",
    COMPLETED: "Завершена",
    RETURNED: "Возврат",
    CANCELLED: "Отменена",
  };
  /** Зеркало prod: src/lib/history-accrual-display.ts (ожидание после отгрузки) */
  const ACCRUAL_WAITING_LABEL = "Ожидает подтверждения";
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

  /** Демо-аккаунт A: принимает. B: направляет. C: другой принимающий. D: чужой направивший. */
  const DEMO_REFERRER_D = { id: "DEMO-PARTNER-008", name: "Андрей Ким" };
  const DEMO_RECEIVER_C = { id: "DEMO-PARTNER-022", name: "ФормаПро" };

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

  function isManualAppeal(appeal) {
    return Boolean(appeal.manualEntry) || (!appeal.certificateId && appeal.sourceKey !== "scan");
  }

  function hasCertificateFlow(appeal) {
    return Boolean(appeal.certificateId) && !isManualAppeal(appeal);
  }

  function canAccrueReferral(appeal) {
    return hasCertificateFlow(appeal) && Boolean(appeal.referrerPartnerId && PARTNERS[appeal.referrerPartnerId]);
  }

  function sourceDisplay(appeal) {
    if (isManualAppeal(appeal)) return "Добавлен вручную";
    return sourceLabel(appeal.sourceKey);
  }

  function certListLine(appeal) {
    if (isManualAppeal(appeal)) return "Без сертификата";
    return `${appeal.certificateId} · скидка ${appeal.discountPercent}%`;
  }

  function counterpartyLine(appeal, mode) {
    if (isManualAppeal(appeal) && mode === "incoming") return "Добавлен вручную";
    if (mode === "incoming") {
      const name = PARTNERS[appeal.referrerPartnerId]?.name;
      return name ? `Направил: ${name}` : "—";
    }
    return `Принимает: ${PARTNERS[appeal.receivingPartnerId]?.name || "—"}`;
  }

  function formatAgeSince(iso) {
    const days = daysBetween(iso, new Date().toISOString());
    if (days <= 0) return "создано сегодня";
    if (days === 1) return "1 день с создания";
    if (days < 5) return `${days} дня с создания`;
    return `${days} дн. с создания`;
  }

  function safePct(part, whole) {
    if (!whole || whole <= 0 || part < 0) return "—";
    return `${Math.round((part / whole) * 100)}%`;
  }

  function appealHasPaidPurchase(appeal) {
    return Boolean(appeal.purchaseId || appeal.paidAt);
  }

  function isFinancialStage(stageId) {
    return stageId === SYSTEM.PAID || stageId === SYSTEM.SHIPPED || stageId === SYSTEM.RETURN;
  }

  function canTransitionTo(appeal, stageId) {
    if (!isFinancialStage(stageId)) return { ok: true };
    if (stageId === SYSTEM.PAID) return { ok: true };
    if (stageId === SYSTEM.SHIPPED) {
      if (!appealHasPaidPurchase(appeal)) {
        return { ok: false, msg: "Сначала зафиксируйте оплату — покупка в кошельке." };
      }
      return { ok: true };
    }
    if (stageId === SYSTEM.RETURN) {
      if (!appeal.shippedAt) {
        return { ok: false, msg: "Сначала зафиксируйте отгрузку." };
      }
      return { ok: true };
    }
    return { ok: true };
  }

  function dateOnlyMs(iso) {
    const d = new Date(iso);
    d.setHours(12, 0, 0, 0);
    return d.getTime();
  }

  function ensureWalletPurchase(appeal) {
    if (appeal.purchaseId && walletPurchases[appeal.purchaseId]) {
      return walletPurchases[appeal.purchaseId];
    }
    if (!appeal.purchaseId) {
      appeal.purchaseId = `DEMO-PURCHASE-${appeal.id.replace(/\D/g, "").slice(-4) || "0000"}`;
    }
    if (walletPurchases[appeal.purchaseId]) {
      return walletPurchases[appeal.purchaseId];
    }
    const amount =
      appeal.paidAmount != null
        ? `${appeal.paidAmount.toLocaleString("ru-RU")} ₽`
        : "сумма в демо не зафиксирована";
    walletPurchases[appeal.purchaseId] = {
      appealId: appeal.id,
      certificateId: appeal.certificateId || "—",
      referrerName: appeal.referrerPartnerId ? PARTNERS[appeal.referrerPartnerId]?.name || null : null,
      orderStatusKey: "CONFIRMED",
      orderStatusLabel: ORDER_STATUS_LABELS.CONFIRMED,
      paidSummary: `Оплачено ${amount}`,
      amountLabel: amount,
      accrualStatusLabel: null,
      accrualNote: null,
      nextConfirmationAt: null,
      waitDaysLeft: null,
    };
    return walletPurchases[appeal.purchaseId];
  }

  /** Синхронизация демо-покупки с этапом обращения — без отдельной финансовой машины. */
  function syncWalletFromAppeal(appeal) {
    if (!appealHasPaidPurchase(appeal)) return null;
    const wallet = ensureWalletPurchase(appeal);
    if (appeal.stageId === SYSTEM.RETURN) {
      wallet.orderStatusKey = "RETURNED";
      wallet.orderStatusLabel = ORDER_STATUS_LABELS.RETURNED;
      wallet.accrualStatusLabel = "Приостановлено";
      wallet.accrualNote = "Приостановленная сумма начисления, не сумма покупки.";
      wallet.nextConfirmationAt = null;
      wallet.waitDaysLeft = null;
      return wallet;
    }
    if (appeal.stageId === SYSTEM.SHIPPED && appeal.shippedAt) {
      wallet.orderStatusKey = "COMPLETED";
      wallet.orderStatusLabel = ORDER_STATUS_LABELS.COMPLETED;
      if (canAccrueReferral(appeal)) {
        wallet.accrualStatusLabel = ACCRUAL_WAITING_LABEL;
        wallet.accrualNote = "Сумма ожидает подтверждения.";
        wallet.nextConfirmationAt = addDays(appeal.shippedAt, WAIT_DAYS);
        wallet.waitDaysLeft = daysBetween(new Date().toISOString(), wallet.nextConfirmationAt);
      } else {
        wallet.accrualStatusLabel = null;
        wallet.accrualNote = null;
        wallet.nextConfirmationAt = null;
        wallet.waitDaysLeft = null;
      }
      return wallet;
    }
    if (appeal.paidAt || appeal.stageId === SYSTEM.PAID || appeal.stageId === SYSTEM.SHIPPED) {
      wallet.orderStatusKey = "CONFIRMED";
      wallet.orderStatusLabel = ORDER_STATUS_LABELS.CONFIRMED;
      if (appeal.stageId !== SYSTEM.SHIPPED) {
        wallet.accrualStatusLabel = null;
        wallet.accrualNote = null;
        wallet.nextConfirmationAt = null;
        wallet.waitDaysLeft = null;
      }
    }
    return wallet;
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

  function isActiveAppeal(appeal) {
    return appeal.stageId !== SYSTEM.REFUSED && appeal.stageId !== SYSTEM.RETURN;
  }

  function findActiveAppeal(certificateId, receivingPartnerId) {
    return appeals.find(
      (a) =>
        a.certificateId === certificateId &&
        a.receivingPartnerId === receivingPartnerId &&
        isActiveAppeal(a)
    );
  }

  function canRefuseFrom(appeal) {
    if (appealHasPaidPurchase(appeal)) return false;
    const pipe = pipelineFor(appeal.receivingPartnerId);
    const idx = pipe.indexOf(appeal.stageId);
    if (idx < 0 && appeal.stageId === SYSTEM.NEW) return true;
    const paidIdx = pipe.indexOf(SYSTEM.PAID);
    return idx >= 0 && idx < paidIdx;
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
        certificateId: null,
        receivingPartnerId: RECEIVING.id,
        referrerPartnerId: null,
        manualEntry: true,
        discountPercent: null,
        certValidUntil: null,
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
    });
    appeals.forEach((a) => syncWalletFromAppeal(a));
    appeals.find((a) => a.id === "DEMO-REQ-1020")?.history.splice(1, 1, {
      at: new Date(2026, 10, 8, 12, 0, 0).toISOString(),
      author: "Менеджер РемТех",
      text: "Оплачено · покупка в кошельке (CONFIRMED)",
    });
    const shipped = appeals.find((a) => a.id === "DEMO-REQ-1020");
    if (shipped?.history[0]) {
      shipped.history[0].text = "Отгружено · в кошельке начисление: Ожидает подтверждения (14 дн.)";
    }
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
      const options =
        id === "manual-source"
          ? SOURCE_OPTIONS.filter((s) => s.key !== "all" && s.key !== "scan")
          : SOURCE_OPTIONS;
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
        return `<button type="button" class="cl-card" data-appeal-id="${esc(a.id)}" data-mode="${esc(mode)}">
          <div class="cl-card-head">
            <h3 class="cl-card-title">${esc(a.clientName)}</h3>
            <span class="cl-badge">${esc(stageLabel(a))}</span>
          </div>
          <p class="cl-meta">${esc(a.id)} · ${esc(certListLine(a))}</p>
          <p class="cl-meta">${esc(counterpartyLine(a, mode))}</p>
          <p class="cl-meta">${esc(sourceDisplay(a))}</p>
          ${
            a.purchaseId
              ? `<p class="cl-meta"><button type="button" class="pp-btn pp-btn--quiet cl-wallet-inline" data-wallet-purchase="${esc(a.purchaseId)}">Покупка в кошельке</button></p>`
              : ""
          }
          <p class="cl-meta">Создано: ${esc(formatDateTime(a.createdAt))} · ${esc(formatAgeSince(a.createdAt))}</p>
          <p class="cl-meta">Обновлено: ${esc(formatDateTime(a.updatedAt))}</p>
        </button>`;
      })
      .join("");

    const rows = items
      .map((a) => {
        const certCell = isManualAppeal(a)
          ? "Без сертификата"
          : `${a.certificateId}<br><span class="cl-meta">−${esc(a.discountPercent)}%</span>`;
        return `<tr>
          <td><button type="button" class="cl-row-link" data-appeal-id="${esc(a.id)}" data-mode="${esc(mode)}">${esc(a.clientName)}<br><span class="cl-meta">${esc(a.id)} · ${esc(formatAgeSince(a.createdAt))}</span></button></td>
          <td>${esc(counterpartyLine(a, mode))}</td>
          <td>${certCell}</td>
          <td><span class="cl-badge">${esc(stageLabel(a))}</span></td>
          <td>${esc(formatDateTime(a.createdAt))}<br><span class="cl-meta">обн. ${esc(formatDateTime(a.updatedAt))}</span></td>
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
              <th>Создано / обновлено</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderContextLine() {
    const el = document.getElementById("context-line");
    const badge = document.getElementById("actor-badge");
    const inNote = document.getElementById("scope-incoming-note");
    const outHint = document.getElementById("outgoing-scope-hint");
    if (!el) return;
    if (activeTab === "incoming") {
      el.textContent = `Демонстрация: принимающий партнёр ${RECEIVING.name} (${RECEIVING.id}), ${RECEIVING.city}`;
      if (badge) {
        badge.textContent = "Это не аккаунт направившего партнёра — вкладка «Отправил клиентов» покажет другой демо-актор.";
      }
      if (inNote) {
        inNote.hidden = false;
        inNote.textContent = `Видны только обращения у партнёра A (${RECEIVING.id}), в том числе от направившего D (${DEMO_REFERRER_D.name}). Обращения B→C (${DEMO_RECEIVER_C.name}) здесь не показываются. Настройки статусов — только для A; партнёр C не затрагивается.`;
      }
      if (outHint) outHint.hidden = true;
    } else {
      el.textContent = `Демонстрация: направивший партнёр ${REFERRER_VIEWER.name} (${REFERRER_VIEWER.id})`;
      if (badge) {
        badge.textContent = "Это не аккаунт принимающего магазина — нельзя смотреть чужие referral, как свои исходящие.";
      }
      if (inNote) inNote.hidden = true;
      if (outHint) {
        outHint.hidden = false;
        outHint.textContent = `Только направления партнёра B: к A (${RECEIVING.name}) и к C (${DEMO_RECEIVER_C.name}). Направления D (${DEMO_REFERRER_D.name}) к A скрыты — их видит только вкладка принимающего A. Один объект обращения в памяти: смена статуса на A синхронно отражается у B. В продукте — один текущий аккаунт, без смены перспективы.`;
      }
    }
    renderFunnel();
  }

  function paidPurchaseHtml(appeal) {
    syncWalletFromAppeal(appeal);
    if (!appeal.purchaseId) return "";
    const purchase = walletPurchases[appeal.purchaseId];
    if (!purchase) return "";
    return `<div class="cl-paid-row">
      <div class="cl-meta">Обращение ${esc(appeal.id)} · покупка ${esc(appeal.purchaseId)}</div>
      <div><strong>Покупка в кошельке:</strong> ${esc(purchase.orderStatusLabel)} · ${esc(purchase.paidSummary)}</div>
      <button type="button" class="pp-btn" id="detail-wallet" data-purchase="${esc(appeal.purchaseId)}">Покупка в кошельке</button>
      <p class="cl-meta">Этап обращения «Оплачено» — операционный; финансовый статус только в покупке.</p>
    </div>`;
  }

  function waitBlockHtml(appeal) {
    if (!canAccrueReferral(appeal)) return "";
    const wallet = syncWalletFromAppeal(appeal);
    if (!wallet?.accrualStatusLabel || appeal.stageId !== SYSTEM.SHIPPED) return "";
    const left = wallet.waitDaysLeft != null ? Math.max(0, wallet.waitDaysLeft) : 0;
    return `<div class="cl-wait-block" role="status">
      <div class="cl-wallet-kind cl-wallet-kind--referral">Начисление по покупке (кошелёк)</div>
      <div>Статус начисления: <strong>${esc(wallet.accrualStatusLabel)}</strong></div>
      <div>${esc(wallet.accrualNote || "")}${left > 0 ? ` Осталось ${esc(String(left))} из ${WAIT_DAYS} календ. дн.` : ""}</div>
      ${
        wallet.nextConfirmationAt
          ? `<div class="cl-meta">Окончание ожидания (демо): ${esc(formatDate(wallet.nextConfirmationAt))}</div>`
          : ""
      }
      <button type="button" class="pp-btn" data-purchase="${esc(appeal.purchaseId)}" id="detail-wallet-wait">Открыть покупку в кошельке</button>
      <p class="cl-note cl-note--legal">Те же правила, что в существующем кошельке/истории (ожидание начисления). Без отдельной кнопки или этапа подтверждения в этом прототипе.</p>
    </div>`;
  }

  function renderFunnel() {
    const body = document.getElementById("funnel-body");
    if (!body) return;
    const fromVal = /** @type {HTMLInputElement|null} */ (document.getElementById("funnel-from"))?.value;
    const toVal = /** @type {HTMLInputElement|null} */ (document.getElementById("funnel-to"))?.value;
    const periodStart = fromVal ? new Date(`${fromVal}T00:00:00`) : new Date(2026, 9, 1);
    const periodEnd = toVal ? new Date(`${toVal}T23:59:59`) : new Date();
    const sourceKey =
      activeTab === "incoming"
        ? document.getElementById("filter-source-incoming")?.value || "all"
        : document.getElementById("filter-source-outgoing")?.value || "all";
    let scoped =
      activeTab === "incoming"
        ? appeals.filter((a) => a.receivingPartnerId === RECEIVING.id)
        : appeals.filter((a) => a.referrerPartnerId === REFERRER_VIEWER.id);
    if (activeTab === "outgoing") {
      const partner = document.getElementById("filter-partner-outgoing")?.value || "all";
      if (partner !== "all") scoped = scoped.filter((a) => a.receivingPartnerId === partner);
    }
    if (sourceKey !== "all") scoped = scoped.filter((a) => a.sourceKey === sourceKey);
    const inPeriod = scoped.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= periodStart.getTime() && t <= periodEnd.getTime();
    });
    const everPaid = inPeriod.filter((a) => appealHasPaidPurchase(a));
    const everShipped = inPeriod.filter((a) => a.shippedAt || a.stageId === SYSTEM.SHIPPED);
    const returns = inPeriod.filter((a) => a.stageId === SYSTEM.RETURN);
    const byReferrer = new Map();
    if (activeTab === "incoming") {
      inPeriod.forEach((a) => {
        const key = isManualAppeal(a) ? "Добавлен вручную" : PARTNERS[a.referrerPartnerId]?.name || "—";
        const row = byReferrer.get(key) || { created: 0, paid: 0 };
        row.created += 1;
        if (appealHasPaidPurchase(a)) row.paid += 1;
        byReferrer.set(key, row);
      });
    }
    const refRows = Array.from(byReferrer.entries())
      .map(
        ([name, row]) =>
          `<div class="cl-funnel-row"><span>${esc(name)}</span><strong>${esc(String(row.created))} · оплата ${esc(safePct(row.paid, row.created))}</strong></div>`
      )
      .join("");
    body.innerHTML = `
      <p class="cl-meta">Когорта: уникальные обращения, созданные в выбранном периоде (фильтры списка учтены).</p>
      <div class="cl-funnel-row"><span>Создано</span><strong>${esc(String(inPeriod.length))}</strong></div>
      <div class="cl-funnel-row"><span>Когда-либо «Оплачено»</span><strong>${esc(String(everPaid.length))} · ${esc(safePct(everPaid.length, inPeriod.length))}</strong></div>
      <div class="cl-funnel-row"><span>Когда-либо «Отгружено»</span><strong>${esc(String(everShipped.length))} · ${esc(safePct(everShipped.length, inPeriod.length))}</strong></div>
      <div class="cl-funnel-row"><span>Возврат (отдельно)</span><strong>${esc(String(returns.length))}</strong></div>
      ${activeTab === "incoming" && refRows ? `<p class="cl-meta" style="margin-top:8px">По направившему (в периоде)</p>${refRows}` : ""}`;
  }

  function renderDetail() {
    const body = document.getElementById("detail-body");
    const appeal = appeals.find((a) => a.id === selectedAppealId);
    if (!body || !appeal) return;
    const readOnly = activeTab === "outgoing";
    const receiver = PARTNERS[appeal.receivingPartnerId];
    const manual = isManualAppeal(appeal);
    const certExtra = manual
      ? `
          <div class="cl-cert-row"><span class="cl-cert-label">Сертификат</span><p class="cl-readonly-value">Без сертификата</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Вход</span><p class="cl-readonly-value">Добавлен вручную</p></div>`
      : `
          <div class="cl-cert-row"><span class="cl-cert-label">ID сертификата</span><p class="cl-readonly-value">${esc(appeal.certificateId)}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Направил</span><p class="cl-readonly-value">${esc(PARTNERS[appeal.referrerPartnerId]?.name || "—")}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Скидка</span><p class="cl-readonly-value">${esc(appeal.discountPercent)}%</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Действует до</span><p class="cl-readonly-value">${esc(formatDate(appeal.certValidUntil))}</p></div>`;

    const certTab = `
      <section aria-labelledby="cert-heading">
        <h3 id="cert-heading" class="cl-visually-hidden">Сертификат</h3>
        <div class="cl-cert-block">
          <div class="cl-cert-row"><span class="cl-cert-label">ID обращения</span><p class="cl-readonly-value">${esc(appeal.id)}</p></div>
          ${certExtra}
          <div class="cl-cert-row"><span class="cl-cert-label">Источник</span><p class="cl-readonly-value">${esc(sourceDisplay(appeal))}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Контакт</span><p class="cl-readonly-value">${esc(appeal.clientContact || "—")}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Клиент</span><p class="cl-readonly-value">${esc(appeal.clientName)} · ${esc(appeal.clientCity)}</p></div>
          ${manual || appeal.interest ? `<div class="cl-cert-row"><span class="cl-cert-label">Запрос</span><p class="cl-readonly-value">${esc(appeal.interest || "—")}</p></div>` : ""}
          ${manual ? "" : `<div class="cl-cert-row"><span class="cl-cert-label">Бюджет (демо)</span><p class="cl-readonly-value">${esc(appeal.budgetHint)}</p></div>`}
          <div class="cl-cert-row"><span class="cl-cert-label">Создано</span><p class="cl-readonly-value">${esc(formatDateTime(appeal.createdAt))} · ${esc(formatAgeSince(appeal.createdAt))}</p></div>
          <div class="cl-cert-row"><span class="cl-cert-label">Принимает</span><p class="cl-readonly-value">${esc(receiver?.name || "—")}</p></div>
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
        .filter((id) => id !== appeal.stageId && canTransitionTo(appeal, id).ok)
        .map((id) => {
          const label = systemLabel(id) || getWorkingStage(appeal.receivingPartnerId, id)?.label || id;
          return `<option value="${esc(id)}">${esc(label)}</option>`;
        })
        .join("");
      const refuseBtn = canRefuseFrom(appeal)
        ? `<button type="button" class="pp-btn" id="detail-refuse">Отказ</button>`
        : "";

      workTab = `
        ${paidPurchaseHtml(appeal)}
        ${waitBlockHtml(appeal)}
        <p id="detail-work-guard" class="cl-form-error" role="alert" hidden></p>
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
        ${paidPurchaseHtml(appeal)}
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
    const openFromBtn = (e) => {
      const id = /** @type {HTMLButtonElement} */ (e.currentTarget).getAttribute("data-purchase");
      if (id) openWalletDialog(id);
    };
    document.getElementById("detail-wallet")?.addEventListener("click", openFromBtn);
    document.getElementById("detail-wallet-wait")?.addEventListener("click", openFromBtn);
  }

  function needsReview(stageId) {
    return stageId === SYSTEM.PAID || stageId === SYSTEM.SHIPPED || stageId === SYSTEM.RETURN;
  }

  function applyStageChange(appealId, stageId, fromRefusal) {
    const appeal = appeals.find((a) => a.id === appealId);
    if (!appeal || !stageId) return;
    const guard = canTransitionTo(appeal, stageId);
    if (!guard.ok) {
      const work = document.getElementById("detail-work-guard");
      if (work) {
        work.hidden = false;
        work.textContent = guard.msg;
      }
      return;
    }
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
      if (extra?.shippedAt) appeal.shippedAt = extra.shippedAt;
      else if (!appeal.shippedAt) appeal.shippedAt = todayIsoDate();
    }
  if (stageId === SYSTEM.RETURN && extra?.returnedAt) {
      appeal.returnedAt = extra.returnedAt;
    }
    const walletExisted = Boolean(appeal.purchaseId);
    if (stageId === SYSTEM.PAID) {
      if (!appeal.paidAt && extra?.paidAt) appeal.paidAt = extra.paidAt;
      if (appeal.paidAmount == null && extra?.amount != null) appeal.paidAmount = extra.amount;
      if (!walletExisted) {
        ensureWalletPurchase(appeal);
        pushHistory(appeal, `Оплачено · создана покупка ${appeal.purchaseId} в кошельке`);
      } else if (!extra?.skipPaidHistory) {
        pushHistory(appeal, `Статус обращения: ${label} (покупка ${appeal.purchaseId} без изменений)`);
      }
    }
    syncWalletFromAppeal(appeal);
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
    const accrualBlock = purchase.accrualStatusLabel
      ? `<div>
        <div class="cl-wallet-kind cl-wallet-kind--referral">Начисление (не сумма покупки)</div>
        <div>Статус: <strong>${esc(purchase.accrualStatusLabel)}</strong></div>
        <div>${esc(purchase.accrualNote || "")}</div>
        ${
          purchase.nextConfirmationAt
            ? `<div class="cl-meta">Окончание ${WAIT_DAYS}-дн. ожидания: ${esc(formatDate(purchase.nextConfirmationAt))}</div>`
            : ""
        }
      </div>`
      : `<p class="cl-meta">Начисление появится после отгрузки в существующем жизненном цикле кошелька.</p>`;
    body.innerHTML = `
      <div class="cl-wallet-card">
        <span class="cl-wallet-kind cl-wallet-kind--purchase">Покупка · Принято у меня (read-only)</span>
        <div>ID покупки: <strong>${esc(purchaseId)}</strong></div>
        <div>ID обращения: ${esc(purchase.appealId)}</div>
        <div>ID сертификата: ${esc(purchase.certificateId)}</div>
        ${
          purchase.referrerName
            ? `<div>Направил: ${esc(purchase.referrerName)}</div>`
            : ""
        }
        <div>Статус покупки: <strong>${esc(purchase.orderStatusLabel)}</strong></div>
        <div>${esc(purchase.paidSummary)}</div>
        ${accrualBlock}
        <p class="cl-note cl-note--legal">Демо-зеркало меток из репозитория: ORDER_STATUS_LABELS и «${esc(ACCRUAL_WAITING_LABEL)}» (history-labels / history-accrual-display). Без API и без прод-сайта.</p>
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
    const interestEl = /** @type {HTMLInputElement|null} */ (document.getElementById("manual-interest"));
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
      certificateId: null,
      receivingPartnerId: RECEIVING.id,
      referrerPartnerId: null,
      manualEntry: true,
      discountPercent: 0,
      certValidUntil: "",
      interest: interestEl?.value.trim() || "—",
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
      const existing = findActiveAppeal("DEMO-CERT-1999", RECEIVING.id);
      if (existing) {
        closeScanDialog();
        openDetail(existing.id, "incoming");
        return;
      }
      err.hidden = false;
      err.textContent = "Нет активного обращения по этому сертификату у партнёра A (демо).";
      return;
    }
    if (outcome.value === "new") {
      const tpl = CERT_TEMPLATES["DEMO-CERT-2048"];
      const dup = findActiveAppeal(tpl.certificateId, RECEIVING.id);
      if (dup) {
        err.hidden = false;
        err.textContent =
          "У партнёра A уже есть активное обращение по этому сертификату. Повторная покупка после закрытой сделки в спецификации не решена — демо не обещает «один сертификат = одно обращение навсегда».";
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
          <button type="button" class="pp-btn stage-archive" data-stage-index="${index}">В архив</button>
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
      ${
        settingsDraft.archivedStages?.length
          ? `<section class="cl-settings-section"><h3>Архив этапов (история сохраняется)</h3><ul class="cl-meta">${settingsDraft.archivedStages.map((s) => `<li>${esc(s.label)}</li>`).join("")}</ul></section>`
          : ""
      }
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
        if (removed) settingsDraft.archivedStages.push({ id: `arch_reason_${removed}`, label: `Причина: ${removed}` });
        renderSettingsBody();
      });
    });
    body.querySelectorAll(".stage-archive").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(/** @type {HTMLElement} */ (e.currentTarget).getAttribute("data-stage-index"));
        const removed = settingsDraft.workingStages.splice(idx, 1)[0];
        if (removed) settingsDraft.archivedStages.push(removed);
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
    const reviewErr = document.getElementById("review-error");
    const appeal = appeals.find((a) => a.id === pendingReview.appealId);
    if (!body || !title || !appeal) return;
    if (reviewErr) {
      reviewErr.hidden = true;
      reviewErr.textContent = "";
    }
    const label = systemLabel(pendingReview.stageId) || pendingReview.stageId;
    title.textContent = `Подтверждение: ${label}`;
    let fields = "";
    if (pendingReview.stageId === SYSTEM.PAID) {
      fields = `<label class="cl-field"><span class="cl-field-label">Дата оплаты</span><input type="date" class="cl-input" id="review-date" required /></label>
        <label class="cl-field"><span class="cl-field-label">Сумма (демо, необязательно)</span><input type="number" class="cl-input" id="review-amount" min="0" step="1000" placeholder="Только для иллюстрации" /></label>`;
    } else if (pendingReview.stageId === SYSTEM.SHIPPED) {
      fields = `<p class="cl-note">После отгрузки в демо — ожидание начисления в кошельке (${WAIT_DAYS} дн.), если есть направивший по сертификату.</p>
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
    const reviewErr = document.getElementById("review-error");
    const amountInput = /** @type {HTMLInputElement|null} */ (document.getElementById("review-amount"));
    if (!appeal || !dateInput?.value) {
      if (reviewErr) {
        reviewErr.hidden = false;
        reviewErr.textContent = "Укажите дату.";
      }
      return;
    }
    const iso = new Date(dateInput.value + "T12:00:00").toISOString();
    const createdMs = dateOnlyMs(appeal.createdAt);
    const eventMs = dateOnlyMs(iso);
    if (eventMs < createdMs) {
      if (reviewErr) {
        reviewErr.hidden = false;
        reviewErr.textContent = "Дата не может быть раньше создания обращения.";
      }
      return;
    }
    let amount = null;
    if (amountInput?.value.trim()) {
      amount = Number(amountInput.value);
      if (!Number.isFinite(amount) || amount < 0) {
        if (reviewErr) {
          reviewErr.hidden = false;
          reviewErr.textContent = "Сумма должна быть неотрицательным числом.";
        }
        return;
      }
    }
    if (pendingReview.stageId === SYSTEM.SHIPPED && appeal.paidAt && eventMs < dateOnlyMs(appeal.paidAt)) {
      if (reviewErr) {
        reviewErr.hidden = false;
        reviewErr.textContent = "Дата отгрузки не может быть раньше оплаты.";
      }
      return;
    }
    if (pendingReview.stageId === SYSTEM.RETURN && appeal.shippedAt && eventMs < dateOnlyMs(appeal.shippedAt)) {
      if (reviewErr) {
        reviewErr.hidden = false;
        reviewErr.textContent = "Дата возврата не может быть раньше отгрузки.";
      }
      return;
    }
    if (reviewErr) reviewErr.hidden = true;
    const stage = pendingReview.stageId;
    let extra = null;
    if (stage === SYSTEM.PAID) extra = { paidAt: iso, amount };
    else if (stage === SYSTEM.SHIPPED) extra = { shippedAt: iso };
    else if (stage === SYSTEM.RETURN) extra = { returnedAt: iso };
    commitStageChange(appeal, stage, extra);
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
    renderList("incoming");
    renderList("outgoing");
    renderFunnel();
    if (selectedAppealId) renderDetail();
  }

  let themeMemory = null;

  function readStoredTheme() {
    try {
      const v = localStorage.getItem("pp-proto-theme");
      if (v) themeMemory = v;
      return v ?? themeMemory;
    } catch {
      return themeMemory;
    }
  }

  function writeStoredTheme(value) {
    themeMemory = value;
    try {
      localStorage.setItem("pp-proto-theme", value);
    } catch {
      /* opaque preview frame */
    }
  }

  function initTheme() {
    const stored = readStoredTheme();
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
    writeStoredTheme(next);
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
      const walletBtn = /** @type {HTMLElement} */ (e.target).closest("[data-wallet-purchase]");
      if (walletBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pid = walletBtn.getAttribute("data-wallet-purchase");
        if (pid) openWalletDialog(pid);
        return;
      }
      const target = /** @type {HTMLElement} */ (e.target).closest("[data-appeal-id]");
      if (!target) return;
      openDetail(target.getAttribute("data-appeal-id"), target.getAttribute("data-mode") || "incoming");
    });
    ["funnel-from", "funnel-to"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", renderFunnel);
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
