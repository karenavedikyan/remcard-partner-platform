import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import type { Partnership } from "@/lib/types";

const partnership: Partnership = {
  id: "p1",
  status: "ACTIVE",
  initiatedBy: "store-1",
  pendingProposedBy: null,
  note: "Комментарий с очень длинным текстом без переносов — — — — — — — — — —",
  createdAt: "",
  updatedAt: "",
  storeUserId: "store-1",
  proUserId: "agent-1",
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 10,
      isExcluded: false,
      minMargin: null,
    },
  ],
  storeUser: {
    id: "store-1",
    displayName: "Store",
    city: "Краснодар",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
  },
  proUser: {
    id: "agent-1",
    displayName: "Official Name",
    city: "Краснодар",
    specializations: [],
    storeCategories: [],
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
  listPreference: {
    personalAlias: "Мой поставщик с очень длинным названием для проверки переноса текста",
    archivedAt: null,
    hiddenAt: null,
  },
};

describe("PartnerPartnershipDetailDialog a11y", () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("locks body scroll, focuses close, and wires Escape", async () => {
    const onClose = vi.fn();
    render(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={onClose}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    const closeBtn = screen.getByTestId("partner-detail-close");
    expect(closeBtn).toHaveFocus();
    expect(screen.getByTestId("partner-detail-focus-start")).toBeInTheDocument();
    expect(screen.getByTestId("partner-detail-focus-end")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("unlocks body scroll after close", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={onClose}
      />,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open={false}
        onClose={onClose}
      />,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("does not restore focus while staying open across parent rerenders", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={onClose}
      />,
    );
    const closeBtn = screen.getByTestId("partner-detail-close");
    closeBtn.focus();
    expect(closeBtn).toHaveFocus();

    rerender(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={() => onClose()}
      />,
    );
    expect(closeBtn).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("C1: wires real pause and term-change buttons when callbacks are provided", async () => {
    const onRunAction = vi.fn();
    const onOpenTermChange = vi.fn();
    render(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={() => {}}
        onRunAction={onRunAction}
        onOpenTermChange={onOpenTermChange}
      />,
    );

    expect(screen.getByTestId("partner-detail-actions")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("partner-detail-action-pause"));
    expect(onRunAction).toHaveBeenCalledWith("pause");
    await userEvent.click(screen.getByTestId("partner-detail-term-change"));
    expect(onOpenTermChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("partner-detail-term-change")).toHaveTextContent(
      "Изменить условия",
    );
  });
});
