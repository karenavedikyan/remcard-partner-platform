import type { SettlementExportRow } from "./ledger";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadSettlementExportCsv(rows: SettlementExportRow[], filenameStem: string) {
  const header = [
    "Направление",
    "Партнёр",
    "Заказ",
    "Сумма",
    "Статус",
    "Создано",
    "Основание",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.direction,
        row.counterparty,
        row.orderId,
        row.amount,
        row.status,
        row.createdAt,
        row.basis,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF", lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameStem}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
