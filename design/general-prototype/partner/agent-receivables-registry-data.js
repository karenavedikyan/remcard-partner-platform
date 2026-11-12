/** Shared demo rows for agent registry UI and wallet totals. */

export const PARTNERS = [
  { id: "materials", name: "Дом материалов", city: "Краснодар", debt: 0, orders: 0, status: "open" },
  { id: "tile", name: "Керамика Юг", city: "Сочи", debt: 0, orders: 0, status: "open" },
  { id: "light", name: "Студия света", city: "Краснодар", debt: 0, orders: 0, status: "paid" },
];

export const ORDERS = [
  {
    id: "ord-101",
    partnerId: "materials",
    number: "ЗАК-ДЕМО-101",
    client: "Клиент А.",
    total: 7500,
    status: "open",
    pending: 1200,
    suspended: 0,
    at: "2026-10-10T14:00:00+03:00",
    lines: [
      { title: "Плитка напольная", amount: 5000 },
      { title: "Клей и затирка", amount: 2500 },
    ],
    history: [
      { at: "2026-10-10T14:00:00+03:00", title: "Возникло обязательство", note: "Покупка подтверждена магазином" },
      { at: "2026-10-11T10:00:00+03:00", title: "Частичное поступление", note: "Подтверждено получение 1 300 ₽" },
    ],
  },
  {
    id: "ord-102",
    partnerId: "materials",
    number: "ЗАК-ДЕМО-102",
    client: "Клиент Б.",
    total: 5000,
    status: "pending",
    pending: 5000,
    suspended: 0,
    at: "2026-10-12T11:00:00+03:00",
    lines: [{ title: "Светильники", amount: 5000 }],
    history: [{ at: "2026-10-12T11:00:00+03:00", title: "Ожидает подтверждения покупки", note: "Не входит в подтверждённый баланс" }],
  },
  {
    id: "ord-201",
    partnerId: "tile",
    number: "ЗАК-ДЕМО-201",
    client: "Клиент В.",
    total: 4200,
    status: "open",
    pending: 0,
    suspended: 0,
    at: "2026-10-09T09:30:00+03:00",
    lines: [{ title: "Керамогранит", amount: 4200 }],
    history: [{ at: "2026-10-09T09:30:00+03:00", title: "Обязательство согласовано", note: "Ожидает выплаты от магазина" }],
  },
  {
    id: "ord-301",
    partnerId: "light",
    number: "ЗАК-ДЕМО-301",
    client: "Клиент Г.",
    total: 1800,
    status: "paid",
    pending: 0,
    suspended: 0,
    at: "2026-10-05T16:00:00+03:00",
    lines: [{ title: "Люстра", amount: 1800 }],
    history: [
      { at: "2026-10-05T16:00:00+03:00", title: "Начисление", note: "Покупка подтверждена" },
      { at: "2026-10-07T12:00:00+03:00", title: "Выплата получена", note: "Долг закрыт" },
    ],
  },
];

export function filterOrders(s) {
  let rows = ORDERS.slice();
  if (s.partnerId) rows = rows.filter((o) => o.partnerId === s.partnerId);
  if (s.status && s.status !== "all") rows = rows.filter((o) => o.status === s.status);
  if (s.q?.trim()) {
    const q = s.q.trim().toLowerCase();
    rows = rows.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        o.client.toLowerCase().includes(q) ||
        PARTNERS.find((p) => p.id === o.partnerId)?.name.toLowerCase().includes(q),
    );
  }
  if (s.from) {
    rows = rows.filter((o) => o.at.slice(0, 10) >= s.from);
  }
  if (s.to) {
    rows = rows.filter((o) => o.at.slice(0, 10) <= s.to);
  }
  if (s.sort === "debt-desc") rows.sort((a, b) => b.total - a.total);
  if (s.sort === "date-desc") rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return rows;
}

export function syncPartnerDebtFields() {
  for (const p of PARTNERS) {
    const scoped = ORDERS.filter((o) => o.partnerId === p.id);
    p.orders = scoped.length;
    p.debt = scoped.filter((o) => o.status === "open").reduce((n, o) => n + o.total, 0);
  }
}

export function agentRegistryOverviewTotals() {
  const confirmed = ORDERS.filter((o) => o.status === "open").reduce((n, o) => n + o.total, 0);
  const pending = ORDERS.filter((o) => o.status === "pending").reduce((n, o) => n + (o.pending || 0), 0);
  const suspended = ORDERS.reduce((n, o) => n + (o.suspended || 0), 0);
  return {
    confirmed,
    pending,
    suspended,
    openCount: ORDERS.filter((o) => o.status === "open").length,
    pendingCount: ORDERS.filter((o) => o.status === "pending").length,
  };
}

syncPartnerDebtFields();
