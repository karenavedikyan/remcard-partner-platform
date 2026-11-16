import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
  ReceivingAppealListRow,
  ReceivingAppealsListResponse,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsList } from "./ReceivingAppealsList";

const at = "2026-11-10T10:00:00.000Z";

function row(over: Partial<ReceivingAppealListRow>): ReceivingAppealListRow {
  return {
    id: "r1",
    clientName: "Анна Смирнова",
    certificateId: "cert_internal_999",
    receivingPartnerUserId: "u1",
    receivingPartnerId: "u1",
    referrerPartnerId: "ref1",
    interest: "Кухня",
    stageId: "sys_new",
    createdAt: at,
    updatedAt: at,
    manualEntry: false,
    ...over,
  };
}

function data(appeals: ReceivingAppealListRow[], over: Partial<ReceivingAppealsListResponse> = {}): ReceivingAppealsListResponse {
  return {
    appeals,
    readOnly: false,
    kpis: { total: 3, inWork: 2, paid: 1, shipped: 0, conv: "33%" },
    ...over,
  } as ReceivingAppealsListResponse;
}

function Harness({ appeals, onBulk = vi.fn() }: { appeals: ReceivingAppealListRow[]; onBulk?: (a: string) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <ReceivingAppealsList
      data={data(appeals)}
      stageLabelById={(r) => (r.stageId === "sys_new" ? "Новое обращение" : r.stageId)}
      bulk={{
        selectedIds: sel,
        contractState: "ready",
        onToggleRow: (id, checked) =>
          setSel((cur) => {
            const next = new Set(cur);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          }),
        onToggleSelectAll: (ids, checked) => setSel(checked ? new Set(ids) : new Set()),
        onBulkAction: (a) => (a === "clear" ? setSel(new Set()) : onBulk(a)),
      }}
      bulkConfirmSlot={<div data-testid="slot-confirm" />}
      bulkEditSlot={<div data-testid="slot-edit" />}
      onOpenAppeal={vi.fn()}
      onNavigateAnalytics={vi.fn()}
    />
  );
}

const APPEALS = [
  row({ id: "r1", referrerDisplayName: "Салон «Диван»" }),
  row({ id: "r2", clientName: "Борис", certificateId: "cert_internal_888", referrerDisplayName: null, interest: "" }),
  row({ id: "r3", clientName: "Вера", certificateId: "", manualEntry: true }),
];

describe("Receiving list — prototype composition", () => {
  it("source column shows who referred, never an internal certificate id; empty request is a dash", () => {
    render(<Harness appeals={APPEALS} />);
    const rows = screen.getAllByRole("button", { name: /Анна|Борис|Вера/ });
    expect(rows[0]).toHaveTextContent("Направил: Салон «Диван»");
    expect(rows[1]).toHaveTextContent("По сертификату");
    expect(rows[2]).toHaveTextContent("Добавлен вручную");
    expect(document.body.textContent).not.toMatch(/cert_internal|\br[123]\b/);
    expect(rows[1].querySelector(".ca-row-request")).toHaveTextContent("—");
  });

  it("blocks follow the prototype order and the bar is absent until a row is selected", async () => {
    const user = userEvent.setup();
    render(<Harness appeals={APPEALS} />);
    const order = [
      "ca-receiving-bucket-tabs",
      "ca-receiving-kpi-strip",
      "ca-receiving-toolbar",
      "slot-confirm",
      "slot-edit",
      "ca-receiving-filters",
    ].map((id) => screen.getByTestId(id));
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
    expect(screen.queryByText(/Выбрано:/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/BLK-|POST \/api/);

    await user.click(screen.getByRole("checkbox", { name: "Выбрать Анна Смирнова" }));
    const bar = screen.getByTestId("ca-receiving-bulk-actions");
    expect(bar).toHaveTextContent("Выбрано: 1");
    expect(order[2].compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(screen.getByTestId("ca-receiving-filters")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(within(bar).getByRole("button", { name: "Сбросить выбор" }));
    expect(screen.queryByTestId("ca-receiving-bulk-actions")).not.toBeInTheDocument();
  });

  it("select all exists for desktop head and mobile and keeps a mixed state", async () => {
    const user = userEvent.setup();
    render(<Harness appeals={APPEALS} />);
    const head = screen.getByRole("checkbox", { name: "Все найденные (3)" }) as HTMLInputElement;
    const mobile = screen.getByRole("checkbox", { name: "Выбрать все" });
    expect(mobile).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Выбрать Вера" }));
    expect(head.indeterminate).toBe(true);
    await user.click(head);
    expect(screen.getByTestId("ca-receiving-bulk-actions")).toHaveTextContent("Выбрано: 3");
    expect(head.indeterminate).toBe(false);
  });

  it("KPI strip has the four prototype tiles taken from the server cohort", () => {
    render(<Harness appeals={APPEALS} />);
    const tiles = within(screen.getByTestId("ca-receiving-kpi-strip")).getAllByRole("listitem");
    expect(tiles.map((t) => t.textContent)).toEqual(["В работе2", "Оплачено1", "Отгружено0", "Конверсия в оплату33%"]);
  });

  it("analytics is a real navigation, not a notice", async () => {
    const user = userEvent.setup();
    const nav = vi.fn();
    render(<ReceivingAppealsList data={data(APPEALS)} onNavigateAnalytics={nav} />);
    await user.click(screen.getByRole("button", { name: "Аналитика" }));
    expect(nav).toHaveBeenCalledTimes(1);
  });
});
