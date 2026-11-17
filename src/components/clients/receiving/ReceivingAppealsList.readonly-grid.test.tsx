import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReceivingAppealListRow, ReceivingAppealsListResponse } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsList } from "./ReceivingAppealsList";

const at = "2026-11-10T10:00:00.000Z";
const rows: ReceivingAppealListRow[] = ["r1", "r2"].map((id) => ({
  id,
  clientName: `Клиент ${id}`,
  certificateId: "",
  receivingPartnerUserId: "u1",
  receivingPartnerId: "u1",
  referrerPartnerId: "ref1",
  interest: "Кухня",
  stageId: "sys_new",
  createdAt: at,
  updatedAt: at,
  manualEntry: true,
}));
const data = { appeals: rows, readOnly: false } as ReceivingAppealsListResponse;

const bulk = {
  selectedIds: new Set<string>(),
  contractState: "ready" as const,
  onToggleRow: vi.fn(),
  onToggleSelectAll: vi.fn(),
  onBulkAction: vi.fn(),
};

function mount(readOnly: boolean) {
  return render(
    <ReceivingAppealsList
      data={data}
      readOnly={readOnly}
      bulk={readOnly ? undefined : bulk}
      stageLabelById={() => "Новое обращение"}
      onOpenAppeal={vi.fn()}
      onNavigateAnalytics={vi.fn()}
    />,
  );
}

function shape(container: HTMLElement) {
  const list = container.querySelector(".ca-rows") as HTMLElement;
  const head = list.querySelector(".ca-row--head") as HTMLElement;
  const lane = list.querySelector(".ca-row-lane") as HTMLElement;
  const rowButton = lane.querySelector("button.ca-row") as HTMLElement;
  return {
    list,
    headColumns: head.children.length,
    rowColumns: (lane.querySelector(".ca-row-check") ? 1 : 0) + rowButton.children.length,
    laneChildren: lane.children.length,
  };
}

describe("V1: read-only (VIEWER) list has no checkbox column anywhere", () => {
  it("no checkboxes; head and row have the same number of columns; no bulk grid modifier", () => {
    const { container } = mount(true);
    expect(container.querySelectorAll("input[type=checkbox]")).toHaveLength(0);
    const s = shape(container);
    expect(s.headColumns).toBe(7);
    expect(s.headColumns).toBe(s.rowColumns);
    expect(s.laneChildren).toBe(1);
    expect(s.list.classList.contains("ca-rows--bulk")).toBe(false);
    expect(container.querySelector(".ca-row-check")).toBeNull();
  });

  it("the owner/seller list keeps the checkbox column in head and rows", () => {
    const { container } = mount(false);
    const s = shape(container);
    expect(container.querySelectorAll("input[type=checkbox]").length).toBeGreaterThan(0);
    expect(s.headColumns).toBe(8);
    expect(s.headColumns).toBe(s.rowColumns);
    expect(s.list.classList.contains("ca-rows--bulk")).toBe(true);
  });
});

describe("V1: grid templates agree with the markup", () => {
  const css = readFileSync(join(__dirname, "receiving.module.css"), "utf8");
  const tracks = (template: string) => template.trim().split(/\s+(?![^()]*\))/).length;
  const template = (selector: string) => {
    const at = css.indexOf(selector);
    expect(at).toBeGreaterThan(-1);
    const m = /grid-template-columns:([^;}]+)/.exec(css.slice(at, at + 600));
    return m![1]!;
  };

  it("plain head/row grid has 7 tracks, bulk head grid has 8 (checkbox + 7)", () => {
    const row = tracks(template(".clientsScope :global(.ca-row){display:grid"));
    const bulkHead = tracks(template(".clientsScope :global(.ca-rows--bulk .ca-row--head)"));
    expect(row).toBe(7);
    expect(bulkHead).toBe(8);
  });

  it("the checkbox lane column is applied only under the bulk modifier", () => {
    expect(css).toContain(".clientsScope :global(.ca-rows--bulk .ca-row-lane){grid-template-columns:32px minmax(0,1fr)}");
    expect(css).not.toMatch(/\.clientsScope :global\(\.ca-row-lane\)\{[^}]*32px/);
  });
});
