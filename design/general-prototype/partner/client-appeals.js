/* Клиенты и обращения в кабинете партнёра. Демо, in-memory. Без диалогов — только страницы. */
import { emptyDatasetOn } from "./empty-states.js?v=es2";


  const WAIT_DAYS = 14;
  /**
   * Упрощённое зеркало prod:
   * RewardLifecyclePanel.tsx (статусы покупки/передачи и вознаграждения)
   * purchase-accrual-receipt-view.ts (ожидание / подтверждение к расчёту)
   */
  const WALLET_VOCAB = {
    purchasePaid: "Покупка: Оплачено",
    awaitFulfillment: "Покупка ожидает передачи товара / принятия работ",
    fulfilled: "Товар передан / работы приняты",
    fullReturn: "Покупка: полный возврат",
    rewardPending: "Начислено, ожидает подтверждения",
    rewardConfirmed: "Подтверждено",
    rewardSuspended: "Есть приостановленная сумма",
    rewardReview: "Требует сверки после возврата",
    pendingAmount: "Ожидает подтверждения",
    confirmedCalc: "Подтверждено к расчёту",
    paidOut: "Выплачено",
  };
  const WALLET_CALENDAR_NOTE =
    "Сроки — полные календарные дни после передачи товара / принятия работ, по московскому времени (как в кошельке).";
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

  const LIST_SOURCE_FILTER = [
    { key: "all", label: "Все" },
    { key: "cert", label: "По сертификату" },
    { key: "manual", label: "Вручную" },
  ];

  const MANUAL_CHANNEL_OPTIONS = [
    { key: "phone", label: "Звонок" },
    { key: "messenger", label: "Мессенджер" },
    { key: "visit", label: "Личный визит" },
    { key: "ads", label: "Реклама" },
    { key: "other", label: "Другое" },
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
   *   manualEntry?: boolean,
   * }} Appeal
   */

  /** @type {Appeal[]} */
  var appeals = appeals || [];

  /** @type {Record<string, Omit<Appeal, "id"|"history"|"updatedAt"|"stageId"|"receivingPartnerId"> & {appealId?:string}>} */
  const CERT_TEMPLATES = {
    "DEMO-CERT-2048": {
      clientName: "Олег Петров",
      certificateId: "DEMO-CERT-2048",
      referrerPartnerId: "DEMO-PARTNER-0100",
      discountPercent: 10,
      certValidUntil: "2027-04-15",
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

  function manualChannelLabel(key) {
    return MANUAL_CHANNEL_OPTIONS.find((s) => s.key === key)?.label || null;
  }

  function isManualAppeal(appeal) {
    return Boolean(appeal.manualEntry);
  }

  function hasCertificateFlow(appeal) {
    return Boolean(appeal.certificateId) && !isManualAppeal(appeal);
  }

  function canAccrueReferral(appeal) {
    return hasCertificateFlow(appeal) && Boolean(appeal.referrerPartnerId && PARTNERS[appeal.referrerPartnerId]);
  }

  function sourceDisplay(appeal) {
    if (isManualAppeal(appeal)) {
      const ch = manualChannelLabel(appeal.sourceKey);
      return ch ? `Добавлен вручную · ${ch}` : "Добавлен вручную";
    }
    return "По сертификату";
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

  function wholeDaysElapsed(fromIso, toIso) {
    const a = new Date(fromIso);
    const b = new Date(toIso);
    const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  }

  function formatAgeSince(iso) {
    const days = wholeDaysElapsed(iso, new Date().toISOString());
    if (days <= 0) return "Создано сегодня";
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

  /** Когорта: событие зафиксировано в истории или persisted-полях (не только текущий статус). */
  function appealReachedPaid(appeal) {
    if (appeal.paidAt || appeal.purchaseId) return true;
    return appeal.history.some((h) => /оплачено|покупк.*кошельк/i.test(h.text));
  }

  function appealReachedShipped(appeal) {
    if (appeal.shippedAt) return true;
    return appeal.history.some((h) => /отгружено/i.test(h.text));
  }

  function appealReachedReturn(appeal) {
    if (appeal.stageId === SYSTEM.RETURN || appeal.returnedAt) return true;
    return appeal.history.some((h) => /возврат/i.test(h.text));
  }

  function funnelCohortFromFilters(configKey) {
    const s = configKey ? ws(configKey) : { tab: activeTab, funnelFrom: "2026-10-01", funnelTo: todayYmd() };
    const mode = s.tab === "outgoing" ? "outgoing" : "incoming";
    const fromVal = s.funnelFrom;
    const toVal = s.funnelTo;
    const periodStart = fromVal ? new Date(`${fromVal}T00:00:00`) : new Date(2026, 9, 1);
    const periodEnd = toVal ? new Date(`${toVal}T23:59:59`) : new Date();
    return filterAppeals(mode, configKey).filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= periodStart.getTime() && t <= periodEnd.getTime();
    });
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
      amountLabel: amount,
      purchasePaymentLabel: WALLET_VOCAB.purchasePaid,
      purchaseFulfillmentLabel: null,
      rewardStatusLabel: null,
      rewardDetailLabel: null,
      waitDaysLeft: null,
      waitEndsAt: null,
    };
    return walletPurchases[appeal.purchaseId];
  }

  /** Синхронизация демо-покупки с этапом обращения — те же подписи, что в кошельке prod. */
  function syncWalletFromAppeal(appeal) {
    if (!appealHasPaidPurchase(appeal)) return null;
    const wallet = ensureWalletPurchase(appeal);
    wallet.purchasePaymentLabel = WALLET_VOCAB.purchasePaid;
    wallet.purchaseFulfillmentLabel = null;
    wallet.rewardStatusLabel = null;
    wallet.rewardDetailLabel = null;
    wallet.waitDaysLeft = null;
    wallet.waitEndsAt = null;

    const shipped = Boolean(appeal.shippedAt);
    const paidOnly =
      appeal.paidAt &&
      !shipped &&
      appeal.stageId !== SYSTEM.SHIPPED &&
      appeal.stageId !== SYSTEM.RETURN;

    if (appeal.stageId === SYSTEM.RETURN) {
      wallet.purchaseFulfillmentLabel = WALLET_VOCAB.fullReturn;
      if (canAccrueReferral(appeal)) {
        wallet.rewardStatusLabel = WALLET_VOCAB.rewardReview;
        wallet.rewardDetailLabel = WALLET_VOCAB.pendingAmount;
      }
      return wallet;
    }

    if (shipped || appeal.stageId === SYSTEM.SHIPPED) {
      wallet.purchaseFulfillmentLabel = WALLET_VOCAB.fulfilled;
      if (canAccrueReferral(appeal) && appeal.shippedAt) {
        wallet.waitEndsAt = addDays(appeal.shippedAt, WAIT_DAYS);
        wallet.waitDaysLeft = referralWaitDaysLeft(appeal.shippedAt);
        if (wallet.waitDaysLeft > 0) {
          wallet.rewardStatusLabel = WALLET_VOCAB.rewardPending;
          wallet.rewardDetailLabel = WALLET_VOCAB.pendingAmount;
        } else {
          wallet.rewardStatusLabel = WALLET_VOCAB.rewardConfirmed;
          wallet.rewardDetailLabel = WALLET_VOCAB.confirmedCalc;
        }
      }
      return wallet;
    }

    if (paidOnly || appeal.stageId === SYSTEM.PAID || appeal.paidAt) {
      wallet.purchaseFulfillmentLabel = WALLET_VOCAB.awaitFulfillment;
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

  function todayYmd() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function certStillValid(untilIso) {
    if (!untilIso) return false;
    return dateOnlyMs(untilIso) >= dateOnlyMs(new Date().toISOString());
  }

  function referralWaitDaysLeft(shippedAtIso) {
    const shippedMs = dateOnlyMs(shippedAtIso);
    const todayMs = dateOnlyMs(new Date().toISOString());
    const endMs = dateOnlyMs(addDays(shippedAtIso, WAIT_DAYS));
    const fromMs = Math.max(shippedMs, todayMs);
    return Math.min(WAIT_DAYS, Math.max(0, Math.floor((endMs - fromMs) / 86400000)));
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
        certValidUntil: "2027-05-20",
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
        certValidUntil: "2027-02-01",
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
        certValidUntil: "2027-06-01",
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
        certValidUntil: "2027-07-10",
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
      const options = id === "manual-source" ? MANUAL_CHANNEL_OPTIONS : LIST_SOURCE_FILTER;
      el.textContent = "";
      options.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.key;
        opt.textContent = s.label;
        el.appendChild(opt);
      });
      if (prev && Array.from(el.options).some((o) => o.value === prev)) el.value = prev;
      else if (id === "manual-source") el.value = "phone";
    });
  }

  function matchesSourceFilter(appeal, sourceKey) {
    if (sourceKey === "all") return true;
    if (sourceKey === "manual") return isManualAppeal(appeal);
    if (sourceKey === "cert") return hasCertificateFlow(appeal);
    return true;
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

  function filterAppeals(mode, configKey) {
    const s = configKey ? ws(configKey) : null;
    const q = (s ? s.listQ : (document.getElementById(mode === "incoming" ? "search-incoming" : "search-outgoing")?.value || "")).trim().toLowerCase();
    const status = s ? s.listStatus : (document.getElementById(mode === "incoming" ? "filter-status-incoming" : "filter-status-outgoing")?.value || "Все статусы");
    const source = s ? s.listSource : (document.getElementById(mode === "incoming" ? "filter-source-incoming" : "filter-source-outgoing")?.value || "all");
    let list = appeals.slice();
    if (mode === "incoming") {
      list = list.filter((a) => a.receivingPartnerId === RECEIVING.id);
    } else {
      list = list.filter((a) => a.referrerPartnerId === REFERRER_VIEWER.id);
      const partner = document.getElementById("filter-partner-outgoing")?.value || "all";
      if (partner !== "all") list = list.filter((a) => a.receivingPartnerId === partner);
    }
  list = list.filter((a) => {
      if (!matchesSourceFilter(a, source)) return false;
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
    const scopeBody = document.getElementById("demo-scope-body");
    if (!el) return;
    if (activeTab === "incoming") {
      el.textContent = `${RECEIVING.name} (${RECEIVING.id}), ${RECEIVING.city}`;
      if (badge) badge.textContent = "Демо: принимающий партнёр";
      if (scopeBody) {
        scopeBody.textContent = `Видны только обращения у партнёра A (${RECEIVING.id}), в том числе от направившего D (${DEMO_REFERRER_D.name}). Клиенты, добавленные вручную без сертификата, есть только здесь — не во вкладке «Отправил клиентов». Обращения B→C (${DEMO_RECEIVER_C.name}) не показываются. Настройки статусов — только для A. Вкладка «Отправил клиентов» — другой демо-актор, не смешивать с этим аккаунтом.`;
      }
    } else {
      el.textContent = `${REFERRER_VIEWER.name} (${REFERRER_VIEWER.id})`;
      if (badge) badge.textContent = "Демо: направивший партнёр";
      if (scopeBody) {
        scopeBody.textContent = `Только направления партнёра B: к A (${RECEIVING.name}) и к C (${DEMO_RECEIVER_C.name}). Направления D (${DEMO_REFERRER_D.name}) к A скрыты — их видит только вкладка принимающего A. Статусы и служебные заметки принимающего здесь недоступны (только просмотр). Один объект обращения в памяти: смена статуса на A синхронно отражается у B. В продукте — один текущий аккаунт, без смены перспективы.`;
      }
    }
    renderFunnel();
  }

  function paidPurchaseHtml(appeal) {
    syncWalletFromAppeal(appeal);
    if (!appeal.purchaseId) return "";
    const purchase = walletPurchases[appeal.purchaseId];
    if (!purchase) return "";
    const rewardHint = purchase.rewardStatusLabel
      ? ` · Вознаграждение: ${purchase.rewardStatusLabel}`
      : "";
    return `<div class="cl-paid-row">
      <div class="cl-meta">Обращение ${esc(appeal.id)} · покупка ${esc(appeal.purchaseId)}</div>
      <div><strong>${esc(purchase.purchasePaymentLabel)}</strong> · ${esc(purchase.amountLabel)}${esc(rewardHint)}</div>
      ${purchase.purchaseFulfillmentLabel ? `<div class="cl-meta">${esc(purchase.purchaseFulfillmentLabel)}</div>` : ""}
      <button type="button" class="pp-btn" data-wallet-purchase="${esc(appeal.purchaseId)}">Покупка в кошельке</button>
      <p class="cl-meta">Оплата клиентом и вознаграждение направившему — разные статусы в одной покупке.${
        isManualAppeal(appeal)
          ? " Без направившего: реферальное вознаграждение и ожидание 14 дней не создаются."
          : ""
      }</p>
    </div>`;
  }

  function waitBlockHtml(appeal) {
    if (!canAccrueReferral(appeal)) return "";
    const wallet = syncWalletFromAppeal(appeal);
    if (!wallet?.rewardStatusLabel || appeal.stageId !== SYSTEM.SHIPPED) return "";
    const left = wallet.waitDaysLeft != null ? Math.min(WAIT_DAYS, Math.max(0, wallet.waitDaysLeft)) : 0;
    return `<div class="cl-wait-block" role="status">
      <div class="cl-wallet-kind cl-wallet-kind--purchase">${esc(wallet.purchaseFulfillmentLabel || "")}</div>
      <div class="cl-wallet-kind cl-wallet-kind--referral">Вознаграждение: <strong>${esc(wallet.rewardStatusLabel)}</strong></div>
      <div class="cl-meta">${esc(wallet.rewardDetailLabel || "")}${left > 0 ? ` · осталось ${esc(String(left))} из ${WAIT_DAYS} календ. дн.` : ""}</div>
      ${wallet.waitEndsAt ? `<div class="cl-meta">Ориентир по сроку: ${esc(formatDate(wallet.waitEndsAt))}</div>` : ""}
      <button type="button" class="pp-btn" data-wallet-purchase="${esc(appeal.purchaseId)}">Покупка в кошельке</button>
      <p class="cl-note cl-note--legal">${esc(WALLET_CALENDAR_NOTE)} Демо. Без реальных операций.</p>
    </div>`;
  }

  function renderFunnel() {
    const body = document.getElementById("funnel-body");
    if (!body) return;
    const cohort = funnelCohortFromFilters();
    const denom = cohort.length;
    const paidIds = new Set(cohort.filter((a) => appealReachedPaid(a)).map((a) => a.id));
    const shippedIds = new Set(cohort.filter((a) => appealReachedShipped(a)).map((a) => a.id));
    const returnIds = new Set(cohort.filter((a) => appealReachedReturn(a)).map((a) => a.id));
    const paidN = paidIds.size;
    const shippedN = shippedIds.size;
    const returnN = returnIds.size;
    const certCohort = cohort.filter((a) => hasCertificateFlow(a));
    const manualCohort = cohort.filter((a) => isManualAppeal(a));
    const certPaid = certCohort.filter((a) => paidIds.has(a.id)).length;
    const manualPaid = manualCohort.filter((a) => paidIds.has(a.id)).length;

    let extra = "";
    if (activeTab === "incoming") {
      const byReferrer = new Map();
      cohort.forEach((a) => {
        const key = isManualAppeal(a) ? "Добавлен вручную" : PARTNERS[a.referrerPartnerId]?.name || "—";
        const row = byReferrer.get(key) || { created: 0, paid: 0, shipped: 0 };
        row.created += 1;
        if (paidIds.has(a.id)) row.paid += 1;
        if (shippedIds.has(a.id)) row.shipped += 1;
        byReferrer.set(key, row);
      });
      const refRows = Array.from(byReferrer.entries())
        .map(
          ([name, row]) =>
            `<div class="cl-funnel-row"><span>${esc(name)}</span><strong>${esc(String(row.created))} · опл. ${esc(safePct(row.paid, row.created))} · отгр. ${esc(safePct(row.shipped, row.created))}</strong></div>`
        )
        .join("");
      if (refRows) {
        extra = `<details class="cl-funnel-nested"><summary>По направившему</summary>${refRows}</details>`;
      }
    } else {
      const byReceiver = new Map();
      cohort.forEach((a) => {
        const id = a.receivingPartnerId;
        const name = PARTNERS[id]?.name || "—";
        const row = byReceiver.get(id) || { name, created: 0, paid: 0, shipped: 0 };
        row.created += 1;
        if (paidIds.has(a.id)) row.paid += 1;
        if (shippedIds.has(a.id)) row.shipped += 1;
        byReceiver.set(id, row);
      });
      const rows = Array.from(byReceiver.values())
        .map(
          (row) =>
            `<tr><td>${esc(row.name)}</td><td>${esc(String(row.created))}</td><td>${esc(String(row.paid))} · ${esc(safePct(row.paid, row.created))}</td><td>${esc(String(row.shipped))} · ${esc(safePct(row.shipped, row.created))}</td></tr>`
        )
        .join("");
      if (rows) {
        extra = `<details class="cl-funnel-nested"><summary>По принимающему партнёру</summary>
          <table class="cl-table cl-funnel-table"><thead><tr><th>Партнёр</th><th>Обращ.</th><th>Оплачено</th><th>Отгружено</th></tr></thead><tbody>${rows}</tbody></table></details>`;
      }
    }

    body.innerHTML = `
      <p class="cl-meta">По обращениям, созданным за период; состояние на текущий момент. Обращение появляется при первом скане/создании; оплата позже привязывает ту же покупку в кошельке.</p>
      <div class="cl-funnel-row"><span>Обращения</span><strong>${esc(String(denom))}</strong></div>
      <div class="cl-funnel-row cl-funnel-row--sub"><span>в т. ч. по сертификату</span><strong>${esc(String(certCohort.length))} · опл. ${esc(safePct(certPaid, certCohort.length))}</strong></div>
      <div class="cl-funnel-row cl-funnel-row--sub"><span>в т. ч. вручную</span><strong>${esc(String(manualCohort.length))} · опл. ${esc(safePct(manualPaid, manualCohort.length))}</strong></div>
      <div class="cl-funnel-row"><span>→ Оплачено (когда-либо)</span><strong>${esc(String(paidN))} · ${esc(safePct(paidN, denom))}</strong></div>
      <div class="cl-funnel-row"><span>→ Отгружено (когда-либо)</span><strong>${esc(String(shippedN))} · ${esc(safePct(shippedN, denom))}</strong></div>
      <div class="cl-funnel-row"><span>Возврат (отдельно)</span><strong>${esc(String(returnN))}</strong></div>
      <p class="cl-meta">Конверсия по оплате сохраняется по факту достижения «Оплачено», даже если позже был возврат. Без пересчёта прибыли.</p>
      ${extra}`;
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
        <h3 id="cert-heading" class="cl-visually-hidden">${manual ? "Клиент" : "Сертификат"}</h3>
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
          ${
            manual
              ? `<p class="cl-note cl-note--legal">Совпадение имени не означает того же клиента. Привязка сертификата или перенаправление после оплаты — возможная будущая функция (сверка); в демо не выполняется, без ретроактивных скидок и смены происхождения.</p>`
              : ""
          }
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
        <button type="button" class="cl-subtab" role="tab" id="subtab-cert" aria-selected="${detailSubTab === "cert"}">${manual ? "Клиент" : "Сертификат"}</button>
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
    afterDataChange();
  }

  function openWalletDialog(purchaseId) {
    const purchase = walletPurchases[purchaseId];
    const body = document.getElementById("wallet-body");
    if (!purchase || !body) return;
    const purchaseBlock = `
      <div class="cl-wallet-card">
        <span class="cl-wallet-kind cl-wallet-kind--purchase">Покупка клиентом (демо)</span>
        <div>ID покупки: <strong>${esc(purchaseId)}</strong> — один и тот же при оплате, отгрузке и возврате</div>
        <div>ID обращения: ${esc(purchase.appealId)}</div>
        ${purchase.certificateId !== "—" ? `<div>ID сертификата: ${esc(purchase.certificateId)}</div>` : ""}
        <div><strong>${esc(purchase.purchasePaymentLabel)}</strong> · ${esc(purchase.amountLabel)}</div>
        ${purchase.purchaseFulfillmentLabel ? `<div>${esc(purchase.purchaseFulfillmentLabel)}</div>` : ""}
      </div>`;
    const rewardBlock = purchase.referrerName
      ? purchase.rewardStatusLabel
        ? `<div class="cl-wallet-card" style="margin-top:10px">
        <span class="cl-wallet-kind cl-wallet-kind--referral">Вознаграждение направившему</span>
        <div>Направил: ${esc(purchase.referrerName)}</div>
        <div><strong>${esc(purchase.rewardStatusLabel)}</strong></div>
        ${purchase.rewardDetailLabel ? `<div class="cl-meta">${esc(purchase.rewardDetailLabel)}</div>` : ""}
        ${purchase.waitEndsAt && purchase.waitDaysLeft != null && purchase.waitDaysLeft > 0 ? `<div class="cl-meta">Осталось ${esc(String(purchase.waitDaysLeft))} календ. дн.</div>` : ""}
        <p class="cl-note">${esc(WALLET_CALENDAR_NOTE)}</p>
      </div>`
        : `<p class="cl-meta">Вознаграждение появится после передачи товара / принятия работ, если есть направивший по сертификату.</p>`
      : `<p class="cl-meta">Обращение без сертификата и направившего: реферальное вознаграждение и 14‑дневное ожидание не применяются. Покупка клиента отслеживается отдельно.</p>`;
    body.innerHTML = `${purchaseBlock}${rewardBlock}
      <p class="cl-note cl-note--legal">Демо. Без реальных операций. Оплата клиентом и выплата направившему — разные статусы.</p>`;
    /** @type {HTMLDialogElement|null} */ (document.getElementById("wallet-dialog"))?.showModal();
  }

  function resetManualForm() {
    /** @type {HTMLInputElement|null} */ (document.getElementById("manual-name")) &&
      (/** @type {HTMLInputElement} */ (document.getElementById("manual-name")).value = "");
    /** @type {HTMLInputElement|null} */ (document.getElementById("manual-interest")) &&
      (/** @type {HTMLInputElement} */ (document.getElementById("manual-interest")).value = "");
    /** @type {HTMLInputElement|null} */ (document.getElementById("manual-contact")) &&
      (/** @type {HTMLInputElement} */ (document.getElementById("manual-contact")).value = "");
    const sourceEl = /** @type {HTMLSelectElement|null} */ (document.getElementById("manual-source"));
    if (sourceEl) sourceEl.value = "phone";
    const err = document.getElementById("manual-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
  }

  function openManualDialog() {
    resetManualForm();
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
        err.textContent = "Укажите имя или название компании.";
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
      discountPercent: null,
      certValidUntil: null,
      interest: interestEl?.value.trim() || "",
      clientCity: RECEIVING.city,
      budgetHint: "",
      stageId: SYSTEM.NEW,
      refusedReason: null,
      shippedAt: null,
      paidAmount: null,
      paidAt: null,
      privateNotes: "",
      sourceKey: sourceEl?.value || "phone",
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
    resetManualForm();
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
      if (!certStillValid(tpl.certValidUntil)) {
        err.hidden = false;
        err.textContent = "Сертификат недействителен или срок истёк. Обращение не создано.";
        return;
      }
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

  function syncSettingsDraftFromDom() {
    const body = document.getElementById("settings-body");
    if (!body || !settingsDraft) return;
    body.querySelectorAll(".stage-label").forEach((input, i) => {
      if (settingsDraft.workingStages[i]) {
        settingsDraft.workingStages[i].label = /** @type {HTMLInputElement} */ (input).value;
      }
    });
    body.querySelectorAll(".reason-label").forEach((input, i) => {
      if (settingsDraft.refusalReasons[i] != null) {
        settingsDraft.refusalReasons[i] = /** @type {HTMLInputElement} */ (input).value;
      }
    });
  }

  function bindSettingsDraftSync() {
    const body = document.getElementById("settings-body");
    if (!body) return;
    body.querySelectorAll(".stage-label, .reason-label").forEach((input) => {
      input.addEventListener("input", syncSettingsDraftFromDom);
    });
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
      ["Новое обращение", "Создание обращения"],
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
          <input type="text" class="cl-input stage-label" value="${esc(stage.label)}" placeholder="Например: Подбор кухни" aria-label="Название этапа ${index + 1}" />
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
      syncSettingsDraftFromDom();
      settingsDraft.workingStages.push({
        id: `ws_custom_${Date.now()}`,
        label: "",
      });
      renderSettingsBody();
    });
    body.querySelector("#add-reason")?.addEventListener("click", () => {
      syncSettingsDraftFromDom();
      settingsDraft.refusalReasons.push("");
      renderSettingsBody();
    });
    body.querySelectorAll(".stage-up").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        syncSettingsDraftFromDom();
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
        syncSettingsDraftFromDom();
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
        syncSettingsDraftFromDom();
        const idx = Number(/** @type {HTMLElement} */ (e.currentTarget).getAttribute("data-reason-index"));
        const removed = settingsDraft.refusalReasons.splice(idx, 1)[0];
        if (removed) settingsDraft.archivedStages.push({ id: `arch_reason_${removed}`, label: `Причина: ${removed}` });
        renderSettingsBody();
      });
    });
    body.querySelectorAll(".stage-archive").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        syncSettingsDraftFromDom();
        const idx = Number(/** @type {HTMLElement} */ (e.currentTarget).getAttribute("data-stage-index"));
        const removed = settingsDraft.workingStages.splice(idx, 1)[0];
        if (removed) settingsDraft.archivedStages.push(removed);
        renderSettingsBody();
      });
    });
    bindSettingsDraftSync();
  }

  function saveSettings(event) {
    event.preventDefault();
    const body = document.getElementById("settings-body");
    if (!body || !settingsDraft) return;
    syncSettingsDraftFromDom();
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
    body.innerHTML = `${fields}<p class="cl-note cl-note--legal">Демо. Без реальных операций.</p>`;
    const dateEl = /** @type {HTMLInputElement|null} */ (document.getElementById("review-date"));
    const maxYmd = todayYmd();
    if (dateEl) {
      dateEl.max = maxYmd;
      dateEl.value = maxYmd;
      dateEl.addEventListener("change", () => {
        if (!reviewErr) return;
        if (dateEl.value && dateEl.value > maxYmd) {
          reviewErr.hidden = false;
          reviewErr.textContent = "Дата не может быть в будущем.";
        } else {
          reviewErr.hidden = true;
          reviewErr.textContent = "";
        }
      });
    }
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
    const todayMs = dateOnlyMs(new Date().toISOString());
    if (eventMs > todayMs) {
      if (reviewErr) {
        reviewErr.hidden = false;
        reviewErr.textContent = "Дата не может быть в будущем.";
      }
      return;
    }
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

  function initTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    const dark = attr === "dark";
    if (!attr) document.documentElement.setAttribute("data-theme", "light");
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


let cabinetHooks = null;
function afterDataChange() {
  cabinetHooks?.refresh?.();
}

// ── Cabinet integration ──
const workspaces = new Map();
function ws(key) {
  if (!workspaces.has(key)) {
    workspaces.set(key, {
      seeded: false,
      tab: "incoming",
      view: "list",
      selectedId: null,
      purchaseViewId: null,
      listQ: "",
      listStatus: "Все статусы",
      listSource: "all",
      funnelFrom: "2026-10-01",
      funnelTo: "2026-11-12",
      scanOutcome: "new",
      scanError: "",
      manualError: "",
      settingsError: "",
      inlineReview: null,
      detailTab: "cert",
      settingsDraft: null,
      showRefusal: null,
      notice: "",
    });
  }
  return workspaces.get(key);
}

function roleCaps(role) {
  const incoming = ["store", "company", "employee", "specialist"].includes(role);
  const outgoing = ["agent", "specialist"].includes(role);
  const manual = ["store", "company", "employee"].includes(role);
  return { incoming, outgoing, manualOnlyAgent: role === "agent", canReceive: incoming, canRefer: outgoing };
}

function viewerForRole(role) {
  if (role === "agent" || role === "specialist") return { mode: "referrer", id: REFERRER_VIEWER.id, name: REFERRER_VIEWER.name };
  return { mode: "receiver", id: RECEIVING.id, name: RECEIVING.name, city: RECEIVING.city };
}

const PAGE_TITLES = {
  list: "Клиенты",
  detail: "Обращение",
  scan: "Сканировать сертификат",
  manual: "Добавить клиента",
  settings: "Этапы и причины",
  purchase: "Покупка",
  analytics: "Аналитика",
};

export function clientAppealsPageTitle(config) {
  const s = ws(config.key);
  return PAGE_TITLES[s.view] || "Клиенты";
}

export function clientAppealsPageMuted(config) {
  const s = ws(config.key);
  if (s.view === "list") return "Обращения по сертификату и клиенты, добавленные вручную.";
  if (s.view === "analytics") return "Когорта по дате создания обращения.";
  return "Демо. Без реальных операций.";
}

function ensureSeed(config) {
  const s = ws(config.key);
  if (s.seeded) return;
  s.seeded = true;
  if (!emptyDatasetOn()) seedAppeals();
  else {
    appeals = [];
    Object.keys(walletPurchases).forEach((k) => delete walletPurchases[k]);
  }
  const caps = roleCaps(config.role);
  if (!caps.incoming) s.tab = "outgoing";
}

function backLink(config, label, action) {
  return `<p class="ca-back"><button type="button" class="linkbtn" data-ca-action="${action}">${label}</button></p>`;
}

function renderListPage(config) {
  const s = ws(config.key);
  const caps = roleCaps(config.role);
  const viewer = viewerForRole(config.role);
  const readOnly = config.readOnly;
  const incomingList = filterAppeals("incoming", config.key);
  const outgoingList = filterAppeals("outgoing", config.key);
  const tab = caps.incoming && caps.outgoing ? s.tab : caps.incoming ? "incoming" : "outgoing";
  const list = tab === "incoming" ? incomingList : outgoingList;
  const rows = list
    .map((a) => {
      const ro = tab === "outgoing";
      return `<button type="button" class="ca-row" data-ca-action="open:${a.id}" data-ca-tab="${tab}"><div class="ca-row-main"><strong>${esc(a.clientName)}</strong><span class="muted">${esc(a.interest || "—")}</span></div><div class="ca-row-meta"><span class="pill">${esc(stageLabel(a))}</span><span class="muted">${esc(counterpartyLine(a, tab))}</span><span class="muted">${esc(formatAgeSince(a.createdAt))}</span>${a.paidAmount != null ? `<span class="ca-amount">${esc((a.paidAmount).toLocaleString("ru-RU"))} ₽</span>` : ""}<span class="ca-chev" aria-hidden="true">›</span></div></button>`;
    })
    .join("");
  const tabs =
    caps.incoming && caps.outgoing
      ? `<div class="ca-tabs" role="tablist"><button type="button" role="tab" aria-selected="${tab === "incoming"}" data-ca-action="tab:incoming">Пришли ко мне · ${incomingList.length}</button><button type="button" role="tab" aria-selected="${tab === "outgoing"}" data-ca-action="tab:outgoing">Я направил · ${outgoingList.length}</button></div>`
      : caps.incoming
        ? `<p class="muted">Пришли ко мне · ${incomingList.length}</p>`
        : `<p class="muted">Я направил · ${outgoingList.length}</p>`;
  const empty =
    !list.length &&
    `<section class="panel empty ca-empty"><h2>Пока нет обращений</h2><p class="muted">Сканируйте сертификат или добавьте клиента вручную.</p><div class="ca-actions-row">${!readOnly && caps.canReceive ? `<button type="button" class="btn primary" data-ca-action="nav:scan">Сканировать сертификат</button><button type="button" class="btn ghost" data-ca-action="nav:manual">Добавить клиента</button>` : ""}</div></section>`;
  const actions = !readOnly && tab === "incoming" && caps.canReceive
    ? `<div class="ca-toolbar"><button type="button" class="btn primary" data-ca-action="nav:scan">Сканировать сертификат</button><button type="button" class="btn ghost" data-ca-action="nav:manual">Добавить клиента</button><span class="ca-quiet-links"><button type="button" class="linkbtn" data-ca-action="nav:analytics">Аналитика</button><button type="button" class="linkbtn" data-ca-action="nav:settings">Этапы и причины</button></span></div>`
    : !readOnly && tab === "outgoing"
      ? `<div class="ca-toolbar"><span class="ca-quiet-links"><button type="button" class="linkbtn" data-ca-action="nav:analytics">Аналитика</button></span></div>`
      : readOnly
        ? `<p class="notice">Только просмотр: изменять статусы и заметки нельзя.</p>`
        : "";
  return `${tabs}${actions}<div class="ca-filters row"><label class="field ca-search">Поиск<input type="search" data-ca-input="q" value="${esc(s.listQ)}" placeholder="Имя, сертификат или ID"></label><label class="field">Статус<select data-ca-input="status"></select></label>${tab === "incoming" ? `<label class="field">Источник<select data-ca-input="source"></select></label>` : ""}</div>${empty || `<div class="ca-rows">${rows}</div>`}`;
}

export function renderClientAppeals(config) {
  ensureSeed(config);
  const s = ws(config.key);
  activeTab = s.tab;
  // sync globals used by ported logic
  const viewer = viewerForRole(config.role);
  if (viewer.mode === "receiver") {
    RECEIVING.id = viewer.id;
    RECEIVING.name = viewer.name;
  }
  if (s.view === "list") return `<div class="stack ca-section" data-ca-root>${renderListPage(config)}</div>`;
  if (s.view === "scan") return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К списку клиентов", "nav:list")}<section class="panel">${renderScanInline()}</section></div>`;
  if (s.view === "manual") return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К списку клиентов", "nav:list")}<section class="panel">${renderManualInline(config)}</section></div>`;
  if (s.view === "settings") return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К списку клиентов", "nav:list")}${renderSettingsInline(config)}</div>`;
  if (s.view === "purchase") return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К обращению", "nav:detail")}${renderPurchaseInline(s.purchaseViewId)}</div>`;
  if (s.view === "analytics") return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К списку клиентов", "nav:list")}${renderFunnelPage(config)}</div>`;
  if (s.view === "detail" && s.selectedId) return `<div class="stack ca-section" data-ca-root>${backLink(config, "← К списку клиентов", "nav:list")}${renderDetailPage(config, s.selectedId)}</div>`;
  s.view = "list";
  return renderClientAppeals(config);
}

function renderScanInline() {
  return `<h2 class="ca-inpage-title">Сканировать сертификат</h2><p class="muted">Демо без камеры. Выберите исход проверки.</p><fieldset class="stack"><label class="radio"><input type="radio" name="ca-scan-outcome" value="new" checked> Новый сертификат</label><label class="radio"><input type="radio" name="ca-scan-outcome" value="repeat"> Повторное сканирование</label><label class="radio"><input type="radio" name="ca-scan-outcome" value="invalid"> Недействителен</label></fieldset><p class="notice" data-ca-scan-error hidden role="alert"></p><button type="button" class="btn primary" data-ca-action="scan:submit">Считать демосертификат</button>`;
}

function renderManualInline(config) {
  if (config.readOnly) return `<p class="notice">Добавление недоступно в режиме просмотра.</p>`;
  const opts = MANUAL_CHANNEL_OPTIONS.map((o) => `<option value="${esc(o.key)}">${esc(o.label)}</option>`).join("");
  return `<h2 class="ca-inpage-title">Добавить клиента</h2><p class="muted">Без сертификата и направившего. Имя или компания обязательны.</p><form class="stack" id="ca-manual-form"><label class="field">Имя или компания<input name="name" required maxlength="120"></label><label class="field">Запрос / интерес<input name="interest" maxlength="200"></label><label class="field">Контакт<input name="contact" maxlength="80"></label><label class="field">Канал<select name="source">${opts}</select></label><p class="field-error" id="ca-manual-error" hidden></p><div class="row"><button type="button" class="btn ghost" data-ca-action="nav:list">Отмена</button><button type="submit" class="btn primary">Создать обращение</button></div></form>`;
}

function paidPurchaseHtmlCabinet(appeal, config) {
  syncWalletFromAppeal(appeal);
  if (!appeal.purchaseId) return "";
  const purchase = walletPurchases[appeal.purchaseId];
  if (!purchase) return "";
  const rewardHint = purchase.rewardStatusLabel ? ` · Вознаграждение: ${purchase.rewardStatusLabel}` : "";
  return `<div class="ca-paid panel"><div class="small muted">Обращение ${esc(appeal.id)} · покупка ${esc(appeal.purchaseId)}</div><div><strong>${esc(purchase.purchasePaymentLabel)}</strong> · ${esc(purchase.amountLabel)}${esc(rewardHint)}</div>${purchase.purchaseFulfillmentLabel ? `<div class="muted">${esc(purchase.purchaseFulfillmentLabel)}</div>` : ""}<button type="button" class="linkbtn" data-ca-action="purchase:${esc(appeal.purchaseId)}">Подробнее о покупке</button></div>`;
}

function waitBlockHtmlCabinet(appeal) {
  if (!canAccrueReferral(appeal)) return "";
  const wallet = syncWalletFromAppeal(appeal);
  if (!wallet?.rewardStatusLabel || appeal.stageId !== SYSTEM.SHIPPED) return "";
  const left = wallet.waitDaysLeft != null ? Math.min(WAIT_DAYS, Math.max(0, wallet.waitDaysLeft)) : 0;
  return `<div class="ca-wait notice" role="status"><div>${esc(wallet.purchaseFulfillmentLabel || "")}</div><div>Вознаграждение: <strong>${esc(wallet.rewardStatusLabel)}</strong></div><p class="small muted">${esc(wallet.rewardDetailLabel || "")}${left > 0 ? ` · осталось ${left} из ${WAIT_DAYS} календ. дн.` : ""}</p><p class="small muted">${esc(WALLET_CALENDAR_NOTE)}</p></div>`;
}

function renderReviewInline(config, s) {
  if (!s.inlineReview) return "";
  const pr = s.inlineReview;
  const appeal = appeals.find((a) => a.id === pr.appealId);
  if (!appeal) return "";
  const label = systemLabel(pr.stageId) || pr.stageId;
  const maxYmd = todayYmd();
  let fields = "";
  if (pr.stageId === SYSTEM.PAID) {
    fields = `<label class="field">Дата оплаты<input type="date" name="review-date" max="${maxYmd}" value="${maxYmd}" required></label><label class="field">Сумма (демо)<input type="number" name="review-amount" min="0" step="1000" placeholder="Необязательно"></label>`;
  } else if (pr.stageId === SYSTEM.SHIPPED) {
    fields = `<p class="small muted">После отгрузки — ожидание начисления (${WAIT_DAYS} дн.), если есть направивший.</p><label class="field">Дата отгрузки<input type="date" name="review-date" max="${maxYmd}" value="${maxYmd}" required></label>`;
  } else if (pr.stageId === SYSTEM.RETURN) {
    fields = `<label class="field">Дата возврата<input type="date" name="review-date" max="${maxYmd}" value="${maxYmd}" required></label>`;
  }
  return `<section class="panel stack ca-review" data-testid="ca-review"><h3>Подтверждение: ${esc(label)}</h3><form class="stack" id="ca-review-form">${fields}<p class="field-error" id="ca-review-error" hidden></p><div class="row"><button type="button" class="btn ghost" data-ca-action="review:cancel">Отмена</button><button type="submit" class="btn primary">Подтвердить</button></div></form></section>`;
}

function renderRefusalInline(config, s, appealId) {
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal || config.readOnly) return "";
  const settings = partnerSettings[appeal.receivingPartnerId];
  const opts = (settings?.refusalReasons || []).map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("");
  return `<section class="panel stack ca-refusal"><h3>Отказ</h3><form class="stack" id="ca-refusal-form"><label class="field">Причина<select name="reason" required>${opts}</select></label><label class="field">Комментарий<textarea name="comment" rows="2"></textarea></label><p class="field-error" id="ca-refusal-error" hidden></p><div class="row"><button type="button" class="btn ghost" data-ca-action="refusal:cancel">Отмена</button><button type="submit" class="btn primary">Зафиксировать отказ</button></div></form></section>`;
}

function renderDetailPage(config, appealId) {
  const s = ws(config.key);
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal) return `<p class="notice">Обращение не найдено.</p>`;
  selectedAppealId = appealId;
  const tab = s.detailTab || "cert";
  const readOnly = config.readOnly || s.tab === "outgoing";
  const manual = isManualAppeal(appeal);
  const certRows = manual
    ? `<div class="ca-kv"><span>Сертификат</span><strong>Без сертификата</strong></div>`
    : `<div class="ca-kv"><span>ID сертификата</span><strong>${esc(appeal.certificateId)}</strong></div><div class="ca-kv"><span>Направил</span><strong>${esc(PARTNERS[appeal.referrerPartnerId]?.name || "—")}</strong></div><div class="ca-kv"><span>Скидка</span><strong>${esc(appeal.discountPercent)}%</strong></div><div class="ca-kv"><span>Действует до</span><strong>${esc(formatDate(appeal.certValidUntil))}</strong></div>`;
  const timeline = appeal.history.map((h) => `<li><time>${esc(formatDateTime(h.at))}</time><p>${esc(h.text)}${h.reason ? ` — ${esc(h.reason)}` : ""}</p></li>`).join("");
  let work = "";
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
    work = `${paidPurchaseHtmlCabinet(appeal, config)}${waitBlockHtmlCabinet(appeal)}${renderReviewInline(config, s)}${s.showRefusal === appealId ? renderRefusalInline(config, s, appealId) : ""}<p class="notice" data-ca-detail-guard hidden role="alert"></p><div class="ca-detail-actions">${nextLabel ? `<button type="button" class="btn primary" data-ca-action="stage:next:${esc(next)}">Следующий шаг: ${esc(nextLabel)}</button>` : ""}${canRefuseFrom(appeal) ? `<button type="button" class="btn ghost" data-ca-action="refusal:open">Отказ</button>` : ""}<label class="field">Изменить статус<select data-ca-input="detail-status">${statusOptions}</select></label><button type="button" class="btn ghost" data-ca-action="stage:apply">Применить статус</button></div><label class="field">Служебные заметки<textarea data-ca-input="detail-notes" rows="3">${esc(appeal.privateNotes)}</textarea></label><button type="button" class="btn ghost" data-ca-action="notes:save">Сохранить заметку</button><h3>История</h3><ul class="ca-timeline">${timeline}</ul>`;
  } else {
    const publicHistory = appeal.history
      .filter((h) => !/заметк/i.test(h.text))
      .map((h) => `<li><time>${esc(formatDateTime(h.at))}</time><p>${esc(h.text)}</p></li>`)
      .join("");
    work = `${paidPurchaseHtmlCabinet(appeal, config)}${waitBlockHtmlCabinet(appeal)}<p class="muted">Просмотр направления: служебные заметки принимающего скрыты.</p><ul class="ca-timeline">${publicHistory}</ul>`;
  }
  return `<section class="panel stack ca-detail"><div class="ca-detail-head"><h2>${esc(appeal.clientName)}</h2><p class="muted">${esc(appeal.id)} · <span class="pill">${esc(stageLabel(appeal))}</span></p></div><div class="ca-tabs ca-subtabs" role="tablist"><button type="button" role="tab" aria-selected="${tab === "cert"}" data-ca-action="detail-tab:cert">${manual ? "Клиент" : "Сертификат"}</button><button type="button" role="tab" aria-selected="${tab === "work"}" data-ca-action="detail-tab:work">Работа</button></div>${tab === "cert" ? `<motion class="stack">${certRows}<div class="ca-kv"><span>Источник</span><strong>${esc(sourceDisplay(appeal))}</strong></div><div class="ca-kv"><span>Контакт</span><strong>${esc(appeal.clientContact || "—")}</strong></div><div class="ca-kv"><span>Запрос</span><strong>${esc(appeal.interest || "—")}</strong></div><div class="ca-kv"><span>Создано</span><strong>${esc(formatDateTime(appeal.createdAt))}</strong></div></motion>` : work}</section>`.replace("<motion", "<div").replace("</motion>", "</div>");
}

function renderFunnelPage(config) {
  const s = ws(config.key);
  activeTab = s.tab;
  const cohort = funnelCohortFromFilters(config.key);
  const denom = cohort.length;
  const paidIds = new Set(cohort.filter((a) => appealReachedPaid(a)).map((a) => a.id));
  const shippedIds = new Set(cohort.filter((a) => appealReachedShipped(a)).map((a) => a.id));
  const returnIds = new Set(cohort.filter((a) => appealReachedReturn(a)).map((a) => a.id));
  const certCohort = cohort.filter((a) => hasCertificateFlow(a));
  const manualCohort = cohort.filter((a) => isManualAppeal(a));
  const certPaid = certCohort.filter((a) => paidIds.has(a.id)).length;
  const manualPaid = manualCohort.filter((a) => paidIds.has(a.id)).length;
  const body = `<p class="small muted">По обращениям, созданным за период; состояние на текущий момент.</p>
    <div class="ca-funnel-row"><span>Обращения</span><strong>${denom}</strong></div>
    <div class="ca-funnel-row"><span>→ Оплачено</span><strong>${paidIds.size} · ${esc(safePct(paidIds.size, denom))}</strong></div>
    <div class="ca-funnel-row"><span>→ Отгружено</span><strong>${shippedIds.size} · ${esc(safePct(shippedIds.size, denom))}</strong></div>
    <div class="ca-funnel-row"><span>Возврат</span><strong>${returnIds.size}</strong></div>
    <motion class="ca-funnel-row"><span>по сертификату</span><strong>${certCohort.length} · опл. ${esc(safePct(certPaid, certCohort.length))}</strong></motion>
    <motion class="ca-funnel-row"><span>вручную</span><strong>${manualCohort.length} · опл. ${esc(safePct(manualPaid, manualCohort.length))}</strong></motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
  return `<section class="panel stack"><h2 class="ca-inpage-title">Аналитика</h2><motion class="row ca-funnel-filters"><label class="field">С<input type="date" data-ca-input="funnel-from" value="${esc(s.funnelFrom)}"></label><label class="field">По<input type="date" data-ca-input="funnel-to" value="${esc(s.funnelTo)}"></label></motion>${body}</section>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
}

function renderSettingsInline(config) {
  if (config.readOnly) return `<p class="notice">Настройки недоступны в режиме просмотра.</p>`;
  const s = ws(config.key);
  if (!s.settingsDraft) s.settingsDraft = JSON.parse(JSON.stringify(partnerSettings[RECEIVING.id]));
  const draft = s.settingsDraft;
  const stages = draft.workingStages.map((stage, i) => `<div class="ca-stage-row"><input type="text" class="stage-label" data-stage-index="${i}" value="${esc(stage.label)}" ${config.readOnly ? "disabled" : ""}><button type="button" class="btn ghost" data-ca-action="settings:archive:${i}">В архив</button></div>`).join("");
  const reasons = draft.refusalReasons.map((r, i) => `<label class="field"><input type="text" class="reason-label" data-reason-index="${i}" value="${esc(r)}"></label>`).join("");
  return `<section class="panel stack"><h2 class="ca-inpage-title">Этапы и причины</h2><p class="small muted">Только для ${esc(RECEIVING.name)}. Системные этапы не редактируются.</p><h3>Рабочие этапы</h3><div class="stack" id="ca-stage-list">${stages}</div><button type="button" class="btn ghost" data-ca-action="settings:add-stage">Добавить этап</button><h3>Причины отказа</h3>${reasons}<button type="button" class="btn ghost" data-ca-action="settings:add-reason">Добавить причину</button><p class="field-error" id="ca-settings-error" hidden></p><button type="button" class="btn primary" data-ca-action="settings:save">Сохранить</button></section>`;
}

function renderPurchaseInline(purchaseId) {
  const purchase = walletPurchases[purchaseId];
  if (!purchase) return `<p class="notice">Покупка не найдена.</p>`;
  return `<section class="panel stack ca-purchase"><h2 class="ca-inpage-title">Покупка в кошельке</h2><div class="ca-kv"><span>ID</span><strong>${esc(purchaseId)}</strong></div><div class="ca-kv"><span>Оплата</span><strong>${esc(purchase.purchasePaymentLabel)}</strong></div><div class="ca-kv"><span>Сумма</span><strong>${esc(purchase.amountLabel)}</strong></div>${purchase.rewardStatusLabel ? `<div class="ca-kv"><span>Вознаграждение</span><strong>${esc(purchase.rewardStatusLabel)}</strong></div>` : ""}<a class="btn primary" href="./partner-wallet-history.html">История кошелька</a><p class="small muted">Демо. Подробный разбор — в макете истории кошелька.</p></section>`;
}

function applyStageChangeCabinet(appealId, stageId, fromRefusal, config, hooks) {
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal || !stageId) return;
  const guard = canTransitionTo(appeal, stageId);
  const s = ws(config.key);
  if (!guard.ok) {
    hooks.notify?.(guard.msg, "error");
    return;
  }
  if (!fromRefusal && needsReview(stageId)) {
    s.inlineReview = { appealId, stageId };
    hooks.refresh();
    return;
  }
  commitStageChange(appeal, stageId, fromRefusal ? { reason: appeal.refusedReason } : null);
  s.inlineReview = null;
  hooks.notify?.("Статус обновлён");
  hooks.refresh();
}

function submitReviewCabinet(ev, config, hooks) {
  ev.preventDefault();
  const s = ws(config.key);
  const pr = s.inlineReview;
  if (!pr) return;
  const appeal = appeals.find((a) => a.id === pr.appealId);
  const form = ev.target;
  const dateInput = form.querySelector('[name="review-date"]');
  const amountInput = form.querySelector('[name="review-amount"]');
  const err = form.querySelector("#ca-review-error") || form.parentElement?.querySelector("#ca-review-error");
  if (!appeal || !dateInput?.value) {
    if (err) { err.hidden = false; err.textContent = "Укажите дату."; }
    return;
  }
  const iso = new Date(dateInput.value + "T12:00:00").toISOString();
  const eventMs = dateOnlyMs(iso);
  const todayMs = dateOnlyMs(new Date().toISOString());
  if (eventMs > todayMs) {
    if (err) { err.hidden = false; err.textContent = "Дата не может быть в будущем."; }
    return;
  }
  if (eventMs < dateOnlyMs(appeal.createdAt)) {
    if (err) { err.hidden = false; err.textContent = "Дата не может быть раньше создания обращения."; }
    return;
  }
  let extra = null;
  if (pr.stageId === SYSTEM.PAID) {
    let amount = null;
    if (amountInput?.value.trim()) {
      amount = Number(amountInput.value);
      if (!Number.isFinite(amount) || amount < 0) {
        if (err) { err.hidden = false; err.textContent = "Сумма должна быть неотрицательной."; }
        return;
      }
    }
    extra = { paidAt: iso, amount };
  } else if (pr.stageId === SYSTEM.SHIPPED) extra = { shippedAt: iso };
  else if (pr.stageId === SYSTEM.RETURN) extra = { returnedAt: iso };
  commitStageChange(appeal, pr.stageId, extra);
  s.inlineReview = null;
  hooks.notify?.("Подтверждено");
  hooks.refresh();
}

function runScanPage(config, hooks) {
  const root = document.querySelector("[data-ca-root]");
  const outcome = root?.querySelector('input[name="ca-scan-outcome"]:checked')?.value || "new";
  const err = root?.querySelector("[data-ca-scan-error]");
  if (outcome === "invalid") {
    if (err) { err.hidden = false; err.textContent = "Сертификат недействителен или срок истёк. Обращение не создано."; }
    return;
  }
  if (outcome === "repeat") {
    const existing = findActiveAppeal("DEMO-CERT-1999", RECEIVING.id);
    if (existing) {
      const s = ws(config.key);
      s.selectedId = existing.id;
      s.view = "detail";
      hooks.refresh();
      return;
    }
    if (err) { err.hidden = false; err.textContent = "Нет активного обращения по этому сертификату (демо)."; }
    return;
  }
  const tpl = CERT_TEMPLATES["DEMO-CERT-2048"];
  if (!certStillValid(tpl.certValidUntil)) {
    if (err) { err.hidden = false; err.textContent = "Сертификат недействителен или срок истёк."; }
    return;
  }
  if (findActiveAppeal(tpl.certificateId, RECEIVING.id)) {
    if (err) { err.hidden = false; err.textContent = "Уже есть активное обращение по этому сертификату."; }
    return;
  }
  appealIdSeq += 1;
  const id = `DEMO-REQ-${appealIdSeq}`;
  const now = new Date().toISOString();
  appeals.unshift({
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
  });
  const s = ws(config.key);
  s.selectedId = id;
  s.view = "detail";
  hooks.notify?.("Обращение создано");
  hooks.refresh();
}

function submitManualPage(ev, config, hooks) {
  const form = ev.target;
  const name = form.name?.value?.trim();
  const err = form.querySelector("#ca-manual-error");
  if (!name) {
    if (err) { err.hidden = false; err.textContent = "Укажите имя или название компании."; }
    return;
  }
  appealIdSeq += 1;
  const id = `DEMO-REQ-${appealIdSeq}`;
  const now = new Date().toISOString();
  appeals.unshift({
    id,
    clientName: name,
    certificateId: null,
    receivingPartnerId: RECEIVING.id,
    referrerPartnerId: null,
    manualEntry: true,
    discountPercent: null,
    certValidUntil: null,
    interest: form.interest?.value?.trim() || "",
    clientCity: RECEIVING.city,
    budgetHint: "",
    stageId: SYSTEM.NEW,
    refusedReason: null,
    shippedAt: null,
    paidAmount: null,
    paidAt: null,
    privateNotes: "",
    sourceKey: form.source?.value || "phone",
    clientContact: form.contact?.value?.trim() || null,
    purchaseId: null,
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, author: "Менеджер", text: "Создано вручную без сертификата" }],
  });
  const s = ws(config.key);
  s.selectedId = id;
  s.view = "detail";
  hooks.notify?.("Обращение создано");
  hooks.refresh();
}

export function resetClientAppealsNav(config) {
  const s = ws(config.key);
  s.view = "list";
  s.selectedId = null;
  s.purchaseViewId = null;
  s.inlineReview = null;
  s.showRefusal = null;
}

export function primeClientAppealsView(config, view) {
  const s = ws(config.key);
  s.view = view;
  if (view === "list") resetClientAppealsNav(config);
  s.selectedId = null;
}

export function hydrateClientAppeals(hooks) {
  cabinetHooks = hooks;
  const config = hooks.config();
  const root = document.querySelector("[data-ca-root]");
  if (!root) return;
  ensureSeed(config);
  const s = ws(config.key);
  activeTab = s.tab;
  const statusEl = root.querySelector('[data-ca-input="status"]');
  if (statusEl) {
    statusEl.innerHTML = allStatusOptions().map((o) => `<option>${esc(o)}</option>`).join("");
    statusEl.value = s.listStatus;
  }
  const sourceEl = root.querySelector('[data-ca-input="source"]');
  if (sourceEl) {
    sourceEl.innerHTML = LIST_SOURCE_FILTER.map((o) => `<option value="${esc(o.key)}">${esc(o.label)}</option>`).join("");
    sourceEl.value = s.listSource;
  }
  if (root.dataset.caBound === "1") return;
  root.dataset.caBound = "1";
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ca-action]");
    if (!btn || !root.contains(btn)) return;
  const action = btn.getAttribute("data-ca-action");
    handleCaAction(action, config, hooks);
  });
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (!root.contains(t)) return;
    if (t.matches('[data-ca-input="q"]')) { s.listQ = t.value; hooks.refresh(); }
    if (t.matches('[data-ca-input="status"]')) { s.listStatus = t.value; hooks.refresh(); }
    if (t.matches('[data-ca-input="source"]')) { s.listSource = t.value; hooks.refresh(); }
    if (t.matches('[data-ca-input="funnel-from"]')) { s.funnelFrom = t.value; hooks.refresh(); }
    if (t.matches('[data-ca-input="funnel-to"]')) { s.funnelTo = t.value; hooks.refresh(); }
  });
  root.addEventListener("submit", (ev) => {
    if (ev.target?.id === "ca-manual-form") { ev.preventDefault(); submitManualPage(ev, config, hooks); }
    if (ev.target?.id === "ca-review-form") { submitReviewCabinet(ev, config, hooks); }
    if (ev.target?.id === "ca-refusal-form") {
      ev.preventDefault();
      const appeal = appeals.find((a) => a.id === s.selectedId);
      const reason = ev.target.reason?.value;
      if (!reason) return;
      appeal.refusedReason = reason;
      appeal.stageId = SYSTEM.REFUSED;
      const note = ev.target.comment?.value?.trim();
      pushHistory(appeal, note ? `Отказ: ${note}` : "Отказ", reason);
      s.showRefusal = null;
      afterDataChange();
      hooks.notify?.("Отказ зафиксирован");
      hooks.refresh();
    }
  });
}

function handleCaAction(action, config, hooks) {
  const s = ws(config.key);
  if (action.startsWith("nav:")) {
    const v = action.split(":")[1];
    if (v === "detail") s.view = "detail";
    else s.view = v;
    if (v === "list") { s.selectedId = null; s.purchaseViewId = null; s.inlineReview = null; }
    hooks.refresh();
    return;
  }
  if (action.startsWith("tab:")) { s.tab = action.split(":")[1]; activeTab = s.tab; hooks.refresh(); return; }
  if (action.startsWith("open:")) {
    s.selectedId = action.split(":")[1];
    activeTab = s.tab;
    s.view = "detail";
    hooks.refresh();
    return;
  }
  if (action.startsWith("detail-tab:")) { s.detailTab = action.split(":")[1]; hooks.refresh(); return; }
  if (action.startsWith("purchase:")) {
    s.purchaseViewId = action.split(":")[1];
    s.view = "purchase";
    hooks.refresh();
    return;
  }
  if (action === "scan:submit") { runScanPage(config, hooks); return; }
  if (action.startsWith("stage:next:")) {
    applyStageChangeCabinet(s.selectedId, action.split(":").slice(2).join(":"), false, config, hooks);
    return;
  }
  if (action === "stage:apply") {
    const pick = document.querySelector("[data-ca-input=detail-status]");
    if (pick?.value) applyStageChangeCabinet(s.selectedId, pick.value, false, config, hooks);
    return;
  }
  if (action === "refusal:open") { s.showRefusal = s.selectedId; hooks.refresh(); return; }
  if (action === "refusal:cancel") { s.showRefusal = null; hooks.refresh(); return; }
  if (action === "review:cancel") { s.inlineReview = null; hooks.refresh(); return; }
  if (action === "notes:save") {
    const appeal = appeals.find((a) => a.id === s.selectedId);
    const notes = document.querySelector("[data-ca-input=detail-notes]");
    if (appeal && notes) {
      appeal.privateNotes = notes.value.slice(0, 2000);
      pushHistory(appeal, "Обновлена служебная заметка");
      hooks.notify?.("Заметка сохранена");
      hooks.refresh();
    }
    return;
  }
  if (action === "settings:add-stage") {
    syncSettingsDraftFromWorkspace(s);
    s.settingsDraft.workingStages.push({ id: `ws_custom_${Date.now()}`, label: "" });
    hooks.refresh();
    return;
  }
  if (action === "settings:add-reason") {
    syncSettingsDraftFromWorkspace(s);
    s.settingsDraft.refusalReasons.push("");
    hooks.refresh();
    return;
  }
  if (action.startsWith("settings:archive:")) {
    syncSettingsDraftFromWorkspace(s);
    const idx = Number(action.split(":")[2]);
    const removed = s.settingsDraft.workingStages.splice(idx, 1)[0];
    if (removed) s.settingsDraft.archivedStages.push(removed);
    hooks.refresh();
    return;
  }
  if (action === "settings:save") {
    syncSettingsDraftFromWorkspace(s);
    const labels = [...document.querySelectorAll(".stage-label")].map((i) => i.value.trim()).filter(Boolean);
    const reasons = [...document.querySelectorAll(".reason-label")].map((i) => i.value.trim()).filter(Boolean);
    if (labels.length !== s.settingsDraft.workingStages.length || reasons.length !== s.settingsDraft.refusalReasons.length) {
      hooks.notify?.("Заполните все поля без дубликатов", "error");
      return;
    }
    s.settingsDraft.workingStages.forEach((st, i) => { st.label = labels[i]; });
    s.settingsDraft.refusalReasons = reasons;
    partnerSettings[RECEIVING.id] = s.settingsDraft;
    hooks.notify?.("Настройки сохранены");
    s.view = "list";
    hooks.refresh();
  }
}

function syncSettingsDraftFromWorkspace(s) {
  if (!s.settingsDraft) return;
  document.querySelectorAll(".stage-label").forEach((input, i) => {
    if (s.settingsDraft.workingStages[i]) s.settingsDraft.workingStages[i].label = input.value;
  });
  document.querySelectorAll(".reason-label").forEach((input, i) => {
    if (s.settingsDraft.refusalReasons[i] != null) s.settingsDraft.refusalReasons[i] = input.value;
  });
}

export function openClientAppealFromLegacy(id, hooks, clientName) {
  const config = hooks.config();
  ensureSeed(config);
  const s = ws(config.key);
  const byId = appeals.find((a) => a.id === id);
  const byName = clientName ? appeals.find((a) => a.clientName === clientName) : appeals.find((a) => a.clientName === id);
  const appealId = byId?.id || byName?.id;
  if (appealId) {
    s.view = "detail";
    s.selectedId = appealId;
    hooks.refresh();
    return;
  }
  s.view = "list";
  hooks.refresh();
}
