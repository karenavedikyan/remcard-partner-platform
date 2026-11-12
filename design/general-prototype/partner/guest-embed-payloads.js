import { a as lzMod } from "./chunk-HYSRPJ57.js";
import { c as wrapCjs } from "./chunk-5TBO732O.js";
import { certificatePublicModel } from "./certificate-view.js";

const lz = wrapCjs(lzMod(), 1);

export function compressGuestHash(payload) {
  const raw = lz.default.compressToEncodedURIComponent(JSON.stringify(payload));
  if (!raw) throw new Error("guest hash compress failed");
  return raw;
}

export function certificateGuestHash(record) {
  return compressGuestHash(certificatePublicModel(record));
}

function recommendationCode(record) {
  const digits = String(record?.id || record?.displayCode || "1")
    .replace(/\D/g, "")
    .slice(-4);
  return `DEMO-PROF-${digits || "1"}`;
}

/** Allowlisted public recommendation page model (matches recommendation-guest parser). */
export function recommendationPublicModel(record) {
  if (!record) return null;
  const byPartner = new Map();
  for (const term of record.terms || []) {
    const name = term.partnerName || record.partner || "Партнёр";
    if (!byPartner.has(name)) byPartner.set(name, { name, categories: [] });
    byPartner.get(name).categories.push({
      category: term.categoryName || record.category || "Условия",
      discount: Math.min(100, Math.max(0, Number(term.discount) || 0)),
    });
  }
  if (!byPartner.size) {
    byPartner.set(record.partner || "Партнёр", {
      name: record.partner || "Партнёр",
      categories: [{ category: record.category || "Условия", discount: 0 }],
    });
  }
  return {
    kind: "prof-recommendation",
    code: recommendationCode(record),
    partners: [...byPartner.values()],
  };
}

export function recommendationGuestHash(record) {
  const model = recommendationPublicModel(record);
  return model ? compressGuestHash(model) : "";
}

/** Fixed public sample for guest 140 when no certificate handoff (matches recommendation parser). */
export function recommendationDesignSampleModel() {
  return {
    kind: "prof-recommendation",
    code: "DEMO-PROF-1",
    partners: [
      {
        name: "Пример партнёра",
        categories: [{ category: "Двери и фурнитура", discount: 10 }],
      },
    ],
  };
}

export function recommendationDesignSampleHash() {
  return compressGuestHash(recommendationDesignSampleModel());
}

/**
 * Navigator repair-object observer — TOC / standalone sample only (entry 142).
 * Not used from client-appeals embed (no object handoff). Not appeal data.
 */
export function observerDesignSampleModel() {
  return {
    version: 1,
    token: "DESIGN-SAMPLE-OBSERVER",
    name: "Демонстрационный объект ремонта",
    address: "Краснодар · макет без привязки к кабинету",
    showCosts: false,
    stages: [
      {
        title: "Подготовка объекта",
        status: "active",
        subs: [
          {
            title: "Пример этапов Navigator",
            tasks: [
              { title: "Демо: согласование плана работ", done: true },
              { title: "Демо: следующий этап (без live-синхронизации)", done: false },
            ],
          },
        ],
      },
    ],
  };
}

export function observerDesignSampleHash() {
  return compressGuestHash(observerDesignSampleModel());
}

export function observerGuestHash(model) {
  return model ? compressGuestHash(model) : "";
}

export function clientAppealsPurchaseCtx(purchase, appeal, partnerName) {
  if (!purchase || !appeal) return null;
  const amountDisplay =
    typeof purchase.amountLabel === "string" && purchase.amountLabel.trim()
      ? purchase.amountLabel.trim()
      : null;
  return {
    id: purchase.appealId || appeal.id,
    certCode:
      appeal.certificateId && appeal.certificateId !== "—"
        ? String(appeal.certificateId)
        : "Демо · без сертификата",
    partner: partnerName || null,
    clientLabel: appeal.clientName || null,
    amount: null,
    amountDisplay,
    dateDisplay: null,
    designExample: false,
    sourceAppealId: appeal.id,
    embedSnapshot: true,
    hasCalcSnapshot: false,
    hasRewardSnapshot: false,
    rewardAmount: null,
  };
}

export function clientAppealsReceiptCtx(purchase, appeal, partnerName) {
  const purchaseCtx = clientAppealsPurchaseCtx(purchase, appeal, partnerName);
  if (!purchaseCtx) return null;
  return {
    certCode: purchaseCtx.certCode,
    clientLabel: purchaseCtx.clientLabel || "Клиент",
    partner: purchaseCtx.partner || null,
    amount: null,
    rewardAmount: null,
    hasRewardSnapshot: false,
    dateDisplay: null,
    relatedPurchasePayable: null,
    relatedPurchasePayableDisplay: purchaseCtx.amountDisplay,
    purchaseCtx,
    hasCalcSnapshot: false,
    embedSnapshot: true,
    designExample: false,
  };
}
