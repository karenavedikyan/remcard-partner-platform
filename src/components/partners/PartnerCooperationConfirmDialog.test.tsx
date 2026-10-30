import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerCooperationConfirmDialog } from "./PartnerCooperationConfirmDialog";

describe("PartnerCooperationConfirmDialog", () => {
  it("Escape activates Keep (safe=confirm) and does not discard", async () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PartnerCooperationConfirmDialog
        open
        title="Закрыть без отправки?"
        body="Черновик изменения условий будет потерян."
        confirmLabel="Продолжить редактирование"
        dismissLabel="Закрыть без отправки"
        safeAction="confirm"
        testId="partner-term-discard-confirm"
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("partner-term-discard-confirm-confirm")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("Escape on pause confirm activates Cancel (safe=dismiss)", async () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PartnerCooperationConfirmDialog
        open
        title="Приостановить?"
        body="Статус сменится."
        confirmLabel="Приостановить"
        dismissLabel="Отмена"
        safeAction="dismiss"
        testId="partner-pause-confirm"
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("partner-pause-confirm-dismiss")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
