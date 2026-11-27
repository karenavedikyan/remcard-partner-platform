/**
 * R2 repair-object fixtures for cabinet Clients (prototype only, demo-memory).
 * Public observer models — no costs, rewards, or private customer data.
 */
import { observerGuestHash, compressGuestHash } from "./guest-embed-payloads.js";

export const R2_REPAIR_OBJECT_PAGES = new Set([141, 142]);

export function isPrototypeR2Release() {
  try {
    return window.rcDemoMemory?.getItem?.("rc_release") === "2";
  } catch (_) {
    return false;
  }
}

/** @type {import("./repair-objects-r2.js").RepairObjectFixture[]} */
export const REPAIR_OBJECT_FIXTURES = [
  {
    id: "r2-obj-krd-aurora",
    name: "Квартира · ЖК «Аврора»",
    address: "Краснодар, ул. Зиповская, 12, кв. 84",
    clientLabel: "Семён Рогов",
    clientRelation: "Договор подряда · клиент направившего",
    stageLabel: "Монтаж дверных блоков",
    assignment: {
      id: "r2-asg-krd-doors",
      title: "Монтаж межкомнатных дверей · Аврора",
      recipient: "Бригада «Север»",
      deadline: "2026-12-01",
      terms: "Демо-поручение: снимок выбранного объекта. Без подписи и отправки.",
    },
    observerToken: "R2-OBJ-KRD-AURORA",
    stages: [
      {
        title: "Подготовка",
        status: "completed",
        subs: [
          {
            title: "Замер и согласование",
            tasks: [
              { title: "Замер проёмов", done: true },
              { title: "Согласование комплектации", done: true },
            ],
          },
        ],
      },
      {
        title: "Монтаж",
        status: "active",
        subs: [
          {
            title: "Дверные блоки",
            tasks: [
              { title: "Установка коробок", done: true },
              { title: "Навеска полотен", done: false },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "r2-obj-spb-loft",
    name: "Лофт · БЦ «Невский берег»",
    address: "Санкт-Петербург, наб. Фонтанки, 45",
    clientLabel: "ООО «Светлый интерьер»",
    clientRelation: "Заказчик ремонта · партнёр-исполнитель",
    stageLabel: "Чистовая отделка",
    assignment: {
      id: "r2-asg-spb-finish",
      title: "Чистовая отделка зоны ресепшен",
      recipient: "Спецбригада № 7",
      deadline: "2026-11-28",
      terms: "Демо-поручение Navigator. Изменения в кабинете не сохраняются.",
    },
    observerToken: "R2-OBJ-SPB-LOFT",
    stages: [
      {
        title: "Черновые работы",
        status: "completed",
        subs: [
          {
            title: "Инженерные сети",
            tasks: [
              { title: "Разводка освещения", done: true },
              { title: "Штробление под слаботочку", done: true },
            ],
          },
        ],
      },
      {
        title: "Чистовая",
        status: "review",
        subs: [
          {
            title: "Приёмка заказчиком",
            tasks: [
              { title: "Покраска стен", done: true },
              { title: "Монтаж рейки", done: false },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "r2-obj-ekb-draft",
    name: "Черновик объекта · без поручения",
    address: "Екатеринбург, ул. Малышева, 36",
    clientLabel: "Карточка создана",
    clientRelation: "Объект заведён · поручение не выдано",
    stageLabel: "Ожидает планирования",
    assignment: null,
    observerToken: "R2-OBJ-EKB-DRAFT",
    stages: [
      {
        title: "Планирование",
        status: "todo",
        subs: [
          {
            title: "Старт",
            tasks: [{ title: "Назначить исполнителя", done: false }],
          },
        ],
      },
    ],
  },
];

export function repairObjectById(id) {
  if (!id) return null;
  return REPAIR_OBJECT_FIXTURES.find((row) => row.id === id) || null;
}

export function filterRepairObjects(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  return REPAIR_OBJECT_FIXTURES.filter((row) => {
    if (!q) return true;
    const hay = `${row.id} ${row.name} ${row.address} ${row.clientLabel}`.toLowerCase();
    return hay.includes(q);
  });
}

/** Demo repair fixtures have no per-branch mapping; scoped employees see an honest empty state. */
export function employeeRepairScopeAllowsDemo(scope) {
  return scope === "all" || scope === "office";
}

export function observerPublicModel(fixture) {
  if (!fixture) return null;
  return {
    version: 1,
    token: fixture.observerToken,
    name: fixture.name,
    address: fixture.address,
    showCosts: false,
    stages: fixture.stages,
  };
}

export function assignmentHandoffModel(fixture) {
  if (!fixture?.assignment) return null;
  const a = fixture.assignment;
  return {
    version: 1,
    id: a.id,
    title: a.title,
    object: fixture.name,
    address: fixture.address,
    recipient: a.recipient,
    deadline: a.deadline,
    budget: null,
    terms: a.terms,
    created: "2026-11-01",
    tasks: [
      {
        title: "Подготовить объект к этапу",
        group: fixture.stageLabel,
        description: `Клиент: ${fixture.clientLabel}. ${fixture.clientRelation}`,
      },
      {
        title: "Отчитаться в Navigator",
        group: "Демо",
        description: "Прототип без отправки отчёта.",
      },
    ],
  };
}

export function observerHashForObject(objectId) {
  const model = observerPublicModel(repairObjectById(objectId));
  return model ? observerGuestHash(model) : "";
}

export function assignmentHashForObject(objectId) {
  const model = assignmentHandoffModel(repairObjectById(objectId));
  return model ? compressGuestHash(model) : "";
}

export function buildRepairEmbedCtx(pageN, objectId, extra = {}) {
  const fixture = repairObjectById(objectId);
  if (!fixture) {
    return {
      source: "client-appeals",
      pageN,
      r2Repair: true,
      repairObjectId: objectId,
      missingRepairObject: true,
      naMessage: "Объект ремонта не найден или недоступен в демо-снимке.",
    };
  }
  if (pageN === 141) {
    const model = assignmentHandoffModel(fixture);
    if (!model) {
      return {
        source: "client-appeals",
        pageN,
        r2Repair: true,
        repairObjectId: objectId,
        assignmentUnavailable: true,
        naMessage: "Для выбранного объекта нет поручения. Выберите другой объект или создайте поручение в рабочей системе.",
      };
    }
    return {
      source: "client-appeals",
      pageN,
      r2Repair: true,
      repairObjectId: objectId,
      repairObjectLabel: fixture.name,
      guestHash: assignmentHashForObject(objectId),
      guestReady: true,
      ...extra,
    };
  }
  if (pageN === 142) {
    return {
      source: "client-appeals",
      pageN,
      r2Repair: true,
      repairObjectId: objectId,
      repairObjectLabel: fixture.name,
      guestHash: observerHashForObject(objectId),
      guestReady: true,
      readOnlyObserver: true,
      ...extra,
    };
  }
  return { source: "client-appeals", pageN, r2Repair: true, repairObjectId: objectId, ...extra };
}
