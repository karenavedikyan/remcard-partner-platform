/* Клиенты и обращения в кабинете партнёра. Демо, in-memory. Без диалогов — только страницы. */
import { emptyDatasetOn } from "./empty-states.js?v=es2";
import { upsertPaidPurchaseLedger, clearClientPurchaseLedger } from "./client-purchase-ledger.js";


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

  const AMOUNT_MAX_KOPECKS = BigInt(Number.MAX_SAFE_INTEGER);
  let appealsRenderConfig = null;

  function dedupeCaseInsensitiveStrings(list) {
    const out = [];
    const seen = new Set();
    list.forEach((item) => {
      const t = String(item || "").trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    });
    return out;
  }

  function partnerSettingsMerged(partnerId) {
    const base = partnerSettings[partnerId];
    if (!base) return null;
    if (!appealsRenderConfig) return base;
    const w = ws(appealsRenderConfig.key);
    const local = w.partnerSettingsLocal;
    const seed = local
      ? JSON.parse(JSON.stringify(local))
      : {
          workingStages: [...(base.workingStages || [])],
          refusalReasons: [...(base.refusalReasons || [])],
          archivedStages: [...(base.archivedStages || [])],
        };
    const ov = w.partnerOverlay;
    if (!ov) return seed;
    return {
      ...seed,
      refusalReasons: dedupeCaseInsensitiveStrings([...(seed.refusalReasons || []), ...(ov.refusalReasons || [])]),
      workingStages: [...(seed.workingStages || []), ...(ov.workingStages || [])],
      archivedStages: seed.archivedStages || [],
    };
  }

  function formatRubInputFromKopecks(kopecks) {
    if (!Number.isSafeInteger(kopecks)) return "";
    const rub = Math.trunc(kopecks / 100);
    const frac = kopecks % 100;
    return frac === 0 ? String(rub) : `${rub},${String(frac).padStart(2, "0")}`;
  }

  function paidKopecksForAppeal(appeal) {
    if (appeal.purchaseBreakdown?.totalKopecks != null) return appeal.purchaseBreakdown.totalKopecks;
    if (appeal.paidAmountKopecks != null) return appeal.paidAmountKopecks;
    if (appeal.paidAmount != null) return appeal.paidAmount * 100;
    return null;
  }

  function paidLabelForAppeal(appeal) {
    const k = paidKopecksForAppeal(appeal);
    return k == null ? null : formatRubFromKopecks(k);
  }

  function parseAmountKopecks(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return { ok: true, empty: true, kopecks: 0 };
    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false, empty: false, kopecks: 0, reason: "invalid" };
    const [intPart, fracPart = ""] = normalized.split(".");
    const fracPadded = (fracPart + "00").slice(0, 2);
    let kopecksBi;
    try {
      kopecksBi = BigInt(intPart) * 100n + BigInt(fracPadded);
    } catch {
      return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    }
    if (kopecksBi > AMOUNT_MAX_KOPECKS || kopecksBi < 0n) return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    const kopecks = Number(kopecksBi);
    if (!Number.isSafeInteger(kopecks)) return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    return { ok: true, empty: false, kopecks };
  }

  function parseDelayDays(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return { ok: false, empty: true, days: 0, reason: "empty" };
    if (!/^\d+$/.test(trimmed)) return { ok: false, empty: false, days: 0, reason: "invalid" };
    const days = Number(trimmed);
    if (!Number.isSafeInteger(days) || days < 0 || days > 36500) return { ok: false, empty: false, days: 0, reason: "range" };
    return { ok: true, empty: false, days };
  }

  function formatRubFromKopecks(kopecks) {
    if (!Number.isSafeInteger(kopecks)) return "—";
    const rub = Math.trunc(kopecks / 100);
    const frac = kopecks % 100;
    const rubStr = rub.toLocaleString("ru-RU");
    return frac === 0 ? `${rubStr} ₽` : `${rubStr},${String(frac).padStart(2, "0")} ₽`;
  }

  function formatDaysRu(days) {
    const n = Math.abs(days);
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${days} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${days} дня`;
    return `${days} дней`;
  }

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

  let appealIdSeq = 1100;
  let activeTab = "incoming";

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
    const base = MANUAL_CHANNEL_OPTIONS.find((s) => s.key === key)?.label;
    if (base) return base;
    for (const [, w] of workspaces) {
      const custom = w.partnerOverlay?.manualChannels?.find((c) => c.key === key);
      if (custom) return custom.label;
    }
    return null;
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
    return filterAppeals(mode, configKey, { lifecycle: "none" }).filter((a) => {
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
    const paidLabel = paidLabelForAppeal(appeal);
    const amount = paidLabel || "сумма в демо не зафиксирована";
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
      pushLedgerFromAppeal(appeal, wallet);
      return wallet;
    }

    if (shipped || appeal.stageId === SYSTEM.SHIPPED) {
      wallet.purchaseFulfillmentLabel = WALLET_VOCAB.fulfilled;
      if (canAccrueReferral(appeal) && appeal.shippedAt) {
        if (appeal.purchaseBreakdown?.rows?.length) {
          appeal.purchaseBreakdown.rows.forEach((r) => {
            if (!r.lineShippedAt) r.lineShippedAt = appeal.shippedAt;
          });
          wallet.categoryBreakdown = appeal.purchaseBreakdown;
          wallet.rewardStatusLabel = aggregateRewardLabel(appeal) || WALLET_VOCAB.rewardPending;
          wallet.rewardDetailLabel = WALLET_VOCAB.pendingAmount;
          const waitingRows = appeal.purchaseBreakdown.rows
            .map((row) => ({ row, snap: rowAccrualSnapshot(row, appeal) }))
            .filter((x) => x.snap?.phase === "waiting");
          if (waitingRows.length) {
            const lefts = waitingRows.map((x) => x.snap.daysLeft ?? 0);
            wallet.waitDaysLeft = Math.max(...lefts);
          } else {
            wallet.waitDaysLeft = 0;
          }
        } else {
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
      }
      pushLedgerFromAppeal(appeal, wallet);
      return wallet;
    }

    if (paidOnly || appeal.stageId === SYSTEM.PAID || appeal.paidAt) {
      wallet.purchaseFulfillmentLabel = WALLET_VOCAB.awaitFulfillment;
    }
    pushLedgerFromAppeal(appeal, wallet);
    return wallet;
  }

  function ledgerFulfillmentPhase(appeal, wallet) {
    if (appeal.stageId === SYSTEM.RETURN) return "return";
    if (appeal.shippedAt || appeal.stageId === SYSTEM.SHIPPED) {
      if (canAccrueReferral(appeal) && !isManualAppeal(appeal) && (wallet.waitDaysLeft ?? 0) > 0) return "accrual_waiting";
      if (canAccrueReferral(appeal) && !isManualAppeal(appeal)) return "accrual_confirmed";
      return "fulfilled";
    }
    return "await_handoff";
  }

  function receiverLedgerStatus(appeal, wallet) {
    if (isManualAppeal(appeal)) {
      const tail = wallet.purchaseFulfillmentLabel;
      return tail && tail !== WALLET_VOCAB.purchasePaid ? `Покупка без реферального начисления · ${tail}` : "Покупка без реферального начисления";
    }
    if (appeal.stageId === SYSTEM.RETURN) return wallet.purchaseFulfillmentLabel || WALLET_VOCAB.fullReturn;
    if (appeal.shippedAt || appeal.stageId === SYSTEM.SHIPPED) {
      const base = wallet.purchaseFulfillmentLabel || WALLET_VOCAB.fulfilled;
      if (canAccrueReferral(appeal)) {
        const reward = wallet.rewardStatusLabel;
        const wait =
          wallet.waitDaysLeft != null && wallet.waitDaysLeft > 0
            ? ` · осталось ${wallet.waitDaysLeft} дн. до подтверждения начисления`
            : "";
        return reward ? `${base} · ${reward}${wait}` : base;
      }
      return base;
    }
    return "Оплачено · ожидает передачи";
  }

  function referrerLedgerStatus(appeal, wallet) {
    if (!canAccrueReferral(appeal)) return null;
    if (appeal.stageId === SYSTEM.RETURN) return `${WALLET_VOCAB.fullReturn} · ${WALLET_VOCAB.rewardReview}`;
    if (!appeal.shippedAt && appeal.stageId !== SYSTEM.SHIPPED) return "Покупка оплачена · начисление ожидает передачи";
    const reward = wallet.rewardStatusLabel || WALLET_VOCAB.rewardPending;
    if ((wallet.waitDaysLeft ?? 0) > 0) return `${reward} · осталось ${wallet.waitDaysLeft} дн.`;
    return reward || WALLET_VOCAB.confirmedCalc;
  }

  function ledgerCategoryRows(appeal) {
    if (!appeal.purchaseBreakdown?.rows?.length) return [];
    const referral = canAccrueReferral(appeal) && !isManualAppeal(appeal);
    const afterReturn = referral && appeal.stageId === SYSTEM.RETURN;
    return appeal.purchaseBreakdown.rows.map((r) => {
      const delayTotal = r.accrualDelayDays ?? (referral ? WAIT_DAYS : null);
      if (afterReturn) {
        return {
          categoryKey: r.categoryKey,
          categoryLabel: r.categoryLabel,
          amountLabel: formatRubFromKopecks(r.amountKopecks),
          delayDays: delayTotal,
          accrualPhase: "return",
          accrualStateText: WALLET_VOCAB.rewardReview,
          daysLeft: null,
          delayTotal,
        };
      }
      const snap = referral ? rowAccrualSnapshot(r, appeal) : null;
      return {
        categoryKey: r.categoryKey,
        categoryLabel: r.categoryLabel,
        amountLabel: formatRubFromKopecks(r.amountKopecks),
        delayDays: delayTotal,
        accrualPhase: referral ? snap?.phase || "handoff" : "n/a",
        accrualStateText: referral ? snap?.text || "ожидает передачи" : "",
        daysLeft: snap?.daysLeft ?? null,
        delayTotal: snap?.delayDays ?? delayTotal,
      };
    });
  }

  function pushLedgerFromAppeal(appeal, wallet) {
    if (!appeal.ledgerRecorded || !appeal.paidAt || !appeal.purchaseId) return;
    upsertPaidPurchaseLedger({
      purchaseId: appeal.purchaseId,
      appealId: appeal.id,
      clientName: appeal.clientName,
      certificateId: isManualAppeal(appeal) ? null : appeal.certificateId || null,
      receivingPartnerId: appeal.receivingPartnerId,
      referrerPartnerId: appeal.referrerPartnerId || null,
      referralEligible: canAccrueReferral(appeal),
      manualEntry: isManualAppeal(appeal),
      paidAt: appeal.paidAt,
      totalRub: wallet.amountLabel,
      totalKopecks: appeal.paidAmountKopecks,
      receivingPartnerName: PARTNERS[appeal.receivingPartnerId]?.name || "—",
      receiverStatus: receiverLedgerStatus(appeal, wallet),
      referrerStatus: referrerLedgerStatus(appeal, wallet),
      rewardStatusLabel: canAccrueReferral(appeal) ? wallet.rewardStatusLabel || null : null,
      waitDaysLeft: canAccrueReferral(appeal) ? wallet.waitDaysLeft ?? null : null,
      fulfillmentPhase: ledgerFulfillmentPhase(appeal, wallet),
      categoryRows: ledgerCategoryRows(appeal),
    });
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
    const settings = appealsRenderConfig ? partnerSettingsMerged(partnerId) : partnerSettings[partnerId];
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
    const settings = appealsRenderConfig ? partnerSettingsMerged(partnerId) : partnerSettings[partnerId];
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
      text: "Оплачено · покупка появилась в кошельке",
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



  function matchesSourceFilter(appeal, sourceKey) {
    if (sourceKey === "all") return true;
    if (sourceKey === "manual") return isManualAppeal(appeal);
    if (sourceKey === "cert") return hasCertificateFlow(appeal);
    return true;
  }

  function appealLifecycle(appeal, workspaceKey) {
    if (!appeal.workspaceLifecycle) appeal.workspaceLifecycle = {};
    if (!appeal.workspaceLifecycle[workspaceKey]) appeal.workspaceLifecycle[workspaceKey] = {};
    return appeal.workspaceLifecycle[workspaceKey];
  }

  function appealInBucket(appeal, workspaceKey, bucket) {
    const lc = appeal.workspaceLifecycle?.[workspaceKey];
    const archived = Boolean(lc?.archivedAt);
    const deleted = Boolean(lc?.deletedAt);
    if (bucket === "trash") return deleted;
    if (bucket === "archive") return archived && !deleted;
    return !archived && !deleted;
  }

  function clearBulkSelection(s) {
    s.bulkSelectedIds = [];
    s.bulkPanel = null;
    s.bulkConfirm = null;
  }

  function isAppealLockedForBulkStage(appeal) {
    if (appeal.stageId === SYSTEM.REFUSED || appeal.stageId === SYSTEM.RETURN) return true;
    if (isFinancialStage(appeal.stageId)) return true;
    if (appealHasPaidPurchase(appeal) || appeal.paidAt || appeal.shippedAt || appeal.returnedAt) return true;
    return false;
  }

  function bulkWorkingStageOptions(partnerId) {
    return pipelineFor(partnerId).filter((id) => !isFinancialStage(id) && id !== SYSTEM.REFUSED);
  }

  function bulkSelectedAppeals(s) {
    return (s.bulkSelectedIds || [])
      .map((id) => appeals.find((a) => a.id === id))
      .filter(Boolean);
  }

  function bulkStageEditBlocked(selection) {
    return selection.some((a) => isAppealLockedForBulkStage(a));
  }

  function canBulkIncomingMutate(config) {
    return !config.readOnly && roleCaps(config.role).incoming;
  }

  function filterAppeals(mode, configKey, opts = {}) {
    const lifecycle = opts.lifecycle ?? (mode === "incoming" && configKey ? "bucket" : "none");
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
    if (lifecycle === "bucket" && configKey && mode === "incoming") {
      const bucket = s?.listBucket || "active";
      list = list.filter((a) => appealInBucket(a, configKey, bucket));
    } else if (lifecycle === "active-only" && configKey && mode === "incoming") {
      list = list.filter((a) => appealInBucket(a, configKey, "active"));
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







  function needsReview(stageId) {
    return stageId === SYSTEM.PAID || stageId === SYSTEM.SHIPPED || stageId === SYSTEM.RETURN;
  }


  function commitStageChange(appeal, stageId, extra) {
    const label = systemLabel(stageId) || getWorkingStage(appeal.receivingPartnerId, stageId)?.label || stageId;
    appeal.stageId = stageId;
    if (stageId === SYSTEM.SHIPPED) {
      if (extra?.shippedAt) appeal.shippedAt = extra.shippedAt;
      else if (!appeal.shippedAt) appeal.shippedAt = todayIsoDate();
    }
    if (stageId === SYSTEM.SHIPPED && appeal.purchaseBreakdown?.rows) {
      appeal.purchaseBreakdown.rows.forEach((r) => {
        if (!r.lineShippedAt) r.lineShippedAt = appeal.shippedAt;
      });
      const wallet = ensureWalletPurchase(appeal);
      wallet.categoryBreakdown = appeal.purchaseBreakdown;
    }
  if (stageId === SYSTEM.RETURN && extra?.returnedAt) {
      appeal.returnedAt = extra.returnedAt;
    }
    const walletExisted = Boolean(appeal.purchaseId);
    if (stageId === SYSTEM.PAID) {
      if (!appeal.paidAt && extra?.paidAt) appeal.paidAt = extra.paidAt;
      if (extra?.paidAmountKopecks != null) appeal.paidAmountKopecks = extra.paidAmountKopecks;
      else if (appeal.paidAmountKopecks == null && appeal.paidAmount == null && extra?.amount != null) appeal.paidAmount = extra.amount;
      if (extra?.paidHistoryLine) {
        ensureWalletPurchase(appeal);
        pushHistory(appeal, extra.paidHistoryLine);
      } else if (!walletExisted) {
        ensureWalletPurchase(appeal);
        if (!extra?.skipPaidHistory) {
          pushHistory(appeal, `Оплачено · покупка появилась в кошельке (${appeal.purchaseId})`);
        }
      } else if (!extra?.skipPaidHistory) {
        pushHistory(appeal, `Статус обращения: ${label} (покупка ${appeal.purchaseId} без изменений)`);
      }
    }
    syncWalletFromAppeal(appeal);
    if (stageId === SYSTEM.REFUSED && extra?.reason) {
      appeal.refusedReason = extra.reason;
      const note = extra.note?.trim();
      pushHistory(appeal, note ? `Отказ: ${note}` : "Отказ", extra.reason);
    } else if (stageId !== SYSTEM.PAID) {
      pushHistory(appeal, `Статус: ${label}`);
    }
    afterDataChange();
  }
























function stagePillClass(appeal) {
  if (appeal.stageId === SYSTEM.REFUSED) return "ca-pill--danger";
  if (appeal.stageId === SYSTEM.RETURN) return "ca-pill--warn";
  if (appeal.stageId === SYSTEM.PAID) return "ca-pill--good";
  if (appeal.stageId === SYSTEM.SHIPPED) return "ca-pill--good";
  if (appeal.stageId === SYSTEM.NEW) return "";
  if (isFinancialStage(appeal.stageId)) return "ca-pill--good";
  return "ca-pill--info";
}

function pillHtml(appeal) {
  return `<span class="pill ${stagePillClass(appeal)}">${esc(stageLabel(appeal))}</span>`;
}

function rowMetaSource(appeal, tab) {
  if (tab === "outgoing") {
    const name = PARTNERS[appeal.receivingPartnerId]?.name || "—";
    return `Принимает: ${name}`;
  }
  if (isManualAppeal(appeal)) return "Добавлен вручную";
  const ref = PARTNERS[appeal.referrerPartnerId]?.name;
  return ref ? `Направил: ${ref}` : "По сертификату";
}

function listKpis(config, tab) {
  const list = filterAppeals(tab, config.key, { lifecycle: "none" });
  const total = list.length;
  const inWork = list.filter((a) => isActiveAppeal(a)).length;
  const paid = list.filter((a) => appealReachedPaid(a)).length;
  const shipped = list.filter((a) => appealReachedShipped(a)).length;
  const conv = safePct(paid, total);
  return { total, inWork, paid, shipped, conv };
}

function applyFunnelPreset(s, preset) {
  s.funnelPreset = preset;
  const end = todayYmd();
  s.funnelTo = end;
  if (preset === "30") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    s.funnelFrom = d.toISOString().slice(0, 10);
  } else if (preset === "90") {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    s.funnelFrom = d.toISOString().slice(0, 10);
  } else {
    s.funnelFrom = "2020-01-01";
  }
}

function refusalReasonsFor(config, partnerId) {
  return dedupeCaseInsensitiveStrings([
    ...(partnerSettings[partnerId]?.refusalReasons || []),
    ...(ws(config.key).partnerOverlay?.refusalReasons || []),
  ]);
}

function profilePayCategories(config) {
  const profile = config.profile?.();
  if (!profile?.dict) return [];
  const { dict } = profile;
  const role = config.role;
  const productIds = role === "specialist" ? [] : [...(profile.products || [])];
  const serviceIds = [...(profile.services || [])];
  const out = [];
  productIds.forEach((id) => {
    const item = dict.products?.find((x) => x.id === id);
    out.push({
      key: `products:${id}`,
      id,
      group: "products",
      label: item?.label || id,
      kind: "goods",
      inProfile: Boolean(item),
    });
  });
  serviceIds.forEach((id) => {
    const item = dict.services?.find((x) => x.id === id);
    out.push({
      key: `services:${id}`,
      id,
      group: "services",
      label: item?.label || id,
      kind: "service",
      inProfile: Boolean(item),
    });
  });
  return out;
}

function payCategoriesFor(config) {
  return profilePayCategories(config);
}

function renderPayCategoryOptions(cats, selectedKey) {
  const config = appealsRenderConfig;
  const normalized =
    selectedKey && config ? normalizeRowCategoryKey(selectedKey, config) : selectedKey || "";
  const hasPick = normalized && cats.some((c) => c.key === normalized);
  const option = (c) =>
    `<option value="${esc(c.key)}" ${hasPick && normalized === c.key ? "selected" : ""}>${esc(c.label)}</option>`;
  const goods = cats.filter((c) => c.group === "products");
  const services = cats.filter((c) => c.group === "services");
  const placeholder = `<option value="" ${!hasPick ? "selected" : ""} disabled hidden>Выберите категорию</option>`;
  let html = "";
  if (goods.length) html += `<optgroup label="Товары">${goods.map(option).join("")}</optgroup>`;
  if (services.length) html += `<optgroup label="Услуги">${services.map(option).join("")}</optgroup>`;
  if (!html) return placeholder + cats.map(option).join("");
  return placeholder + html;
}

function findPayCategory(config, key) {
  return payCategoriesFor(config).find((c) => c.key === key);
}

function payAccrualMode(appeal) {
  if (isManualAppeal(appeal)) return "manual";
  if (!canAccrueReferral(appeal)) return "no-referrer";
  return "accrual";
}

function accrualHintForKind(kind) {
  return kind === "service" ? "После принятия работ" : "После передачи товара";
}

function normalizeRowCategoryKey(key, config) {
  if (!key) return key;
  if (String(key).includes(":")) return key;
  const cats = payCategoriesFor(config);
  const prod = cats.find((c) => c.group === "products" && c.id === key);
  if (prod) return prod.key;
  const svc = cats.find((c) => c.group === "services" && c.id === key);
  return svc?.key || key;
}

function manualChannelsFor(config) {
  const custom = ws(config.key).partnerOverlay?.manualChannels || [];
  return [...MANUAL_CHANNEL_OPTIONS, ...custom];
}

function normalizeLabelKey(label) {
  return `custom_${label.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "_").slice(0, 40)}_${Date.now().toString(36)}`;
}

function findDuplicateReason(config, partnerId, text) {
  const t = text.trim().toLowerCase();
  return refusalReasonsFor(config, partnerId).find((r) => r.toLowerCase() === t) || null;
}

function addWorkspaceReason(config, text) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Введите причину отказа." };
  const dupe = findDuplicateReason(config, RECEIVING.id, trimmed);
  if (dupe) return { ok: false, error: "Такая причина уже есть.", existing: dupe };
  ws(config.key).partnerOverlay.refusalReasons.push(trimmed);
  return { ok: true, value: trimmed };
}

function addWorkspaceStage(config, label) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Введите название этапа." };
  const merged = partnerSettingsMerged(RECEIVING.id);
  const dupe = [...(merged?.workingStages || [])].find((s) => s.label.toLowerCase() === trimmed.toLowerCase());
  if (dupe) return { ok: false, error: "Такой этап уже есть.", existing: dupe };
  const stage = { id: `ws_custom_${Date.now()}`, label: trimmed };
  ws(config.key).partnerOverlay.workingStages.push(stage);
  return { ok: true, stage };
}

function addWorkspaceChannel(config, label) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Введите название канала." };
  const all = manualChannelsFor(config);
  const dupe = all.find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
  if (dupe) return { ok: false, error: "Такой канал уже есть.", existing: dupe.label, key: dupe.key };
  const entry = { key: normalizeLabelKey(trimmed), label: trimmed };
  ws(config.key).partnerOverlay.manualChannels.push(entry);
  return { ok: true, channel: entry };
}

function syncRefusalDraftFromDom(s) {
  const form = document.getElementById("ca-refusal-form");
  if (!form || !s.refusalDraft) return;
  s.refusalDraft.comment = form.comment?.value ?? s.refusalDraft.comment;
  s.refusalDraft.reason = form.reason?.value ?? s.refusalDraft.reason;
  const custom = form.querySelector('[name="custom-reason"]');
  if (custom) s.refusalDraft.customText = custom.value;
}

function syncStageDraftFromDom(s) {
  const sel = document.querySelector('[data-ca-input="detail-status"]');
  if (sel) s.stageDraft.selectedStageId = sel.value;
  const custom = document.querySelector('[name="custom-stage"]');
  if (custom) s.stageDraft.customText = custom.value;
}

function syncManualDraftFromDom(s) {
  const form = document.getElementById("ca-manual-form");
  if (!form || !s.manualDraft) return;
  s.manualDraft.name = form.name?.value ?? "";
  s.manualDraft.interest = form.interest?.value ?? "";
  s.manualDraft.contact = form.contact?.value ?? "";
  s.manualDraft.source = form.source?.value ?? s.manualDraft.source;
  const custom = form.querySelector('[name="custom-channel"]');
  if (custom) s.manualDraft.customChannelText = custom.value;
}

function defaultPayRow(config) {
  const first = payCategoriesFor(config)[0];
  return {
    rowId: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    categoryKey: first?.key || "",
    amountRaw: "",
    kind: first?.kind || "goods",
    delayDays: "14",
    amountError: "",
    delayError: "",
    categoryError: "",
  };
}

function initPayDraft(config, s, appeal) {
  if (s.payDraft && s.payDraft.appealId === appeal.id) return s.payDraft;
  if (appeal.purchaseBreakdown?.rows?.length) {
    s.payDraft = {
      appealId: appeal.id,
      paidDate: appeal.paidAt ? appeal.paidAt.slice(0, 10) : todayYmd(),
      delayAll: false,
      rows: appeal.purchaseBreakdown.rows.map((r) => {
        const key = normalizeRowCategoryKey(r.categoryKey, config);
        const cat = findPayCategory(config, key);
        return {
          rowId: r.rowId,
          categoryKey: key,
          amountRaw: r.amountKopecks ? formatRubInputFromKopecks(r.amountKopecks) : "",
          kind: cat?.kind || r.kind || "goods",
          delayDays: String(r.accrualDelayDays ?? 14),
          amountError: "",
          delayError: "",
          categoryError: "",
        };
      }),
      formError: "",
    };
    return s.payDraft;
  }
  s.payDraft = { appealId: appeal.id, paidDate: todayYmd(), delayAll: false, rows: [defaultPayRow(config)], formError: "" };
  return s.payDraft;
}

function syncPayDraftFromDom(config, s) {
  const form = document.querySelector(`[data-ca-pay-form="${s.payDraft?.appealId || ""}"]`) || document.getElementById("ca-pay-form") || document.getElementById("ca-review-form");
  if (!form || !s.payDraft) return;
  const date = form.querySelector('[name="review-date"]');
  if (date) s.payDraft.paidDate = date.value;
  const delayAll = form.querySelector('[name="delay-all"]');
  if (delayAll) s.payDraft.delayAll = delayAll.checked;
  s.payDraft.rows.forEach((row, i) => {
    row.amountRaw = form.querySelector(`[name="amount-${i}"]`)?.value ?? row.amountRaw;
    row.categoryKey = form.querySelector(`[name="cat-${i}"]`)?.value ?? row.categoryKey;
    row.delayDays = form.querySelector(`[name="delay-${i}"]`)?.value ?? row.delayDays;
    const cat = findPayCategory(config, row.categoryKey);
    if (cat) row.kind = cat.kind;
  });
  applyPayDelayAllSync(s);
}

function renderPayAccrualBlock(appeal, row, i) {
  const mode = payAccrualMode(appeal);
  if (mode === "manual") {
    return `<div class="ca-pay-accrual ca-pay-accrual--na"><p class="ca-pay-accrual-title"><strong>Не применяется: покупка без сертификата</strong></p><p class="small muted">Начисление по рекомендации и срок активации не задаются — вознаграждение направившему не рассчитывается.</p></div>`;
  }
  if (mode === "no-referrer") {
    return `<div class="ca-pay-accrual ca-pay-accrual--na"><p class="ca-pay-accrual-title"><strong>Не применяется: нет направившего</strong></p><p class="small muted">По этому обращению нет партнёра-направившего — срок активации начисления не задаётся.</p></div>`;
  }
  return `<div class="ca-pay-accrual"><label class="field">Срок активации начисления, дней<input type="text" inputmode="numeric" name="delay-${i}" value="${esc(row.delayDays)}" maxlength="5" autocomplete="off"></label><p class="small muted ca-pay-kind-hint">${esc(accrualHintForKind(row.kind))}</p>${row.delayError ? `<p class="field-error" role="alert">${esc(row.delayError)}</p>` : ""}</div>`;
}

function rowAccrualSnapshot(row, appeal) {
  if (!canAccrueReferral(appeal)) return null;
  const ship = row.lineShippedAt || appeal.shippedAt;
  if (!ship) return { text: "ожидает передачи", phase: "handoff" };
  const delay = row.accrualDelayDays ?? WAIT_DAYS;
  const left = Math.max(0, delay - wholeDaysElapsed(ship, new Date().toISOString()));
  if (left > 0) return { text: `осталось ${left} из ${delay} дней`, phase: "waiting", daysLeft: left, delayDays: delay };
  return { text: "подтверждено", phase: "confirmed" };
}

function categoryCountRu(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} категория`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} категории`;
  return `${n} категорий`;
}

function paidHistoryLineFromPayment(totalKopecks, categoryCount, paidIso) {
  return `Оплачено ${formatRubFromKopecks(totalKopecks)} · ${categoryCountRu(categoryCount)} · ${formatDate(paidIso)}`;
}

function categoryBreakdownDisplay(row, appeal) {
  if (!canAccrueReferral(appeal) || isManualAppeal(appeal)) {
    return {
      accrual: false,
      kindLabel: row.kind === "service" ? "Услуга" : "Товар",
    };
  }
  const delay = row.accrualDelayDays ?? WAIT_DAYS;
  const snap = rowAccrualSnapshot(row, appeal);
  const phase = snap?.phase ?? "handoff";
  const progressPct =
    phase === "waiting" && snap?.delayDays
      ? Math.round(((snap.delayDays - snap.daysLeft) / snap.delayDays) * 100)
      : phase === "confirmed"
        ? 100
        : 0;
  return {
    accrual: true,
    kindLabel: row.kind === "service" ? "Услуга" : "Товар",
    delayDays: delay,
    delaySaved: `Срок: ${formatDaysRu(delay)}`,
    stateText: snap?.text ?? "ожидает передачи",
    phase,
    progressPct: Math.max(0, Math.min(100, progressPct)),
  };
}

function renderPayBreakdownList(appeal, rows) {
  if (!rows?.length) return "";
  return `<ul class="ca-pay-breakdown">${rows
    .map((row) => {
      const meta = categoryBreakdownDisplay(row, appeal);
      const accrualMeta = meta.accrual
        ? `<span class="ca-bd-delay">${esc(meta.delaySaved)}</span><span class="ca-bd-state">${esc(meta.stateText)}</span>`
        : `<span class="ca-bd-state">${esc(meta.kindLabel)}</span>`;
      const kindPart = meta.accrual ? `<span class="ca-bd-kind">${esc(meta.kindLabel)}</span>` : "";
      return `<li class="ca-pay-breakdown-item"><span class="ca-bd-main"><span class="ca-bd-cat">${esc(row.categoryLabel || row.categoryKey)}</span><span class="ca-amount ca-bd-amt">${esc(formatRubFromKopecks(row.amountKopecks))}</span></span><span class="ca-bd-meta small muted">${kindPart}${accrualMeta}</span></li>`;
    })
    .join("")}</ul>`;
}

function aggregateRewardLabel(appeal) {
  const bd = appeal.purchaseBreakdown;
  if (!bd?.rows?.length || !canAccrueReferral(appeal) || !appeal.shippedAt) return null;
  const phases = bd.rows.map((r) => rowAccrualSnapshot(r, appeal)?.phase).filter(Boolean);
  if (!phases.length) return null;
  if (phases.every((p) => p === "confirmed")) return WALLET_VOCAB.rewardConfirmed;
  if (phases.some((p) => p === "confirmed") && phases.some((p) => p === "waiting")) return "Частично подтверждено";
  if (phases.every((p) => p === "handoff")) return WALLET_VOCAB.awaitFulfillment;
  return WALLET_VOCAB.rewardPending;
}

function savePurchaseBreakdown(appeal, rows, totalKopecks, paidIso) {
  appeal.purchaseBreakdown = {
    rows: rows.map((r) => ({ ...r })),
    totalKopecks,
    paidAt: paidIso,
  };
  appeal.paidAmountKopecks = totalKopecks;
  appeal.ledgerRecorded = true;
  const wallet = ensureWalletPurchase(appeal);
  wallet.amountLabel = formatRubFromKopecks(totalKopecks);
  wallet.categoryBreakdown = appeal.purchaseBreakdown;
  return wallet;
}

function payDelaySummaryDays(row) {
  const p = parseDelayDays(row.delayDays);
  return p.ok ? p.days : 14;
}

function applyPayDelayAllSync(s) {
  if (!s.payDraft?.delayAll || !s.payDraft.rows.length) return;
  const first = s.payDraft.rows[0].delayDays;
  s.payDraft.rows.forEach((r, i) => {
    if (i > 0) r.delayDays = first;
  });
}

function applyPayDelayAllToDom(form, s) {
  if (!form || !s.payDraft?.delayAll) return;
  const first = s.payDraft.rows[0]?.delayDays ?? "14";
  s.payDraft.rows.forEach((r, i) => {
    if (i > 0) r.delayDays = first;
    const inp = form.querySelector(`[name="delay-${i}"]`);
    if (inp) inp.value = r.delayDays;
  });
  updatePayFormChromeInPlace(form, s);
}

function updatePayFormChromeInPlace(form, s) {
  if (!form || !s.payDraft) return;
  const totalEl = form.querySelector(".ca-pay-total-val");
  if (totalEl) {
    let sum = 0;
    s.payDraft.rows.forEach((row) => {
      const p = parseAmountKopecks(row.amountRaw);
      if (p.ok && !p.empty) sum += p.kopecks;
    });
    totalEl.textContent = formatRubFromKopecks(sum);
  }
  s.payDraft.rows.forEach((row, i) => {
    const kindHint = form.querySelector(`[data-pay-row="${i}"] .ca-pay-kind-hint`);
    if (kindHint) kindHint.textContent = accrualHintForKind(row.kind);
    const kindBadge = form.querySelector(`[data-pay-row="${i}"] .ca-pay-kind-badge`);
    if (kindBadge) kindBadge.textContent = row.kind === "service" ? "Услуга" : "Товар";
  });
}

function renderPayCategoryForm(config, appeal, formId) {
  const s = ws(config.key);
  const draft = initPayDraft(config, s, appeal);
  const cats = payCategoriesFor(config);
  if (!cats.length) {
    const profileCta = canEditPayProfileCategories(config)
      ? `<button type="button" class="btn ghost" data-ca-action="pay:profile-categories">Настроить категории в профиле</button>`
      : `<p class="small muted">Категории для оплаты задаёт организация в профиле работодателя.</p>`;
    return `<form class="stack ca-pay-form ca-pay-form--empty" id="${esc(formId)}" data-ca-pay-form="${esc(appeal.id)}"><p class="notice">Добавьте категории товаров или услуг в профиле — без них нельзя указать состав оплаты.</p><div class="ca-form-actions">${profileCta}<button type="button" class="btn ghost" data-ca-action="panel:cancel">Отмена</button></div></form>`;
  }
  const profileLink = canEditPayProfileCategories(config)
    ? `<p class="ca-pay-profile-link"><button type="button" class="btn ghost small-btn" data-ca-action="pay:profile-categories">Настроить категории в профиле</button></p>`
    : "";
  const accrualMode = payAccrualMode(appeal);
  const rowsHtml = draft.rows
    .map((row, i) => {
      const opts = renderPayCategoryOptions(cats, row.categoryKey);
      const kindLabel = row.kind === "service" ? "Услуга" : "Товар";
      return `<div class="ca-pay-row panel" data-pay-row="${i}"><div class="ca-pay-row-top"><label class="field">Категория<select name="cat-${i}">${opts}</select><small class="input-hint muted"><span class="ca-pay-kind-badge">${esc(kindLabel)}</span> · из вашего профиля</small></label><button type="button" class="btn ghost icon-btn" data-ca-action="pay:remove-row:${i}" ${draft.rows.length < 2 ? "disabled" : ""} aria-label="Удалить">×</button></div>${row.categoryError ? `<p class="field-error" role="alert">${esc(row.categoryError)}</p>` : ""}<label class="field">Оплаченная сумма, ₽<input name="amount-${i}" inputmode="decimal" value="${esc(row.amountRaw)}" placeholder="0"></label>${row.amountError ? `<p class="field-error" role="alert">${esc(row.amountError)}</p>` : ""}${renderPayAccrualBlock(appeal, row, i)}</div>`;
    })
    .join("");
  const delayAll =
    accrualMode === "accrual" && draft.rows.length > 1
      ? `<label class="check"><input type="checkbox" name="delay-all" ${draft.delayAll ? "checked" : ""} data-ca-action="pay:delay-all-toggle"> Этот срок для всех категорий</label>`
      : "";
  const totalPreview = draft.rows.reduce((sum, r) => {
    const p = parseAmountKopecks(r.amountRaw);
    return sum + (p.ok && !p.empty ? p.kopecks : 0);
  }, 0);
  return `<form class="stack ca-pay-form" id="${esc(formId)}" data-ca-pay-form="${esc(appeal.id)}"><p class="small muted">Сумма покупки — по направлениям из вашего профиля.</p>${profileLink}${rowsHtml}<button type="button" class="btn ghost small-btn" data-ca-action="pay:add-row">+ Добавить категорию</button>${delayAll}<p class="ca-pay-total">Итого: <strong class="ca-pay-total-val">${esc(formatRubFromKopecks(totalPreview))}</strong></p><label class="field">Дата оплаты<input type="date" name="review-date" max="${todayYmd()}" value="${esc(draft.paidDate)}" required></label>${draft.formError ? `<p class="field-error" role="alert">${esc(draft.formError)}</p>` : ""}<div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="panel:cancel">Отмена</button><button type="submit" class="btn primary">Зафиксировать оплату</button></div></form>`;
}

function submitPaidCategoryForm(ev, config, hooks) {
  ev.preventDefault();
  const s = ws(config.key);
  syncPayDraftFromDom(config, s);
  const appeal = appeals.find((a) => a.id === s.payDraft?.appealId);
  if (!appeal || !s.payDraft) return;
  const cats = payCategoriesFor(config);
  if (!cats.length) {
    s.payDraft.formError = "Добавьте категории в профиле.";
    hooks.refresh();
    return;
  }
  const accrualMode = payAccrualMode(appeal);
  let total = 0;
  let hasPositive = false;
  const rowsOut = [];
  let anyRowError = false;
  s.payDraft.formError = "";
  s.payDraft.rows.forEach((row) => {
    row.amountError = "";
    row.delayError = "";
    row.categoryError = "";
    const cat = findPayCategory(config, row.categoryKey);
    if (!cat?.inProfile) {
      row.categoryError = "Эта категория недоступна. Выберите направление из профиля или обновите профиль.";
      anyRowError = true;
    } else {
      row.kind = cat.kind;
    }
    const amountRaw = String(row.amountRaw ?? "").trim();
    const amount = parseAmountKopecks(row.amountRaw);
    if (amountRaw && !amount.ok) {
      row.amountError = amount.reason === "overflow" ? "Слишком большая сумма для демо." : "Введите сумму с не более чем двумя знаками после запятой.";
      anyRowError = true;
    }
    if (accrualMode === "accrual" && (amountRaw || cat)) {
      const delay = parseDelayDays(row.delayDays);
      if (!delay.ok) {
        row.delayError = delay.reason === "range" ? "Целое число дней 0–36 500." : "Укажите срок в днях.";
        anyRowError = true;
      }
    }
    if (row.amountError || row.delayError || row.categoryError) return;
    if (!amount.ok || amount.empty || amount.kopecks <= 0) return;
    if (!cat) return;
    hasPositive = true;
    total += amount.kopecks;
    if (total > Number(AMOUNT_MAX_KOPECKS)) s.payDraft.formError = "Слишком большая общая сумма.";
    rowsOut.push({
      rowId: row.rowId,
      categoryKey: row.categoryKey,
      categoryLabel: cat.label,
      amountKopecks: amount.kopecks,
      kind: cat.kind,
      accrualDelayDays: accrualMode === "accrual" ? parseDelayDays(row.delayDays).days : 0,
      lineShippedAt: appeal.purchaseBreakdown?.rows?.find((x) => x.rowId === row.rowId)?.lineShippedAt || null,
    });
  });
  if (anyRowError) {
    hooks.refresh();
    return;
  }
  if (s.payDraft.formError) { hooks.refresh(); return; }
  if (!hasPositive || !rowsOut.length) {
    s.payDraft.formError = "Укажите сумму хотя бы в одной категории.";
    hooks.refresh();
    return;
  }
  const dateVal = s.payDraft.paidDate;
  if (!dateVal) {
    s.payDraft.formError = "Укажите дату оплаты.";
    hooks.refresh();
    return;
  }
  const iso = new Date(dateVal + "T12:00:00").toISOString();
  if (dateOnlyMs(iso) > dateOnlyMs(new Date().toISOString())) {
    s.payDraft.formError = "Дата не может быть в будущем.";
    hooks.refresh();
    return;
  }
  if (dateOnlyMs(iso) < dateOnlyMs(appeal.createdAt)) {
    s.payDraft.formError = "Дата не может быть раньше создания обращения.";
    hooks.refresh();
    return;
  }
  savePurchaseBreakdown(appeal, rowsOut, total, iso);
  if (appeal.stageId !== SYSTEM.PAID) {
    const paidHistoryLine = paidHistoryLineFromPayment(total, rowsOut.length, iso);
    commitStageChange(appeal, SYSTEM.PAID, { paidAt: iso, paidAmountKopecks: total, skipPaidHistory: true, paidHistoryLine });
  }
  else {
    appeal.paidAt = iso;
    syncWalletFromAppeal(appeal);
    pushHistory(appeal, "Обновлена разбивка оплаты по категориям");
  }
  s.inlinePanel = null;
  s.inlineReview = null;
  s.payDraft = null;
  clearPayProfileReturnContext(config.key);
  hooks.notify?.("Оплата зафиксирована");
  hooks.refresh();
}

let sharedDatasetEmpty = null;
let sharedDatasetSeeded = false;
/** @type {Map<string, {workspaceKey:string, role:string, appealId:string, formOrigin:string, detailSnapshot:object}>} */
const payProfileReturnByKey = new Map();
let cabinetHooks = null;
function afterDataChange() {
  cabinetHooks?.refresh?.();
}

function canEditPayProfileCategories(config) {
  if (config.readOnly) return false;
  if (config.role === "employee") return false;
  return ["store", "company", "specialist"].includes(config.role);
}

function clonePayDraft(draft) {
  if (!draft) return null;
  return structuredClone(draft);
}

function revalidatePayDraftAfterProfile(config, draft) {
  if (!draft) return null;
  const cats = payCategoriesFor(config);
  const keys = new Set(cats.map((c) => c.key));
  const clone = structuredClone(draft);
  clone.formError = "";
  clone.rows.forEach((row) => {
    row.categoryError = "";
    row.amountError = "";
    row.delayError = "";
    const norm = row.categoryKey ? normalizeRowCategoryKey(row.categoryKey, config) : "";
    if (norm && !keys.has(norm)) {
      row.categoryKey = "";
      row.categoryError = "Категория больше не в профиле — выберите снова.";
    } else if (norm) {
      row.categoryKey = norm;
      const cat = findPayCategory(config, norm);
      if (cat) row.kind = cat.kind;
    }
  });
  return clone;
}

export function getPayProfileReturnContext(workspaceKey) {
  return payProfileReturnByKey.get(workspaceKey) || null;
}

export function clearPayProfileReturnContext(workspaceKey) {
  payProfileReturnByKey.delete(workspaceKey);
}

export function clearAllPayProfileReturnContexts() {
  payProfileReturnByKey.clear();
}

export function renderPayProfileReturnBanner(config) {
  const ctx = payProfileReturnByKey.get(config.key);
  if (!ctx || ctx.role !== config.role) return "";
  return `<aside class="panel stack ca-profile-return" data-pay-profile-return data-testid="ca-profile-return"><p class="notice accent">Выберите или уточните категории для этой покупки и нажмите «Сохранить категории». Суммы, даты и черновик оплаты не меняются. Затем вернитесь к оформлению покупки.</p><div class="ca-form-actions"><button type="button" class="btn primary" data-action="pay-profile:resume" data-testid="pay-profile-resume">Вернуться к оформлению покупки</button><button type="button" class="btn ghost" data-action="pay-profile:abandon" data-testid="pay-profile-abandon">Остаться в профиле</button></div></aside>`;
}

export function beginPayProfileCategoriesTrip(config, hooks) {
  if (!canEditPayProfileCategories(config)) {
    hooks.notify?.("Категории для оплаты настраивает владелец организации в профиле работодателя.", "info");
    return;
  }
  const s = ws(config.key);
  const appealId = s.payDraft?.appealId || s.selectedId;
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal) return;
  if (!s.payDraft || s.payDraft.appealId !== appeal.id) initPayDraft(config, s, appeal);
  syncPayDraftFromDom(config, s);
  const formOrigin = s.inlineReview?.stageId === SYSTEM.PAID ? "review-paid" : "inline-pay";
  payProfileReturnByKey.set(config.key, {
    workspaceKey: config.key,
    role: config.role,
    appealId: appeal.id,
    formOrigin,
    detailSnapshot: {
      selectedId: appeal.id,
      view: "detail",
      inlinePanel: formOrigin === "inline-pay" ? "pay" : null,
      inlineReview: formOrigin === "review-paid" ? { appealId: appeal.id, stageId: SYSTEM.PAID } : null,
      payDraft: clonePayDraft(s.payDraft),
    },
  });
  hooks.openProfileForPayCategories?.();
}

export function resumePayProfileCategoriesTrip(config, hooks) {
  const ctx = payProfileReturnByKey.get(config.key);
  if (!ctx || ctx.role !== config.role) {
    clearPayProfileReturnContext(config.key);
    return false;
  }
  if (!appeals.some((a) => a.id === ctx.appealId)) {
    clearPayProfileReturnContext(config.key);
    return false;
  }
  const s = ws(config.key);
  const d = ctx.detailSnapshot;
  s.view = d.view;
  s.selectedId = d.selectedId;
  s.inlinePanel = d.inlinePanel;
  s.inlineReview = d.inlineReview ? { ...d.inlineReview } : null;
  s.payDraft = revalidatePayDraftAfterProfile(config, d.payDraft);
  clearPayProfileReturnContext(config.key);
  hooks.notify?.("Черновик оплаты восстановлен. Проверьте категории из профиля.");
  hooks.refresh?.();
  return true;
}

// ── Cabinet integration ──
const workspaces = new Map();
function ws(key) {
  if (!workspaces.has(key)) {
    workspaces.set(key, {
      seeded: false,
      datasetEmpty: null,
      tab: "incoming",
      view: "list",
      selectedId: null,
      purchaseViewId: null,
      listQ: "",
      listStatus: "Все статусы",
      listSource: "all",
      funnelPreset: "30",
      funnelFrom: "2026-10-01",
      funnelTo: "2026-11-12",
      analyticsTab: "incoming",
      scanOutcome: "new",
      scanError: "",
      manualError: "",
      settingsError: "",
      inlineReview: null,
      inlinePanel: null,
      detailPickStage: false,
      settingsDraft: null,
      showRefusal: null,
      notice: "",
      partnerSettingsLocal: null,
      partnerOverlay: { refusalReasons: [], workingStages: [], manualChannels: [], payCategories: [] },
      refusalDraft: { reason: "", comment: "", showCustom: false, customText: "", customError: "" },
      stageDraft: { selectedStageId: "", showCustom: false, customText: "", customError: "" },
      manualDraft: { name: "", interest: "", contact: "", source: "phone", showCustomChannel: false, customChannelText: "", customChannelError: "" },
      payDraft: null,
      listBucket: "active",
      bulkSelectedIds: [],
      bulkPanel: null,
      bulkConfirm: null,
    });
  }
  const s = workspaces.get(key);
  if (!s.listBucket) s.listBucket = "active";
  if (!s.bulkSelectedIds) s.bulkSelectedIds = [];
  if (!s.partnerOverlay) s.partnerOverlay = { refusalReasons: [], workingStages: [], manualChannels: [], payCategories: [] };
  return s;
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
  if (s.view === "detail" && s.selectedId) {
    const appeal = appeals.find((a) => a.id === s.selectedId);
    if (appeal) return appeal.clientName;
  }
  return PAGE_TITLES[s.view] || "Клиенты";
}

export function clientAppealsPageMuted(config) {
  const s = ws(config.key);
  const appeal = s.selectedId ? appeals.find((a) => a.id === s.selectedId) : null;
  if (s.view === "list") return "Покупатели вашего магазина и история их обращений.";
  if (s.view === "detail" && appeal) return `Обращение ${appeal.id} · ${sourceDisplay(appeal)}`;
  if (s.view === "scan") return "Сканер создаст обращение или откроет уже существующее.";
  if (s.view === "manual") return "Без сертификата: направившего, скидки и вознаграждения не будет.";
  if (s.view === "settings") return "Настройте путь клиента под свой бизнес. Изменения видны только вам.";
  if (s.view === "analytics") return "Как обращения превращаются в покупки.";
  if (s.view === "purchase" && s.purchaseViewId) return `Покупка ${s.purchaseViewId} · как в кошельке`;
  return "";
}

export function clientAppealsHeaderPill(config) {
  const s = ws(config.key);
  if (s.view !== "detail" || !s.selectedId) return "";
  const appeal = appeals.find((a) => a.id === s.selectedId);
  return appeal ? pillHtml(appeal) : "";
}

export function clientAppealsSubpageBack(config) {
  const s = ws(config.key);
  if (s.view === "list") return "";
  if (s.view === "detail") return backLink(config, "К списку клиентов", "nav:list");
  if (s.view === "purchase") return backLink(config, "К обращению", "nav:detail");
  return backLink(config, "К списку клиентов", "nav:list");
}

function resetSharedAppealsDataset(empty) {
  appeals = [];
  Object.keys(walletPurchases).forEach((k) => delete walletPurchases[k]);
  appealIdSeq = 1100;
  if (!empty) seedAppeals();
}

function ensureSeed(config) {
  const s = ws(config.key);
  const empty = emptyDatasetOn();
  if (sharedDatasetEmpty !== empty) {
    sharedDatasetEmpty = empty;
    sharedDatasetSeeded = false;
    clearClientPurchaseLedger();
    clearAllPayProfileReturnContexts();
    workspaces.forEach((w) => {
      w.seeded = false;
      w.datasetEmpty = null;
    });
  }
  const needsGlobalSeed = !sharedDatasetSeeded;
  const needsWorkspaceInit = !s.seeded || s.datasetEmpty !== empty;
  if (needsWorkspaceInit) {
    s.datasetEmpty = empty;
    s.seeded = true;
    if (!s.funnelPreset) applyFunnelPreset(s, "30");
    const caps = roleCaps(config.role);
    if (!caps.incoming) s.tab = "outgoing";
    clearBulkSelection(s);
  }
  if (needsGlobalSeed) {
    sharedDatasetSeeded = true;
    resetSharedAppealsDataset(empty);
  }
}

function backLink(config, label, action) {
  const icon = config.icon?.("arrow-left") || "←";
  return `<button type="button" class="ca-back" data-ca-action="${action}">${icon} ${esc(label)}</button>`;
}

function renderBulkConfirmPanel(s) {
  if (!s.bulkConfirm) return "";
  const { kind, count } = s.bulkConfirm;
  const copy =
    kind === "archive"
      ? `Переместить ${count} обращений в архив? Этапы и покупки не изменятся.`
      : kind === "delete"
        ? `Скрыть ${count} обращений в корзину? История, покупки и сертификаты сохранятся в демо.`
        : kind === "unarchive"
          ? `Вернуть ${count} обращений в активный список?`
          : `Восстановить ${count} обращений из корзины?`;
  return `<aside class="panel stack ca-bulk-confirm" role="status"><p>${esc(copy)}</p><div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="bulk:confirm-no">Отмена</button><button type="button" class="btn primary" data-ca-action="bulk:confirm-yes">Подтвердить</button></div></aside>`;
}

function renderBulkEditPanel(config, s, count) {
  const selected = bulkSelectedAppeals(s);
  const stageBlocked = bulkStageEditBlocked(selected);
  const lockedHint = stageBlocked
    ? `<p class="notice" role="status">В выборке есть оплаченные, отгруженные, с возвратом или закрытые обращения — рабочий этап для всей группы изменить нельзя. Можно добавить служебную заметку.</p>`
    : `<p class="small muted">Нельзя массово ставить «Оплачено», «Отгружено» или «Возврат».</p>`;
  const options = bulkWorkingStageOptions(RECEIVING.id)
    .map((id) => {
      const label = systemLabel(id) || getWorkingStage(RECEIVING.id, id)?.label || id;
      return `<option value="${esc(id)}">${esc(label)}</option>`;
    })
    .join("");
  return `<aside class="panel stack ca-bulk-edit" data-ca-bulk-edit data-bulk-stage-blocked="${stageBlocked ? "1" : "0"}"><h3>Групповое изменение · ${count}</h3>${lockedHint}<label class="field">Этап работ<select name="bulk-stage" ${stageBlocked ? "disabled" : ""}><option value="">Не менять</option>${options}</select><small class="input-hint">${stageBlocked ? "Снимите из выборки закрытые обращения, чтобы менять этап." : "Только ваши рабочие этапы, без оплаты и отгрузки."}</small></label><label class="field">Служебная заметка<textarea name="bulk-note" rows="2" maxlength="2000" placeholder="Текст для команды"></textarea></label><label class="field ca-check-line"><input type="checkbox" name="bulk-note-append" checked> Добавить к существующей заметке</label><div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="bulk:edit-cancel">Отмена</button><button type="button" class="btn primary" data-ca-action="bulk:edit-apply">Применить</button></div></aside>`;
}

function applyBulkArchiveDelete(config, hooks, kind) {
  if (!canBulkIncomingMutate(config)) {
    hooks.notify?.("Групповые действия недоступны в режиме просмотра.", "info");
    return;
  }
  const s = ws(config.key);
  const ids = [...(s.bulkSelectedIds || [])];
  if (!ids.length) return;
  let n = 0;
  ids.forEach((id) => {
    const appeal = appeals.find((a) => a.id === id);
    if (!appeal) return;
    const lc = appealLifecycle(appeal, config.key);
    if (kind === "archive") {
      if (!lc.deletedAt) {
        lc.archivedAt = new Date().toISOString();
        pushHistory(appeal, "Перемещено в архив (групповое действие)");
        n++;
      }
    } else if (kind === "delete") {
      lc.deletedAt = new Date().toISOString();
      pushHistory(appeal, "Скрыто в корзину (групповое действие)");
      n++;
    } else if (kind === "unarchive") {
      if (lc.archivedAt) {
        delete lc.archivedAt;
        pushHistory(appeal, "Возвращено в активный список");
        n++;
      }
    } else if (kind === "restore") {
      if (lc.deletedAt) {
        delete lc.deletedAt;
        pushHistory(appeal, "Восстановлено из корзины");
        n++;
      }
    }
  });
  clearBulkSelection(s);
  s.bulkConfirm = null;
  hooks.notify?.(n ? `Обновлено обращений: ${n}` : "Нет изменений");
  afterDataChange();
  hooks.refresh();
}

function applyBulkEdit(config, hooks) {
  if (!canBulkIncomingMutate(config)) {
    hooks.notify?.("Групповое редактирование недоступно в режиме просмотра.", "info");
    return;
  }
  const s = ws(config.key);
  const ids = [...(s.bulkSelectedIds || [])];
  if (!ids.length) return;
  const selection = bulkSelectedAppeals(s);
  const stageBlocked = bulkStageEditBlocked(selection);
  const root = document.querySelector("[data-ca-bulk-edit]");
  const rawStage = root?.querySelector('[name="bulk-stage"]')?.value || "";
  const stageId =
    stageBlocked || root?.dataset.bulkStageBlocked === "1" ? "" : rawStage;
  const note = root?.querySelector('[name="bulk-note"]')?.value?.trim() || "";
  const append = root?.querySelector('[name="bulk-note-append"]')?.checked !== false;
  if (!stageId && !note) {
    hooks.notify?.("Укажите этап или заметку", "info");
    return;
  }
  let changed = 0;
  ids.forEach((id) => {
    const appeal = appeals.find((a) => a.id === id);
    if (!appeal) return;
    let touched = false;
    if (
      stageId &&
      !stageBlocked &&
      !isAppealLockedForBulkStage(appeal) &&
      !isFinancialStage(stageId) &&
      stageId !== SYSTEM.REFUSED &&
      appeal.stageId !== stageId
    ) {
      const label = systemLabel(stageId) || getWorkingStage(appeal.receivingPartnerId, stageId)?.label || stageId;
      appeal.stageId = stageId;
      pushHistory(appeal, `Этап изменён: ${label} (групповое действие)`);
      touched = true;
    }
    if (note) {
      const piece = note.slice(0, 2000);
      appeal.privateNotes = append
        ? [appeal.privateNotes, piece].filter(Boolean).join("\n").slice(0, 4000)
        : piece;
      pushHistory(appeal, "Обновлена служебная заметка (групповое действие)");
      touched = true;
    }
    if (touched) changed++;
  });
  if (!changed) {
    hooks.notify?.("Нет изменений для выбранных обращений", "info");
    return;
  }
  clearBulkSelection(s);
  s.bulkPanel = null;
  hooks.notify?.(`Обновлено обращений: ${changed}`);
  afterDataChange();
  hooks.refresh();
}

function renderListPage(config) {
  const s = ws(config.key);
  const caps = roleCaps(config.role);
  const readOnly = config.readOnly;
  const icon = config.icon;
  const incomingList = filterAppeals("incoming", config.key);
  const outgoingList = filterAppeals("outgoing", config.key, { lifecycle: "none" });
  const tab = caps.incoming && caps.outgoing ? s.tab : caps.incoming ? "incoming" : "outgoing";
  const list = tab === "incoming" ? incomingList : outgoingList;
  const bulkOn = !readOnly && tab === "incoming";
  const selected = new Set((s.bulkSelectedIds || []).filter((id) => list.some((a) => a.id === id)));
  s.bulkSelectedIds = [...selected];
  const kpi = listKpis(config, tab);
  const kpiStrip = `<div class="ca-kpi-strip" role="list">${[
        ["В работе", kpi.inWork],
        ["Оплачено", kpi.paid],
        ["Отгружено", kpi.shipped],
        ["Конверсия в оплату", kpi.conv],
      ]
        .map(
          ([label, val]) =>
            `<div class="ca-kpi panel" role="listitem"><span class="small muted">${esc(label)}</span><strong class="ca-kpi-val">${esc(String(val))}</strong></div>`,
        )
        .join("")}</div>`;
  const bucket = s.listBucket || "active";
  const bucketTabs = bulkOn
    ? `<div class="ca-bucket-tabs ca-seg" role="tablist" aria-label="Список обращений"><button type="button" role="tab" aria-selected="${bucket === "active"}" data-ca-action="bucket:active">Активные</button><button type="button" role="tab" aria-selected="${bucket === "archive"}" data-ca-action="bucket:archive">Архив</button><button type="button" role="tab" aria-selected="${bucket === "trash"}" data-ca-action="bucket:trash">Корзина</button></div>`
    : "";
  const metaHeader = tab === "outgoing" ? "Принимает" : "Источник";
  const allChecked = list.length > 0 && list.every((a) => selected.has(a.id));
  const listHead =
    list.length > 0
      ? `<div class="ca-row ca-row--head" role="presentation">${bulkOn ? `<label class="ca-row-check ca-row-check--head ca-bulk-select-all-desktop"><input type="checkbox" data-ca-bulk-select-all aria-label="Выбрать все" ${allChecked ? "checked" : ""}></label>` : ""}<span class="ca-row-name small muted">Клиент</span><span class="ca-row-request small muted">Запрос</span><span class="ca-row-meta small muted">${esc(metaHeader)}</span><span class="ca-row-status small muted">Статус</span><span class="ca-row-amount small muted">Сумма</span><span class="ca-row-age small muted">Создано</span><span class="ca-chev" aria-hidden="true"></span></div>`
      : "";
  const rows = list
    .map((a) => {
      const label = paidLabelForAppeal(a);
      const amt = label
        ? `<span class="ca-amount">${esc(label)}</span>`
        : `<span class="ca-amount ca-amount--empty">—</span>`;
      const checked = selected.has(a.id);
      const check = bulkOn
        ? `<label class="ca-row-check"><input type="checkbox" data-ca-bulk-id="${esc(a.id)}" aria-label="Выбрать ${esc(a.clientName)}" ${checked ? "checked" : ""}></label>`
        : "";
      return `<div class="ca-row-lane">${check}<button type="button" class="ca-row" data-ca-action="open:${a.id}" data-ca-tab="${tab}"><span class="ca-row-name"><strong>${esc(a.clientName)}</strong></span><span class="ca-row-request muted small">${esc(a.interest || a.id)}</span><span class="ca-row-meta muted small">${esc(rowMetaSource(a, tab))}</span><span class="ca-row-status">${pillHtml(a)}</span><span class="ca-row-amount">${amt}</span><span class="ca-row-age muted small">${esc(formatAgeSince(a.createdAt))}</span><span class="ca-chev" aria-hidden="true">›</span></button></div>`;
    })
    .join("");
  const tabs =
    caps.incoming && caps.outgoing
      ? `<div class="ca-tabs wallet-direction__tabs" role="tablist"><button type="button" class="wallet-direction__tab${tab === "incoming" ? " is-active" : ""}" role="tab" aria-selected="${tab === "incoming"}" data-ca-action="tab:incoming">Пришли ко мне · ${incomingList.length}</button><button type="button" class="wallet-direction__tab${tab === "outgoing" ? " is-active" : ""}" role="tab" aria-selected="${tab === "outgoing"}" data-ca-action="tab:outgoing">Я направил · ${outgoingList.length}</button></div>`
      : "";
  const emptyIcon = icon?.("inbox") || "";
  const emptyTitle =
    bucket === "archive" ? "В архиве пока пусто" : bucket === "trash" ? "Корзина пуста" : "Пока нет обращений";
  const emptyHint =
    bucket === "archive"
      ? "Сюда попадают обращения, с которыми вы закончили работу в списке."
      : bucket === "trash"
        ? "Удалённые в демо обращения можно восстановить отсюда."
        : "Сканируйте сертификат или добавьте клиента — обращение появится в списке.";
  const empty =
    !list.length &&
    `<section class="panel empty ca-empty"><div class="ca-empty-icon" aria-hidden="true">${emptyIcon}</div><h2>${esc(emptyTitle)}</h2><p class="muted">${esc(emptyHint)}</p><div class="ca-actions-row">${!readOnly && caps.canReceive && tab === "incoming" && bucket === "active" ? `<button type="button" class="btn primary" data-ca-action="nav:scan">Сканировать сертификат</button><button type="button" class="btn ghost" data-ca-action="nav:manual">Добавить клиента</button>` : !readOnly && tab === "incoming" && bucket === "active" ? `<button type="button" class="btn primary" data-ca-action="nav:scan">Сканировать сертификат</button>` : ""}${bucket !== "active" ? `<button type="button" class="btn ghost" data-ca-action="bucket:active">К активным</button>` : ""}</div></section>`;
  const selCount = selected.size;
  const bulkBar =
    bulkOn && selCount > 0
      ? `<motion class="ca-bulk-bar panel" role="toolbar" aria-label="Групповые действия">
      <span class="ca-bulk-count">Выбрано: <strong>${selCount}</strong></span>
      <div class="ca-bulk-actions">
        ${bucket === "active" ? `<button type="button" class="btn ghost small-btn" data-ca-action="bulk:edit-open">Редактировать</button><button type="button" class="btn ghost small-btn" data-ca-action="bulk:archive-ask">В архив</button><button type="button" class="btn ghost small-btn" data-ca-action="bulk:delete-ask">Удалить</button>` : ""}
        ${bucket === "archive" ? `<button type="button" class="btn ghost small-btn" data-ca-action="bulk:unarchive-ask">Вернуть в активные</button><button type="button" class="btn ghost small-btn" data-ca-action="bulk:delete-ask">В корзину</button>` : ""}
        ${bucket === "trash" ? `<button type="button" class="btn primary small-btn" data-ca-action="bulk:restore-ask">Восстановить</button>` : ""}
        <button type="button" class="btn ghost small-btn" data-ca-action="bulk:clear">Сбросить выбор</button>
      </div></motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>")
      : "";
  const bulkEdit = bulkOn && s.bulkPanel === "edit" && selCount > 0 ? renderBulkEditPanel(config, s, selCount) : "";
  const bulkConfirm = bulkOn ? renderBulkConfirmPanel(s) : "";
  const quietIcon = (name) => icon?.(name) || "";
  const analyticsBtn = `<button type="button" class="btn ghost ca-quiet-btn" data-ca-action="nav:analytics">${quietIcon("bar-chart-3")} Аналитика</button>`;
  const settingsBtn = `<button type="button" class="btn ghost ca-quiet-btn" data-ca-action="nav:settings">${quietIcon("settings-2")} Этапы и причины</button>`;
  const actions =
    !readOnly && tab === "incoming" && caps.canReceive
      ? `<div class="ca-toolbar"><div class="ca-toolbar-primary"><button type="button" class="btn primary" data-ca-action="nav:scan">Сканировать сертификат</button><button type="button" class="btn ghost" data-ca-action="nav:manual">Добавить клиента</button></div><div class="ca-quiet-links">${analyticsBtn}${settingsBtn}</div></div>`
      : !readOnly
        ? `<div class="ca-toolbar"><div class="ca-quiet-links">${analyticsBtn}${tab === "incoming" && caps.canReceive ? settingsBtn : ""}</div></div>`
        : readOnly
          ? `<p class="notice">Только просмотр: изменять статусы и заметки нельзя.</p>`
          : "";
  const filters = `<div class="ca-filters panel"><label class="field ca-search">Поиск<input type="search" data-ca-input="q" value="${esc(s.listQ)}" placeholder="Имя, сертификат или ID"></label><label class="field ca-filter">Статус<select data-ca-input="status"></select></label>${tab === "incoming" ? `<label class="field ca-filter">Источник<select data-ca-input="source"></select></label>` : ""}</div>`;
  const bulkSelectAllMobile =
    bulkOn && list.length
      ? `<label class="ca-bulk-select-all-mobile"><input type="checkbox" data-ca-bulk-select-all aria-label="Выбрать все" ${allChecked ? "checked" : ""}> Выбрать все</label>`
      : "";
  const rowsWrap = list.length ? `<div class="ca-rows${bulkOn ? " ca-rows--bulk" : ""}">${listHead}${rows}</div>` : "";
  return `${tabs}${bucketTabs}${kpiStrip}${actions}${bulkConfirm}${bulkBar}${bulkEdit}${filters}${bulkSelectAllMobile}${empty || rowsWrap}`;
}

export function renderClientAppeals(config) {
  appealsRenderConfig = config;
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
  if (s.view === "scan") return `<div class="stack ca-section" data-ca-root>${renderScanInline(config)}</div>`;
  if (s.view === "manual") return `<div class="stack ca-section" data-ca-root>${renderManualInline(config)}</div>`;
  if (s.view === "settings") return `<div class="stack ca-section" data-ca-root>${renderSettingsInline(config)}</div>`;
  if (s.view === "purchase") return `<div class="stack ca-section" data-ca-root>${renderPurchaseInline(config, s.purchaseViewId)}</div>`;
  if (s.view === "analytics") return `<div class="stack ca-section" data-ca-root>${renderFunnelPage(config)}</div>`;
  if (s.view === "detail" && s.selectedId) return `<div class="stack ca-section" data-ca-root>${renderDetailPage(config, s.selectedId)}</div>`;
  s.view = "list";
  return renderClientAppeals(config);
}

function renderScanInline(config) {
  const icon = config.icon;
  const cards = [
    ["new", "scan-line", "Новый сертификат", "Создаст обращение"],
    ["repeat", "rotate-cw", "Уже сканировали", "Откроет существующее"],
    ["invalid", "ban", "Недействителен", "Обращение не создаётся"],
  ]
    .map(
      ([val, ico, title, hint]) =>
        `<label class="ca-option-card"><input type="radio" name="ca-scan-outcome" value="${val}" ${val === "new" ? "checked" : ""}><span class="ca-option-body"><span class="care-ico">${icon?.(ico) || ""}</span><span class="ca-option-text"><strong>${esc(title)}</strong><small class="muted">${esc(hint)}</small></span></span></label>`,
    )
    .join("");
  return `<section class="panel stack ca-scan"><p class="small muted">Демо без камеры — исход проверки выбирается вручную.</p><div class="ca-option-grid">${cards}</div><div class="ca-scan-result" data-ca-scan-error hidden role="alert"></div><button type="button" class="btn primary" data-ca-action="scan:submit">Считать демосертификат</button></section>`;
}

function renderManualInline(config) {
  if (config.readOnly) return `<section class="panel"><p class="notice">Добавление недоступно в режиме просмотра.</p></section>`;
  const s = ws(config.key);
  const d = s.manualDraft;
  const opts = manualChannelsFor(config)
    .map((o) => `<option value="${esc(o.key)}" ${d.source === o.key ? "selected" : ""}>${esc(o.label)}</option>`)
    .join("");
  const custom = d.showCustomChannel
    ? `<motion class="ca-custom-inline"><label class="field">Свой канал<input name="custom-channel" maxlength="60" value="${esc(d.customChannelText)}"></label><small class="input-hint">Сохранится в ваших вариантах.</small>${d.customChannelError ? `<p class="field-error" role="alert">${esc(d.customChannelError)}</p>` : ""}<span class="ca-form-actions"><button type="button" class="btn ghost small-btn" data-ca-action="manual:custom-cancel">Отмена</button><button type="button" class="btn ghost small-btn" data-ca-action="manual:custom-add">Добавить</button></span></motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>")
    : "";
  return `<section class="panel ca-manual-form"><form class="stack" id="ca-manual-form"><label class="field ca-req">Имя или компания <span class="ca-req-mark" aria-hidden="true">*</span><input name="name" required maxlength="120" autocomplete="name" value="${esc(d.name)}"><small class="input-hint">Как к вам обращаются в переписке или CRM.</small></label><label class="field">Запрос / интерес<input name="interest" maxlength="200" value="${esc(d.interest)}" placeholder="Что хотят купить или заказать"><small class="input-hint">Попадёт в карточку и список обращений.</small></label><div class="ca-manual-grid"><label class="field">Контакт<input name="contact" maxlength="80" value="${esc(d.contact)}" placeholder="Телефон или @username"><small class="input-hint">Только для вашей команды.</small></label><label class="field">Канал<select name="source">${opts}</select><small class="input-hint">Откуда пришёл клиент.</small></label></div><button type="button" class="btn ghost small-btn ca-chip--add" data-ca-action="manual:custom-toggle">+ Свой канал</button>${custom}<p class="field-error" id="ca-manual-error" hidden role="alert"></p><div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="nav:list">Отмена</button><button type="submit" class="btn primary">Создать обращение</button></div></form></section>`;
}

function renderDetailStepper(appeal) {
  const pipe = pipelineFor(appeal.receivingPartnerId);
  const terminal = appeal.stageId === SYSTEM.REFUSED || appeal.stageId === SYSTEM.RETURN;
  const curIdx = pipe.indexOf(appeal.stageId);
  return `<div class="ca-stepper" aria-label="Этапы обращения">${pipe
    .map((id, i) => {
      const label = systemLabel(id) || getWorkingStage(appeal.receivingPartnerId, id)?.label || id;
      let state = "upcoming";
      if (terminal && id === appeal.stageId) state = "terminal";
      else if (id === appeal.stageId) state = "current";
      else if (curIdx > i) state = "done";
      return `<div class="ca-step ca-step--${state}"><span class="ca-step-dot"></span><span class="ca-step-label">${esc(label)}</span></div>`;
    })
    .join("")}</div>`;
}

function renderPurchaseSideCard(appeal) {
  syncWalletFromAppeal(appeal);
  if (!appeal.purchaseId) return "";
  const purchase = walletPurchases[appeal.purchaseId];
  if (!purchase) return "";
  const statusClass = purchase.purchaseFulfillmentLabel?.includes("возврат") ? "ca-pill--warn" : "good";
  return `<section class="panel stack ca-side-card"><h3>Покупка</h3><p><strong>${esc(purchase.amountLabel)}</strong></p><p class="small muted">${esc(purchase.purchasePaymentLabel)}</p><span class="pill ${statusClass}">${esc(purchase.purchaseFulfillmentLabel || purchase.purchasePaymentLabel)}</span><button type="button" class="btn ghost small-btn" data-ca-action="purchase:${esc(appeal.purchaseId)}">Подробнее о покупке</button></section>`;
}

function renderWaitProgress(appeal) {
  syncWalletFromAppeal(appeal);
  if (appeal.stageId !== SYSTEM.SHIPPED) return "";
  if (!canAccrueReferral(appeal) || isManualAppeal(appeal)) return "";
  const rows = appeal.purchaseBreakdown?.rows;
  if (rows?.length) {
    const items = rows
      .map((row) => {
        const meta = categoryBreakdownDisplay(row, appeal);
        if (!meta.accrual) return "";
        const bar =
          meta.phase === "waiting"
            ? `<div class="ca-progress ca-progress--row" aria-hidden="true"><i style="width:${meta.progressPct}%"></i></div>`
            : meta.phase === "confirmed"
              ? `<div class="ca-progress ca-progress--row" aria-hidden="true"><i style="width:100%"></i></div>`
              : "";
        return `<li class="ca-wait-row"><span class="ca-wait-row-head"><strong>${esc(row.categoryLabel || row.categoryKey)}</strong><span class="small muted">${esc(meta.delaySaved)}</span></span>${bar}<p class="small muted ca-wait-row-state">${esc(meta.stateText)}</p></li>`;
      })
      .filter(Boolean)
      .join("");
    if (!items) return "";
    return `<ul class="ca-wait-by-cat">${items}</ul><p class="small muted ca-wait-note">${esc(WALLET_CALENDAR_NOTE)}</p>`;
  }
  const wallet = walletPurchases[appeal.purchaseId];
  const totalDelay = WAIT_DAYS;
  const left = wallet?.waitDaysLeft != null ? Math.max(0, wallet.waitDaysLeft) : referralWaitDaysLeft(appeal.shippedAt);
  const pct = totalDelay > 0 ? Math.round(((totalDelay - left) / totalDelay) * 100) : 100;
  return `<div class="ca-wait-progress"><div class="ca-progress" aria-hidden="true"><i style="width:${pct}%"></i></div><p class="small muted">Осталось ${left} из ${totalDelay} календарных дней</p><p class="small muted">${esc(WALLET_CALENDAR_NOTE)}</p></div>`;
}

function renderPayInlineForm(config, appeal) {
  return renderPayCategoryForm(config, appeal, "ca-pay-form");
}

function renderRefusalChips(config, appeal) {
  const s = ws(config.key);
  if (!s.refusalDraft) s.refusalDraft = { reason: "", comment: "", showCustom: false, customText: "", customError: "" };
  const d = s.refusalDraft;
  const reasons = refusalReasonsFor(config, appeal.receivingPartnerId);
  const chips = reasons
    .map((r) => {
      const sel = d.reason === r ? " is-selected" : "";
      return `<button type="button" class="ca-chip${sel}" data-ca-action="refusal:pick:${encodeURIComponent(r)}">${esc(r)}</button>`;
    })
    .join("");
  const custom = d.showCustom
    ? `<div class="ca-custom-inline"><label class="field">Своя причина<input type="text" name="custom-reason" maxlength="80" value="${esc(d.customText)}"></label><small class="input-hint">Сохранится в ваших вариантах.</small>${d.customError ? `<p class="field-error" role="alert">${esc(d.customError)}</p>` : ""}<span class="ca-form-actions"><button type="button" class="btn ghost small-btn" data-ca-action="refusal:custom-cancel">Отмена</button><button type="button" class="btn ghost small-btn" data-ca-action="refusal:custom-add">Добавить</button></span></div>`
    : "";
  return `<form class="stack" id="ca-refusal-form"><div class="ca-chips">${chips}<button type="button" class="ca-chip ca-chip--add" data-ca-action="refusal:custom-toggle">+ Своя причина</button></div>${custom}<input type="hidden" name="reason" value="${esc(d.reason)}"><label class="field">Комментарий<textarea name="comment" rows="2" placeholder="Необязательно">${esc(d.comment)}</textarea></label><div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="refusal:panel-cancel">Отмена</button><button type="submit" class="btn primary">Зафиксировать отказ</button></div></form>`;
}

function renderNextStepCard(config, appeal, s, readOnly) {
  if (readOnly) {
    const label = stageLabel(appeal);
    return `<section class="panel stack ca-next"><h3>Что сейчас</h3><p><strong>${esc(label)}</strong></p><p class="small muted">С ${esc(formatDateTime(appeal.updatedAt))}</p></section>`;
  }
  if (appeal.stageId === SYSTEM.REFUSED || appeal.stageId === SYSTEM.RETURN) {
    const reason = appeal.refusedReason || (appeal.stageId === SYSTEM.RETURN ? "Возврат оформлен" : "—");
    return `<section class="panel stack ca-next ca-next--terminal"><h3>${esc(stageLabel(appeal))}</h3><p class="muted">${esc(reason)}</p>${appeal.stageId === SYSTEM.REFUSED ? `<button type="button" class="btn ghost small-btn" data-ca-action="stage:next:${SYSTEM.NEW}">Вернуть в работу</button>` : ""}</section>`;
  }
  if (s.inlinePanel === "pay") return `<section class="panel stack ca-next ca-pay-card"><h3>Отметить оплату</h3>${renderPayInlineForm(config, appeal)}</section>`;
  if (s.showRefusal === appeal.id) return `<section class="panel stack ca-next"><h3>Клиент отказался</h3>${renderRefusalChips(config, appeal)}</section>`;
  if (s.inlineReview) return `<section class="panel stack ca-next">${renderReviewInline(config, s, appeal)}</section>`;
  if (s.detailPickStage) {
    if (!s.stageDraft) s.stageDraft = { selectedStageId: "", showCustom: false, customText: "", customError: "" };
    const sd = s.stageDraft;
    const statusOptions = pipelineFor(appeal.receivingPartnerId)
      .filter((id) => id !== appeal.stageId && canTransitionTo(appeal, id).ok)
      .map((id) => {
        const label = systemLabel(id) || getWorkingStage(appeal.receivingPartnerId, id)?.label || id;
        const sel = (sd.selectedStageId || "") === id ? "selected" : "";
        return `<option value="${esc(id)}" ${sel}>${esc(label)}</option>`;
      })
      .join("");
    const custom = sd.showCustom
      ? `<div class="ca-custom-inline"><label class="field">Свой этап<input type="text" name="custom-stage" maxlength="80" value="${esc(sd.customText)}"></label><small class="input-hint">Сохранится в ваших вариантах.</small>${sd.customError ? `<p class="field-error" role="alert">${esc(sd.customError)}</p>` : ""}<span class="ca-form-actions"><button type="button" class="btn ghost small-btn" data-ca-action="stage:custom-cancel">Отмена</button><button type="button" class="btn ghost small-btn" data-ca-action="stage:custom-add">Добавить</button></span></div>`
      : "";
    return `<section class="panel stack ca-next"><h3>Выбор этапа</h3><label class="field">Этап<select data-ca-input="detail-status">${statusOptions}</select></label><button type="button" class="btn ghost small-btn ca-chip--add" data-ca-action="stage:custom-toggle">+ Свой этап</button>${custom}<div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="panel:cancel">Отмена</button><button type="button" class="btn primary" data-ca-action="stage:apply">Перевести</button></div></section>`;
  }
  if (appeal.stageId === SYSTEM.SHIPPED) {
    return `<section class="panel stack ca-next"><h3>Ждём подтверждения начисления</h3>${renderWaitProgress(appeal)}<div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="panel:return">Оформить возврат</button></div></section>`;
  }
  if (appeal.stageId === SYSTEM.PAID) {
    return `<section class="panel stack ca-next"><h3>Оплачено · ждём отгрузку</h3><button type="button" class="btn primary" data-ca-action="stage:next:${SYSTEM.SHIPPED}">Отметить отгрузку</button></section>`;
  }
  const next = nextStageId(appeal);
  const nextLabel = next ? systemLabel(next) || getWorkingStage(appeal.receivingPartnerId, next)?.label : null;
  const actions = `<div class="ca-next-actions">${nextLabel ? `<button type="button" class="btn primary" data-ca-action="stage:next:${esc(next)}">Перевести в «${esc(nextLabel)}»</button>` : ""}${!appealHasPaidPurchase(appeal) ? `<button type="button" class="btn ghost" data-ca-action="panel:pay">Отметить оплату</button>` : ""}${canRefuseFrom(appeal) ? `<button type="button" class="btn ghost" data-ca-action="refusal:open">Клиент отказался</button>` : ""}</div><button type="button" class="btn ghost small-btn" data-ca-action="panel:pick">Выбрать другой этап</button>`;
  return `<section class="panel stack ca-next"><h3>${nextLabel ? `Следующий шаг: ${esc(nextLabel)}` : "Следующий шаг"}</h3>${actions}</section>`;
}

function renderReviewInline(config, s, appeal) {
  if (!s.inlineReview) return "";
  const pr = s.inlineReview;
  const label = systemLabel(pr.stageId) || pr.stageId;
  const maxYmd = todayYmd();
  if (pr.stageId === SYSTEM.PAID) {
    const appealObj = appeal || appeals.find((a) => a.id === pr.appealId);
    if (appealObj) initPayDraft(config, s, appealObj);
    return `<h3>${esc(label)}</h3>${renderPayCategoryForm(config, appealObj, "ca-review-form")}<p class="field-error" id="ca-review-error" hidden role="alert"></p>`;
  }
  let fields = "";
  if (pr.stageId === SYSTEM.SHIPPED) {
    fields = `<label class="field">Дата отгрузки<input type="date" name="review-date" max="${maxYmd}" value="${maxYmd}" required></label>`;
  } else if (pr.stageId === SYSTEM.RETURN) {
    fields = `<label class="field">Дата возврата<input type="date" name="review-date" max="${maxYmd}" value="${maxYmd}" required></label>`;
  }
  return `<h3>${esc(label)}</h3><form class="stack" id="ca-review-form">${fields}<p class="field-error" id="ca-review-error" hidden role="alert"></p><div class="ca-form-actions"><button type="button" class="btn ghost" data-ca-action="review:cancel">Отмена</button><button type="submit" class="btn primary">Подтвердить</button></div></form>`;
}

function renderDetailPage(config, appealId) {
  const s = ws(config.key);
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal) return `<p class="notice">Обращение не найдено.</p>`;
  const outgoing = s.tab === "outgoing";
  const readOnly = config.readOnly || outgoing;
  const manual = isManualAppeal(appeal);
  const timeline = [...appeal.history]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((h) => `<li class="ca-tl-item"><span class="ca-tl-dot" aria-hidden="true"></span><div><time class="small muted">${esc(formatDateTime(h.at))}</time><p>${esc(h.text)}${h.reason ? ` — ${esc(h.reason)}` : ""}</p></div></li>`)
    .join("");
  const clientCard = `<section class="panel stack ca-side-card"><h3>Клиент</h3><p><strong>${esc(appeal.clientName)}</strong></p><p class="small muted">${esc(appeal.clientContact || "Контакт не указан")}</p><dl class="ca-dl"><div><dt>Запрос</dt><dd>${esc(appeal.interest || "—")}</dd></div><div><dt>Источник</dt><dd>${esc(sourceDisplay(appeal))}</dd></div><div><dt>Обращение</dt><dd>${esc(appeal.id)}</dd></div></dl></section>`;
  const certCard = manual
    ? `<section class="panel stack ca-side-card"><h3>Сертификат</h3><p class="muted">Без сертификата — направившего и скидки нет.</p></section>`
    : `<section class="panel stack ca-side-card"><h3>Сертификат</h3><dl class="ca-dl"><div><dt>ID</dt><dd>${esc(appeal.certificateId)}</dd></div><div><dt>Направил</dt><dd>${esc(PARTNERS[appeal.referrerPartnerId]?.name || "—")}</dd></div><div><dt>Скидка</dt><dd>${esc(appeal.discountPercent)}%</dd></div><div><dt>Действует до</dt><dd>${esc(formatDate(appeal.certValidUntil))}</dd></div></dl></section>`;
  const receiverCard = outgoing
    ? `<section class="panel stack ca-side-card"><h3>Принимает</h3><p><strong>${esc(PARTNERS[appeal.receivingPartnerId]?.name || "—")}</strong></p></section>`
    : "";
  const notesCard =
    !readOnly && !outgoing
      ? `<section class="panel stack ca-side-card"><h3>Заметки</h3><label class="field"><textarea data-ca-input="detail-notes" rows="3" placeholder="Только для вашей команды">${esc(appeal.privateNotes)}</textarea></label><button type="button" class="btn ghost small-btn" data-ca-action="notes:save">Сохранить</button></section>`
      : "";
  const main = `<motion class="ca-detail-main"><div class="ca-detail-main-inner">${renderDetailStepper(appeal)}${renderNextStepCard(config, appeal, s, readOnly)}<section class="panel stack"><h3>История</h3><ol class="ca-timeline">${timeline}</ol></section></div></motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
  const side = `<aside class="ca-detail-side">${clientCard}${certCard}${renderPurchaseSideCard(appeal)}${receiverCard}${notesCard}</aside>`;
  return `<motion class="ca-detail-layout">${main}${side}</motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
}

function renderFunnelPage(config) {
  const s = ws(config.key);
  const caps = roleCaps(config.role);
  if (caps.incoming && caps.outgoing) {
    activeTab = s.analyticsTab === "outgoing" ? "outgoing" : "incoming";
  } else {
    activeTab = caps.incoming ? "incoming" : "outgoing";
  }
  const cohort = funnelCohortFromFilters(config.key);
  const denom = cohort.length;
  const paidN = cohort.filter((a) => appealReachedPaid(a)).length;
  const shippedN = cohort.filter((a) => appealReachedShipped(a)).length;
  const returnN = cohort.filter((a) => appealReachedReturn(a)).length;
  const paidKopecks = cohort.map((a) => paidKopecksForAppeal(a)).filter((k) => k != null);
  const avgCheck = paidKopecks.length
    ? formatRubFromKopecks(Math.round(paidKopecks.reduce((a, b) => a + b, 0) / paidKopecks.length))
    : "—";
  const certCohort = cohort.filter((a) => hasCertificateFlow(a));
  const manualCohort = cohort.filter((a) => isManualAppeal(a));
  const certPaid = certCohort.filter((a) => appealReachedPaid(a)).length;
  const manualPaid = manualCohort.filter((a) => appealReachedPaid(a)).length;
  const bar = (label, n, prev, total) => {
    const wTotal = denom ? Math.round((n / denom) * 100) : 0;
    const wPrev = prev ? Math.round((n / prev) * 100) : 0;
    return `<motion class="ca-funnel-bar"><div class="ca-funnel-bar-head"><span>${esc(label)}</span><strong>${n}</strong></div><div class="ca-bar-track"><i style="width:${wTotal}%"></i></div><small class="muted">${wPrev}% от пред. · ${wTotal}% от всех</small></motion>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
  };
  const dirTabs =
    caps.incoming && caps.outgoing
      ? `<div class="ca-seg" role="tablist"><button type="button" role="tab" aria-selected="${s.analyticsTab !== "outgoing"}" data-ca-action="analytics-tab:incoming">Пришли ко мне</button><button type="button" role="tab" aria-selected="${s.analyticsTab === "outgoing"}" data-ca-action="analytics-tab:outgoing">Я направил</button></div>`
      : "";
  const presets = ["30", "90", "all"]
    .map((p) => {
      const labels = { "30": "30 дней", "90": "90 дней", all: "Всё время" };
      return `<button type="button" class="btn ghost small-btn${s.funnelPreset === p ? " is-active" : ""}" data-ca-action="funnel:preset:${p}">${labels[p]}</button>`;
    })
    .join("");
  const emptyHint = !denom ? `<p class="notice">За период обращений нет — создайте первое сканированием или вручную.</p>` : "";
  return `<section class="panel stack ca-analytics">${dirTabs}<motion class="ca-period-row">${presets}<label class="field">С<input type="date" data-ca-input="funnel-from" value="${esc(s.funnelFrom)}"></label><label class="field">По<input type="date" data-ca-input="funnel-to" value="${esc(s.funnelTo)}"></label></motion><div class="ca-kpi-strip ca-kpi-strip--analytics">${[
    ["Обращения", denom],
    ["Оплачено", paidN],
    ["Отгружено", shippedN],
    ["Возвраты", returnN],
    ["Средний чек", avgCheck],
  ]
    .map(([l, v]) => `<div class="ca-kpi panel"><span class="small muted">${esc(l)}</span><strong>${esc(String(v))}</strong></div>`)
    .join("")}</div>${emptyHint}<div class="ca-funnel">${bar("Обращения", denom, 0, denom)}${bar("Оплачено", paidN, denom, denom)}${bar("Отгружено", shippedN, paidN || 1, denom)}</div><p class="small muted">Возвраты: <strong>${returnN}</strong> · учитываются отдельно</p><div class="ca-compare"><div><span class="small muted">По сертификату</span><div class="ca-bar-track ca-bar-track--sm"><i style="width:${certCohort.length ? Math.round((certPaid / certCohort.length) * 100) : 0}%"></i></div><small>${certCohort.length} обр. · опл. ${esc(safePct(certPaid, certCohort.length))}</small></div><div><span class="small muted">Вручную</span><div class="ca-bar-track ca-bar-track--sm"><i style="width:${manualCohort.length ? Math.round((manualPaid / manualCohort.length) * 100) : 0}%"></i></div><small>${manualCohort.length} обр. · опл. ${esc(safePct(manualPaid, manualCohort.length))}</small></div></div></section>`.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
}

function renderSettingsInline(config) {
  if (config.readOnly) return `<section class="panel"><p class="notice">Настройки недоступны в режиме просмотра.</p></section>`;
  const s = ws(config.key);
  const icon = config.icon;
  if (!s.settingsDraft) s.settingsDraft = JSON.parse(JSON.stringify(partnerSettingsMerged(RECEIVING.id) || partnerSettings[RECEIVING.id]));
  const draft = s.settingsDraft;
  const locked = `<div class="ca-locked-chips"><span class="pill">Новое обращение</span><span aria-hidden="true">…</span><span class="pill good">Оплачено</span><span aria-hidden="true">→</span><span class="pill ca-pill--shipped">Отгружено</span><span aria-hidden="true">→</span><span class="pill ca-pill--warn">Возврат</span></div>`;
  const stages = draft.workingStages
    .map(
      (stage, i) =>
        `<div class="ca-stage-row"><button type="button" class="btn ghost icon-btn" data-ca-action="settings:up:${i}" aria-label="Выше">${icon?.("chevron-up") || "↑"}</button><button type="button" class="btn ghost icon-btn" data-ca-action="settings:down:${i}" aria-label="Ниже">${icon?.("chevron-down") || "↓"}</button><input type="text" class="stage-label" data-stage-index="${i}" value="${esc(stage.label)}" aria-label="Этап ${i + 1}"><button type="button" class="btn ghost icon-btn" data-ca-action="settings:archive:${i}" aria-label="В архив">${icon?.("archive") || "⤓"}</button></div>`,
    )
    .join("");
  const reasons = draft.refusalReasons
    .map((r, i) => `<div class="ca-stage-row"><input type="text" class="reason-label" data-reason-index="${i}" value="${esc(r)}"><button type="button" class="btn ghost icon-btn" data-ca-action="settings:remove-reason:${i}">${icon?.("archive") || "⤓"}</button></div>`)
    .join("");
  const arch =
    draft.archivedStages?.length > 0
      ? `<details class="ca-archive"><summary>Архив (${draft.archivedStages.length})</summary><ul class="stack">${draft.archivedStages.map((st, i) => `<li class="row"><span>${esc(st.label)}</span><button type="button" class="btn ghost small-btn" data-ca-action="settings:restore:${i}">Вернуть</button></li>`).join("")}</ul></details>`
      : "";
  return `<div class="ca-settings-grid"><section class="panel stack"><h3>Этапы работы</h3>${locked}<div class="stack" id="ca-stage-list">${stages}</div><button type="button" class="btn ghost small-btn" data-ca-action="settings:add-stage">${icon?.("plus") || "+"} Добавить этап</button></section><section class="panel stack"><h3>Причины отказа</h3>${reasons}<button type="button" class="btn ghost small-btn" data-ca-action="settings:add-reason">${icon?.("plus") || "+"} Добавить причину</button>${arch}</section></div><div class="ca-settings-footer panel"><button type="button" class="btn ghost" data-ca-action="settings:discard">Отменить изменения</button><button type="button" class="btn primary" data-ca-action="settings:save">Сохранить</button></div>`;
}

function renderPurchaseInline(config, purchaseId) {
  const purchase = walletPurchases[purchaseId];
  if (!purchase) return `<section class="panel"><p class="notice">Покупка не найдена.</p></section>`;
  const appeal = appeals.find((a) => a.purchaseId === purchaseId);
  const bd = appeal?.purchaseBreakdown || purchase.categoryBreakdown;
  const rows = appeal && bd?.rows?.length ? renderPayBreakdownList(appeal, bd.rows) : "";
  const showReward = purchase.rewardStatusLabel && appeal && canAccrueReferral(appeal) && !isManualAppeal(appeal);
  const manualNote = appeal && isManualAppeal(appeal) ? `<p class="small muted">Покупка без реферального начисления — в кошельке принимающего, без долга направившему.</p>` : "";
  return `<section class="panel stack ca-purchase"><dl class="ca-dl"><div><dt>ID</dt><dd>${esc(purchaseId)}</dd></div><div><dt>Оплата</dt><dd>${esc(purchase.purchasePaymentLabel)}</dd></div><div><dt>Сумма покупки</dt><dd class="ca-amount">${esc(purchase.amountLabel)}</dd></div>${showReward ? `<div><dt>Вознаграждение</dt><dd>${esc(purchase.rewardStatusLabel)}</dd></div>` : ""}</dl>${rows}${manualNote}<p class="small muted">Те же события — в кошельке во вкладке «Взаиморасчёты» (направление «Я должен» / «Мне должны»).</p></section>`;
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
    if (stageId === SYSTEM.PAID) initPayDraft(config, s, appeal);
    hooks.refresh();
    return;
  }
  commitStageChange(appeal, stageId, fromRefusal ? { reason: appeal.refusedReason } : null);
  s.inlineReview = null;
  s.inlinePanel = null;
  s.detailPickStage = false;
  hooks.notify?.("Статус обновлён");
  hooks.refresh();
}

function submitReviewCabinet(ev, config, hooks) {
  ev.preventDefault();
  const s = ws(config.key);
  const pr = s.inlineReview;
  if (!pr) return;
  if (pr.stageId === SYSTEM.PAID) {
    submitPaidCategoryForm(ev, config, hooks);
    return;
  }
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
    if (err) {
      err.hidden = false;
      err.classList.add("is-error");
      err.textContent = "Сертификат недействителен или срок истёк. Обращение не создано.";
    }
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
    history: [{ at: now, author: "Система", text: "Создано обращение по сертификату" }],
  });
  const s = ws(config.key);
  s.selectedId = id;
  s.view = "detail";
  hooks.notify?.("Обращение создано");
  hooks.refresh();
}

function submitManualPage(ev, config, hooks) {
  const s = ws(config.key);
  syncManualDraftFromDom(s);
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
  s.inlinePanel = null;
  s.detailPickStage = false;
  s.showRefusal = null;
  clearBulkSelection(s);
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
  appealsRenderConfig = config;
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
  if (document.documentElement.dataset.caHeaderBound !== "1") {
    document.documentElement.dataset.caHeaderBound = "1";
    document.addEventListener("click", (e) => {
      const back = e.target.closest(".page-header .ca-back[data-ca-action]");
      if (!back || document.querySelector("[data-ca-root]")?.contains(back)) return;
      const cfg = cabinetHooks?.config?.();
      if (!cfg) return;
      handleCaAction(back.getAttribute("data-ca-action"), cfg, cabinetHooks);
    });
  }
  if (root.dataset.caBound === "1") return;
  root.dataset.caBound = "1";
  root.addEventListener("click", (e) => {
    if (e.target.closest(".ca-row-check, [data-ca-bulk-id]")) return;
    const btn = e.target.closest("[data-ca-action]");
    if (!btn || !root.contains(btn)) return;
    const action = btn.getAttribute("data-ca-action");
    const tabAttr = btn.getAttribute("data-ca-tab");
    if (tabAttr) s.tab = tabAttr;
    handleCaAction(action, config, hooks);
  });
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (!root.contains(t)) return;
    if (t.matches('[data-ca-input="q"]')) { s.listQ = t.value; clearBulkSelection(s); hooks.refresh(); }
    if (t.matches('[data-ca-input="status"]')) { s.listStatus = t.value; clearBulkSelection(s); hooks.refresh(); }
    if (t.matches('[data-ca-input="source"]')) { s.listSource = t.value; clearBulkSelection(s); hooks.refresh(); }
    if (t.matches('[data-ca-input="funnel-from"]')) { s.funnelFrom = t.value; hooks.refresh(); }
    if (t.matches('[data-ca-input="funnel-to"]')) { s.funnelTo = t.value; hooks.refresh(); }
    if (t.matches("#ca-manual-form [name]")) syncManualDraftFromDom(s);
    const payForm = t.closest(".ca-pay-form");
    if (payForm) {
      syncPayDraftFromDom(config, s);
      if (s.payDraft?.delayAll && t.matches('[name^="delay-"]')) applyPayDelayAllSync(s);
      applyPayDelayAllToDom(payForm, s);
      updatePayFormChromeInPlace(payForm, s);
    }
    if (t.closest("#ca-refusal-form")) syncRefusalDraftFromDom(s);
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (!root.contains(t)) return;
    if (t.matches("[data-ca-bulk-id]")) {
      const id = t.getAttribute("data-ca-bulk-id");
      const set = new Set(s.bulkSelectedIds || []);
      if (t.checked) set.add(id);
      else set.delete(id);
      s.bulkSelectedIds = [...set];
      s.bulkConfirm = null;
      hooks.refresh();
      return;
    }
    if (t.matches("[data-ca-bulk-select-all]")) {
      const list = filterAppeals("incoming", config.key);
      s.bulkSelectedIds = t.checked ? list.map((a) => a.id) : [];
      s.bulkConfirm = null;
      hooks.refresh();
      return;
    }
    if (t.matches('[data-ca-input="detail-status"]')) syncStageDraftFromDom(s);
    const payForm = t.closest(".ca-pay-form");
    if (payForm) {
      syncPayDraftFromDom(config, s);
      applyPayDelayAllSync(s);
      applyPayDelayAllToDom(payForm, s);
      updatePayFormChromeInPlace(payForm, s);
    }
  });
  root.addEventListener("submit", (ev) => {
    if (ev.target?.id === "ca-manual-form") {
      ev.preventDefault();
      submitManualPage(ev, config, hooks);
    }
    if (ev.target?.id === "ca-pay-form") {
      ev.preventDefault();
      submitPaidCategoryForm(ev, config, hooks);
    } else if (ev.target?.id === "ca-review-form") {
      ev.preventDefault();
      if (s.inlineReview?.stageId === SYSTEM.PAID) submitPaidCategoryForm(ev, config, hooks);
      else submitReviewCabinet(ev, config, hooks);
    }
    if (ev.target?.id === "ca-refusal-form") {
      ev.preventDefault();
      syncRefusalDraftFromDom(s);
      const appeal = appeals.find((a) => a.id === s.selectedId);
      if (!appeal) return;
      const reason = s.refusalDraft?.reason || ev.target.reason?.value;
      if (!reason?.trim()) {
        hooks.notify?.("Выберите причину отказа", "error");
        return;
      }
      commitStageChange(appeal, SYSTEM.REFUSED, { reason, note: s.refusalDraft?.comment?.trim() || "" });
      s.showRefusal = null;
      s.refusalDraft = { reason: "", comment: "", showCustom: false, customText: "", customError: "" };
      afterDataChange();
      hooks.notify?.("Отказ зафиксирован");
      hooks.refresh();
    }
  });
}

function handleCaAction(action, config, hooks) {
  const s = ws(config.key);
  hooks.clearNotice?.();
  if (action === "pay:profile-categories") {
    beginPayProfileCategoriesTrip(config, { ...hooks, openProfileForPayCategories: config.openProfileForPayCategories });
    return;
  }
  if (action.startsWith("bucket:")) {
    s.listBucket = action.split(":")[1] || "active";
    clearBulkSelection(s);
    hooks.refresh();
    return;
  }
  if (action === "bulk:clear") {
    clearBulkSelection(s);
    hooks.refresh();
    return;
  }
  if (action === "bulk:edit-open") {
    if (!canBulkIncomingMutate(config)) return;
    s.bulkPanel = "edit";
    s.bulkConfirm = null;
    hooks.refresh();
    return;
  }
  if (action === "bulk:edit-cancel") {
    s.bulkPanel = null;
    hooks.refresh();
    return;
  }
  if (action === "bulk:edit-apply") {
    applyBulkEdit(config, hooks);
    return;
  }
  if (action === "bulk:archive-ask") {
    if (!canBulkIncomingMutate(config)) return;
    s.bulkConfirm = { kind: "archive", count: (s.bulkSelectedIds || []).length };
    hooks.refresh();
    return;
  }
  if (action === "bulk:delete-ask") {
    if (!canBulkIncomingMutate(config)) return;
    s.bulkConfirm = { kind: "delete", count: (s.bulkSelectedIds || []).length };
    hooks.refresh();
    return;
  }
  if (action === "bulk:unarchive-ask") {
    if (!canBulkIncomingMutate(config)) return;
    s.bulkConfirm = { kind: "unarchive", count: (s.bulkSelectedIds || []).length };
    hooks.refresh();
    return;
  }
  if (action === "bulk:restore-ask") {
    if (!canBulkIncomingMutate(config)) return;
    s.bulkConfirm = { kind: "restore", count: (s.bulkSelectedIds || []).length };
    hooks.refresh();
    return;
  }
  if (action === "bulk:confirm-no") {
    s.bulkConfirm = null;
    hooks.refresh();
    return;
  }
  if (action === "bulk:confirm-yes") {
    const kind = s.bulkConfirm?.kind;
    if (!kind) return;
    applyBulkArchiveDelete(config, hooks, kind);
    return;
  }
  if (action.startsWith("nav:")) {
    const v = action.split(":")[1];
    if (v === "profile") {
      config.openProfile?.();
      return;
    }
    if (v === "detail") s.view = "detail";
    else s.view = v;
    if (v === "list") {
      if (s.view === "manual") syncManualDraftFromDom(s);
      if (s.showRefusal) syncRefusalDraftFromDom(s);
      s.selectedId = null;
      s.purchaseViewId = null;
      s.inlineReview = null;
      s.inlinePanel = null;
      s.detailPickStage = false;
      s.showRefusal = null;
      s.payDraft = null;
      clearPayProfileReturnContext(config.key);
    }
    hooks.refresh();
    return;
  }
  if (action.startsWith("analytics-tab:")) {
    s.analyticsTab = action.split(":")[1];
    activeTab = s.analyticsTab;
    hooks.refresh();
    return;
  }
  if (action.startsWith("funnel:preset:")) {
    applyFunnelPreset(s, action.split(":")[2]);
    hooks.refresh();
    return;
  }
  if (action === "panel:pay") {
    s.inlinePanel = "pay";
    s.showRefusal = null;
    s.detailPickStage = false;
    s.inlineReview = null;
    const appeal = appeals.find((a) => a.id === s.selectedId);
    s.payDraft = null;
    if (appeal) initPayDraft(config, s, appeal);
    hooks.refresh();
    return;
  }
  if (action === "panel:pick") {
    s.detailPickStage = true;
    s.inlinePanel = null;
    hooks.refresh();
    return;
  }
  if (action === "panel:return") {
    s.inlineReview = { appealId: s.selectedId, stageId: SYSTEM.RETURN };
    hooks.refresh();
    return;
  }
  if (action === "panel:cancel") {
    s.inlinePanel = null;
    s.detailPickStage = false;
    s.showRefusal = null;
    s.inlineReview = null;
    s.payDraft = null;
    clearPayProfileReturnContext(config.key);
    hooks.refresh();
    return;
  }
  if (action.startsWith("refusal:pick:")) {
    const reason = decodeURIComponent(action.split(":").slice(2).join(":"));
    if (!s.refusalDraft) s.refusalDraft = { reason: "", comment: "", showCustom: false, customText: "", customError: "" };
    syncRefusalDraftFromDom(s);
    s.refusalDraft.reason = reason;
    s.refusalDraft.customError = "";
    hooks.refresh();
    return;
  }
  if (action === "refusal:custom-toggle") {
    if (!s.refusalDraft) s.refusalDraft = { reason: "", comment: "", showCustom: false, customText: "", customError: "" };
    syncRefusalDraftFromDom(s);
    s.refusalDraft.showCustom = !s.refusalDraft.showCustom;
    hooks.refresh();
    return;
  }
  if (action === "refusal:custom-cancel") {
    syncRefusalDraftFromDom(s);
    s.refusalDraft.showCustom = false;
    s.refusalDraft.customText = "";
    s.refusalDraft.customError = "";
    hooks.refresh();
    return;
  }
  if (action === "refusal:custom-add") {
    syncRefusalDraftFromDom(s);
    const appeal = appeals.find((a) => a.id === s.selectedId);
    const res = addWorkspaceReason(config, s.refusalDraft.customText);
    if (!res.ok) {
      s.refusalDraft.customError = res.error;
      if (res.existing) s.refusalDraft.reason = res.existing;
      hooks.refresh();
      return;
    }
    s.refusalDraft.reason = res.value;
    s.refusalDraft.showCustom = false;
    s.refusalDraft.customText = "";
    s.refusalDraft.customError = "";
    hooks.refresh();
    return;
  }
  if (action === "stage:custom-toggle") {
    syncStageDraftFromDom(s);
    if (!s.stageDraft) s.stageDraft = { selectedStageId: "", showCustom: false, customText: "", customError: "" };
    s.stageDraft.showCustom = !s.stageDraft.showCustom;
    hooks.refresh();
    return;
  }
  if (action === "stage:custom-cancel") {
    syncStageDraftFromDom(s);
    s.stageDraft.showCustom = false;
    s.stageDraft.customText = "";
    s.stageDraft.customError = "";
    hooks.refresh();
    return;
  }
  if (action === "stage:custom-add") {
    syncStageDraftFromDom(s);
    const res = addWorkspaceStage(config, s.stageDraft.customText);
    if (!res.ok) {
      s.stageDraft.customError = res.error;
      if (res.existing) s.stageDraft.selectedStageId = res.existing.id;
      hooks.refresh();
      return;
    }
    s.stageDraft.selectedStageId = res.stage.id;
    s.stageDraft.showCustom = false;
    s.stageDraft.customText = "";
    s.stageDraft.customError = "";
    hooks.refresh();
    return;
  }
  if (action === "manual:custom-toggle") {
    syncManualDraftFromDom(s);
    s.manualDraft.showCustomChannel = !s.manualDraft.showCustomChannel;
    hooks.refresh();
    return;
  }
  if (action === "manual:custom-cancel") {
    syncManualDraftFromDom(s);
    s.manualDraft.showCustomChannel = false;
    s.manualDraft.customChannelText = "";
    s.manualDraft.customChannelError = "";
    hooks.refresh();
    return;
  }
  if (action === "manual:custom-add") {
    syncManualDraftFromDom(s);
    const res = addWorkspaceChannel(config, s.manualDraft.customChannelText);
    if (!res.ok) {
      s.manualDraft.customChannelError = res.error;
      if (res.key) s.manualDraft.source = res.key;
      hooks.refresh();
      return;
    }
    s.manualDraft.source = res.channel.key;
    s.manualDraft.showCustomChannel = false;
    s.manualDraft.customChannelText = "";
    s.manualDraft.customChannelError = "";
    hooks.refresh();
    return;
  }
  if (action === "pay:add-row") {
    syncPayDraftFromDom(config, s);
    const cats = payCategoriesFor(config);
    if (!cats.length) {
      hooks.notify?.("Добавьте категории в профиле", "error");
      return;
    }
    if (s.payDraft) s.payDraft.rows.push(defaultPayRow(config));
    hooks.refresh();
    return;
  }
  if (action.startsWith("pay:remove-row:")) {
    syncPayDraftFromDom(config, s);
    const idx = Number(action.split(":")[2]);
    if (s.payDraft && s.payDraft.rows.length > 1) s.payDraft.rows.splice(idx, 1);
    hooks.refresh();
    return;
  }
  if (action === "pay:delay-all-toggle") {
    syncPayDraftFromDom(config, s);
    applyPayDelayAllSync(s);
    hooks.refresh();
    return;
  }
  if (action === "settings:discard") {
    s.settingsDraft = JSON.parse(JSON.stringify(partnerSettingsMerged(RECEIVING.id) || partnerSettings[RECEIVING.id]));
    hooks.refresh();
    return;
  }
  if (action.startsWith("settings:up:")) {
    syncSettingsDraftFromWorkspace(s);
    const idx = Number(action.split(":")[2]);
    if (idx > 0) {
      const tmp = s.settingsDraft.workingStages[idx - 1];
      s.settingsDraft.workingStages[idx - 1] = s.settingsDraft.workingStages[idx];
      s.settingsDraft.workingStages[idx] = tmp;
    }
    hooks.refresh();
    return;
  }
  if (action.startsWith("settings:down:")) {
    syncSettingsDraftFromWorkspace(s);
    const idx = Number(action.split(":")[2]);
    if (idx < s.settingsDraft.workingStages.length - 1) {
      const tmp = s.settingsDraft.workingStages[idx + 1];
      s.settingsDraft.workingStages[idx + 1] = s.settingsDraft.workingStages[idx];
      s.settingsDraft.workingStages[idx] = tmp;
    }
    hooks.refresh();
    return;
  }
  if (action.startsWith("settings:remove-reason:")) {
    syncSettingsDraftFromWorkspace(s);
    const idx = Number(action.split(":")[2]);
    const removed = s.settingsDraft.refusalReasons.splice(idx, 1)[0];
    if (removed) s.settingsDraft.archivedStages.push({ id: `arch_reason_${removed}`, label: `Причина: ${removed}` });
    hooks.refresh();
    return;
  }
  if (action.startsWith("settings:restore:")) {
    const idx = Number(action.split(":")[2]);
    const restored = s.settingsDraft.archivedStages.splice(idx, 1)[0];
    if (restored) s.settingsDraft.workingStages.push(restored);
    hooks.refresh();
    return;
  }
  if (action.startsWith("tab:")) {
    s.tab = action.split(":")[1];
    activeTab = s.tab;
    clearBulkSelection(s);
    hooks.refresh();
    return;
  }
  if (action.startsWith("open:")) {
    s.selectedId = action.split(":")[1];
    activeTab = s.tab;
    s.view = "detail";
    hooks.refresh();
    return;
  }
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
  if (action === "refusal:open") {
    s.showRefusal = s.selectedId;
    s.inlinePanel = null;
  s.detailPickStage = false;
    if (!s.refusalDraft) s.refusalDraft = { reason: "", comment: "", showCustom: false, customText: "", customError: "" };
    hooks.refresh();
    return;
  }
  if (action === "refusal:cancel" || action === "refusal:panel-cancel") {
    syncRefusalDraftFromDom(s);
    s.showRefusal = null;
    hooks.refresh();
    return;
  }
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
    s.partnerSettingsLocal = JSON.parse(JSON.stringify(s.settingsDraft));
    s.partnerOverlay.refusalReasons = [];
    s.partnerOverlay.workingStages = [];
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

export function refreshClientPurchaseLedgerForWallet() {
  appeals.forEach((a) => {
    if (a.ledgerRecorded && a.paidAt) syncWalletFromAppeal(a);
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
