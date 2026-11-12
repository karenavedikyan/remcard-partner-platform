// Demo XLSX for agent receivables registry — whole current filter (all pages).
import { loadExcelLibrary } from "./settlement-export.js";
import { filterOrders, filterPartners } from "./agent-receivables-registry-data.js";

function buildExportModel(s) {
  const rows = filterOrders(s);
  const { rows: partnerRows } = filterPartners(s, !s.partnerId);
  const partners = partnerRows.map((p) => {
    const scoped = rows.filter((o) => o.partnerId === p.id);
    const confirmed = scoped.filter((o) => o.status === "open").reduce((n, o) => n + o.total, 0);
    const pending = scoped.filter((o) => o.status === "pending").reduce((n, o) => n + o.pending, 0);
    return {
      id: p.id,
      name: p.name,
      city: p.city,
      orders: scoped.length,
      confirmed,
      pending,
    };
  });
  const orders = rows.map((o) => {
    const partner = PARTNERS.find((p) => p.id === o.partnerId);
    return {
      id: o.id,
      partner: partner?.name || o.partnerId,
      number: o.number,
      client: o.client,
      status: o.status,
      total: o.total,
      pending: o.pending,
      at: o.at?.slice(0, 10) || "",
    };
  });
  const info = [
    ["Тип данных", "ДЕМО агента. Учебные начисления, не выгрузка рабочего ЛК."],
    ["Область", s.partnerId ? `Партнёр ${PARTNERS.find((p) => p.id === s.partnerId)?.name || s.partnerId}` : "Все партнёры"],
    ["Поиск", s.q || "Без поиска"],
    ["Статус", s.status],
    ["Период", `${s.from || "—"} — ${s.to || "—"}`],
    ["Строк в файле", String(rows.length)],
    ["Страницы", "Весь текущий отбор, не только видимая страница"],
  ];
  return { info, partners, orders, count: rows.length };
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function createWorkbook(model, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RemCard · учебный прототип агента";
  wb.created = new Date();
  const addSheet = (name, headers, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = headers.map((h) => ({ header: h.label, key: h.key, width: h.width || 18 }));
    rows.forEach((row) => ws.addRow(row));
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    return ws;
  };
  addSheet(
    "Описание",
    [
      { key: "key", label: "Параметр", width: 28 },
      { key: "value", label: "Значение", width: 64 },
    ],
    model.info.map(([key, value]) => ({ key, value })),
  );
  addSheet(
    "Партнёры",
    [
      { key: "name", label: "Партнёр", width: 32 },
      { key: "city", label: "Город" },
      { key: "orders", label: "Заказов в отборе" },
      { key: "confirmed", label: "Подтверждено, ₽" },
      { key: "pending", label: "Ожидает, ₽" },
    ],
    model.partners,
  );
  addSheet(
    "Заказы",
    [
      { key: "number", label: "Заказ" },
      { key: "partner", label: "Партнёр", width: 30 },
      { key: "client", label: "Клиент", width: 24 },
      { key: "status", label: "Статус" },
      { key: "total", label: "Сумма, ₽" },
      { key: "pending", label: "Ожидает, ₽" },
      { key: "at", label: "Дата" },
    ],
    model.orders,
  );
  return wb;
}

export async function downloadAgentReceivablesExport(s) {
  const model = buildExportModel(s);
  const ExcelJS = await loadExcelLibrary();
  const wb = await createWorkbook(model, ExcelJS);
  const buffer = await wb.xlsx.writeBuffer();
  const day = new Date().toISOString().slice(0, 10);
  triggerDownload(buffer, `RemCard-agent-receivables-demo-${day}.xlsx`);
  return model.count;
}

