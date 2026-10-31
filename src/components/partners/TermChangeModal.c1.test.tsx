import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import { TermChangeModal } from "./TermChangeModal";

describe("TermChangeModal C1 shell", () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("traps focus, locks body scroll, and restores nothing on own (host restores)", async () => {
    const onClose = vi.fn();
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={onClose}>
        <button type="button" data-testid="inner-a">
          A
        </button>
        <button type="button" data-testid="inner-b">
          B
        </button>
      </TermChangeModal>,
    );

    expect(screen.getByTestId("partner-term-change-modal")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    screen.getByTestId("inner-a").focus();
    await userEvent.tab();
    expect(screen.getByTestId("inner-b")).toHaveFocus();
    await userEvent.tab();
    // Cycles within dialog (close or sentinel→first)
    expect(document.activeElement).not.toBe(document.body);
  });

  it("Escape and backdrop call onClose when idle", async () => {
    const onClose = vi.fn();
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={onClose}>
        <button type="button">inside</button>
      </TermChangeModal>,
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await userEvent.click(screen.getByTestId("partner-term-change-modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("busy blocks Escape, backdrop, and close button", async () => {
    const onClose = vi.fn();
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={onClose} busy>
        <button type="button">inside</button>
      </TermChangeModal>,
    );

    expect(screen.getByTestId("term-change-close")).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("partner-term-change-modal-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("suspendFocusTrap yields Escape to overlying confirm (no close)", async () => {
    const onClose = vi.fn();
    render(
      <TermChangeModal
        open
        title="Предложить изменение условий"
        onClose={onClose}
        suspendFocusTrap
      >
        <button type="button">inside</button>
      </TermChangeModal>,
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("partner-term-change-modal-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button invokes onClose when not busy", async () => {
    const onClose = vi.fn();
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={onClose}>
        <span>body</span>
      </TermChangeModal>,
    );
    await userEvent.click(screen.getByTestId("term-change-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("unmount unlocks body scroll", async () => {
    const { unmount } = render(
      <TermChangeModal open title="Предложить изменение условий" onClose={() => {}}>
        <span>body</span>
      </TermChangeModal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    await waitFor(() => {
      expect(document.body.style.overflow).not.toBe("hidden");
    });
  });
});
