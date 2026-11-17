import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ReceivingAppealDetailView,
  type ReceivingAppealDetailActions,
  type ReceivingAppealDetailDto,
} from "./ReceivingAppealDetailView";

const at = "2026-11-10T10:00:00.000Z";

function dto(over: Partial<ReceivingAppealDetailDto> = {}): ReceivingAppealDetailDto {
  return {
    id: "ap_internal_77",
    clientName: "Мария Петрова",
    clientContact: "+7 900 000-00-00",
    interest: "Кухня",
    stageId: "sys_new",
    stageLabel: "Новое обращение",
    originKind: "CERTIFICATE",
    certificateId: "cert_internal_55",
    referrerPartnerName: "Салон «Диван»",
    discountPercent: 7,
    certValidUntil: "2026-12-31T20:59:59.000Z",
    sourceLabel: "По сертификату",
    updatedAt: at,
    createdAt: at,
    receivingOrganizationId: "org_internal_1",
    receivingBranchId: "br_internal_1",
    ...over,
  };
}

function actions(over: Partial<ReceivingAppealDetailActions> = {}): ReceivingAppealDetailActions {
  return {
    expectedRevision: 1,
    workingStages: [{ id: "ws_measure", label: "Замер" }],
    refusalReasons: ["Дорого"],
    onApplyStage: vi.fn().mockResolvedValue(true),
    onSavePrivateNotes: vi.fn(),
    paidReview: { supported: true, onOpen: vi.fn() },
    markPaid: { supported: true, onMarkPaid: vi.fn() },
    ...over,
  };
}

function mount(appeal: ReceivingAppealDetailDto, a: ReceivingAppealDetailActions | undefined, history = [] as never[]) {
  return render(
    <ReceivingAppealDetailView
      status="ready"
      appeal={appeal}
      history={history}
      workingStages={a?.workingStages}
      readOnly={!a}
      actions={a}
      onBack={vi.fn()}
    />,
  );
}

describe("Receiving card — prototype layout and server-aligned next step", () => {
  it("shows the client name, context and current stage in the header, back link keeps its label", () => {
    mount(dto(), actions());
    const head = screen.getByTestId("ca-receiving-subpage-head");
    expect(within(head).getByRole("heading", { name: /Мария Петрова/ })).toBeInTheDocument();
    const title = within(head).getByRole("heading", { name: /Мария Петрова/ });
    expect(title.nextElementSibling).toBe(within(head).getByTestId("ca-receiving-detail-stage-pill"));
    expect(within(head).getByTestId("ca-receiving-detail-stage-pill")).toHaveTextContent("Новое обращение");
    expect(within(head).getByTestId("ca-receiving-detail-context")).toHaveTextContent(/^Обращение от .*2026.* · По сертификату$/);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К списку клиентов");
    expect(screen.queryByRole("heading", { name: "Клиенты" })).not.toBeInTheDocument();
  });

  it("renders a stage ribbon from real system and custom stages with the current step marked", () => {
    mount(dto({ stageId: "ws_measure", stageLabel: "Замер" }), actions());
    const steps = within(screen.getByTestId("ca-receiving-stepper")).getAllByRole("listitem");
    expect(steps.map((s) => s.getAttribute("data-step-state"))).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(steps.map((s) => s.textContent?.replace(/\s*\(.*\)\s*$/, "").trim())).toEqual(["Новое обращение", "Замер", "Оплачено", "Отгружено", "Возврат"]);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[1]).toHaveTextContent("Замер");
  });

  it("the main area never prints the internal appeal id; it lives only in the diagnostics block", () => {
    mount(dto(), actions());
    const root = screen.getByTestId("ca-receiving-appeal-detail");
    const diag = screen.getByTestId("ca-receiving-diagnostics");
    const leaks = Array.from(root.querySelectorAll("*")).filter(
      (el) => !diag.contains(el) && el.children.length === 0 && el.textContent?.includes("ap_internal_77"),
    );
    expect(leaks).toHaveLength(0);
    expect(within(diag).getByTestId("ca-receiving-appeal-id")).toHaveTextContent("ap_internal_77");
    expect(screen.getByTestId("ca-receiving-detail-context")).not.toHaveTextContent("ap_internal_77");
  });

  it("a custom stage named like a system stage never duplicates the ribbon", () => {
    mount(
      dto({ stageId: "ws_dup", stageLabel: "Новое обращение" }),
      actions({ workingStages: [{ id: "ws_dup", label: "Новое обращение" }, { id: "ws_measure", label: "Замер" }] }),
    );
    const steps = within(screen.getByTestId("ca-receiving-stepper")).getAllByRole("listitem");
    const labels = steps.map((s) => s.textContent?.replace(/\s*\(.*\)\s*$/, "").trim());
    expect(labels.filter((l) => l === "Новое обращение")).toHaveLength(1);
    expect(labels).toEqual(["Новое обращение", "Замер", "Оплачено", "Отгружено", "Возврат"]);
    expect(steps.filter((s) => s.getAttribute("aria-current") === "step")).toHaveLength(1);
  });

  it("certificate card shows the frozen term and this partner's purchases; a dash only without a term", () => {
    const { unmount } = mount(
      dto({
        certValidUntil: null,
        certTerm: { validUntil: "2027-03-01T20:59:59.000Z", purchaseLimit: 3, consumedUses: 1, remainingPurchases: 2 },
      }),
      actions(),
    );
    const meta = screen.getByTestId("ca-receiving-cert-meta");
    expect(meta).toHaveTextContent("Действует до");
    expect(meta).toHaveTextContent("2027");
    expect(meta).toHaveTextContent("3 покупки · осталось 2");
    unmount();
    mount(dto({ certValidUntil: null, certTerm: null }), actions());
    expect(screen.getByTestId("ca-receiving-cert-meta")).toHaveTextContent("Действует до—");
  });

  it("NEW without a purchase never offers shipped/return and pays through the existing flow", async () => {
    const a = actions({ workingStages: [] });
    mount(dto(), a);
    expect(screen.queryByTestId("ca-receiving-mark-shipped")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-return")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-pick-toggle")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Следующий шаг: Оплата" })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("ca-receiving-paid-review"));
    expect(a.paidReview && a.paidReview.supported && a.paidReview.onOpen).toHaveBeenCalledTimes(1);
    expect(a.onApplyStage).not.toHaveBeenCalled();
  });

  it("with own stages the primary action moves to the next stage and the pick list excludes paid/shipped/return", async () => {
    const a = actions();
    mount(dto(), a);
    await userEvent.click(screen.getByTestId("ca-receiving-next-primary"));
    expect(a.onApplyStage).toHaveBeenCalledWith({ stageKey: "ws_measure" });
    await userEvent.click(screen.getByTestId("ca-receiving-pick-toggle"));
    const options = within(screen.getByTestId("ca-receiving-stage-select")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["— выберите —", "Замер"]);
  });

  it("refusal needs a reason, folds the comment into the reason and keeps the panel on failure", async () => {
    const a = actions({ onApplyStage: vi.fn().mockResolvedValue(false) });
    mount(dto(), a);
    await userEvent.click(screen.getByTestId("ca-receiving-refuse"));
    await userEvent.click(screen.getByTestId("ca-receiving-refusal-submit"));
    expect(screen.getByTestId("ca-receiving-stage-local-error")).toHaveTextContent("Выберите причину отказа");
    expect(a.onApplyStage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Дорого" }));
    await userEvent.type(screen.getByTestId("ca-receiving-refusal-comment"), "нашёл дешевле");
    await userEvent.click(screen.getByTestId("ca-receiving-refusal-submit"));
    expect(a.onApplyStage).toHaveBeenCalledWith({
      stageKey: "sys_refused",
      refusedReason: "Дорого — нашёл дешевле",
    });
    // Failed save: the panel and the draft stay open for a retry.
    expect(screen.getByTestId("ca-receiving-refuse-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ca-receiving-refusal-comment")).toHaveValue("нашёл дешевле");
  });

  it("a custom reason is saved to settings and selected", async () => {
    const onAddRefusalReason = vi.fn().mockResolvedValue({ ok: true, value: "Передумал" });
    mount(dto(), actions({ onAddRefusalReason }));
    await userEvent.click(screen.getByTestId("ca-receiving-refuse"));
    await userEvent.click(screen.getByTestId("ca-receiving-custom-reason-open"));
    await userEvent.type(screen.getByTestId("ca-receiving-custom-reason-input"), "Передумал");
    await userEvent.click(screen.getByTestId("ca-receiving-custom-reason-add"));
    expect(onAddRefusalReason).toHaveBeenCalledWith("Передумал");
    expect(await screen.findByRole("button", { name: "Передумал" })).toHaveAttribute("aria-pressed", "true");
  });

  it("PAID offers shipment with a date that cannot be in the future; return needs shipment", async () => {
    const onMarkShipped = vi.fn().mockResolvedValue(true);
    const a = actions({ shippedConfirm: { supported: true, onMarkShipped } });
    mount(dto({ stageId: "sys_paid", stageLabel: "Оплачено", purchaseOrderId: "ord_1", paidAt: at }), a);
    expect(screen.getByRole("heading", { name: "Оплачено · ждём отгрузку" })).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-return")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("ca-receiving-mark-shipped"));
    const date = screen.getByTestId("ca-receiving-ship-date") as HTMLInputElement;
    expect(date.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(date.min).toBe("2026-11-10");
    await userEvent.click(screen.getByTestId("ca-receiving-ship-confirm"));
    expect(onMarkShipped).toHaveBeenCalledWith(null);
  });

  it("SHIPPED with a recorded shipment offers the return; REFUSED and RETURN are terminal with no stage picker", async () => {
    const a = actions();
    const { unmount } = mount(
      dto({ stageId: "sys_shipped", stageLabel: "Отгружено", purchaseOrderId: "o", paidAt: at, shippedAt: at }),
      a,
    );
    await userEvent.click(screen.getByTestId("ca-receiving-return"));
    await userEvent.click(screen.getByTestId("ca-receiving-return-confirm"));
    expect(a.onApplyStage).toHaveBeenCalledWith({ stageKey: "sys_return" });
    unmount();

    mount(dto({ stageId: "sys_refused", stageLabel: "Отказ", refusedReason: "Дорого" }), actions());
    expect(screen.getByRole("heading", { name: "Отказ" })).toBeInTheDocument();
    expect(screen.getByText("Причина: Дорого")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-pick-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-refuse")).not.toBeInTheDocument();
    const states = within(screen.getByTestId("ca-receiving-stepper"))
      .getAllByRole("listitem")
      .map((s) => s.getAttribute("data-step-state"));
    expect(states).toEqual(["done", "terminal"]);
  });

  it("the ordinary card shows no technical ids; they live in a collapsed diagnostics block", () => {
    mount(dto(), actions());
    const aside = screen.getByLabelText("Сведения об обращении");
    const diag = screen.getByTestId("ca-receiving-diagnostics") as HTMLDetailsElement;
    expect(diag.open).toBe(false);
    for (const id of ["ap_internal_77", "cert_internal_55", "org_internal_1", "br_internal_1"]) {
      const visible = Array.from(aside.querySelectorAll("*")).filter(
        (el) => !diag.contains(el) && el.children.length === 0 && el.textContent?.includes(id),
      );
      expect(visible).toHaveLength(0);
    }
    expect(screen.getByTestId("ca-receiving-cert-meta")).toHaveTextContent("Салон «Диван»");
    expect(screen.getByTestId("ca-receiving-cert-meta")).toHaveTextContent("7%");
  });

  it("manual appeals say there is no certificate; read-only shows «Что сейчас» and no notes", () => {
    mount(dto({ originKind: "MANUAL", certificateId: null, sourceLabel: "Добавлен вручную · Звонок" }), undefined);
    expect(screen.getByText("Без сертификата — направившего и скидки нет.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Что сейчас" })).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-notes-input")).not.toBeInTheDocument();
    expect(screen.getByTestId("ca-receiving-appeal-readonly")).toBeInTheDocument();
  });

  it("history is a newest-first timeline with real dates, authors and reasons", () => {
    mount(
      dto({ stageId: "sys_refused", stageLabel: "Отказ", refusedReason: "Дорого" }),
      actions(),
      [
        { at: "2026-11-10T10:00:00.000Z", text: "Создано обращение по сертификату", author: "Система" },
        { at: "2026-11-12T10:00:00.000Z", text: "Отказ", reason: "Дорого", author: "Анна" },
      ] as never[],
    );
    const items = within(screen.getByTestId("ca-receiving-appeal-history")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Отказ — Дорого");
    expect(items[0]).toHaveTextContent("Анна");
    expect(items[1]).toHaveTextContent("Создано обращение по сертификату");
  });

  it("B4: the refused card offers «Вернуть в работу» that applies sys_new and clears the reason", async () => {
    const a = actions();
    mount(dto({ stageId: "sys_refused", stageLabel: "Отказ", refusedReason: "Дорого" }), a);
    await userEvent.click(screen.getByRole("button", { name: "Вернуть в работу" }));
    expect(a.onApplyStage).toHaveBeenCalledWith({ stageKey: "sys_new", refusedReason: null });
    expect(screen.queryByTestId("ca-receiving-refuse")).not.toBeInTheDocument();
  });

  it("B4: no reopen for a return, and none in the read-only card", () => {
    const { unmount } = mount(dto({ stageId: "sys_return", stageLabel: "Возврат" }), actions());
    expect(screen.queryByTestId("ca-receiving-reopen")).not.toBeInTheDocument();
    expect(screen.getByText("Обращение закрыто — этап больше изменить нельзя.")).toBeInTheDocument();
    unmount();
    mount(dto({ stageId: "sys_refused", stageLabel: "Отказ", refusedReason: "Дорого" }), undefined);
    expect(screen.queryByTestId("ca-receiving-reopen")).not.toBeInTheDocument();
  });
});
