import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import type { Partnership } from "@/lib/types";

const longName =
  "Мой поставщик с очень длинным названием для проверки переноса текста без горизонтального overflow";
const longOfficial =
  "ООО «Официальное юридическое наименование партнёра с длинной строкой и пробелами»";
const longCategory =
  "Категория с очень длинным названием без переносов — — — — — — — — — —";

function basePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
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
      {
        id: "t2",
        category: "windows",
        categoryLabel: longCategory,
        storePercent: 0,
        isExcluded: false,
        minMargin: null,
      },
      {
        id: "t3",
        category: "floor",
        categoryLabel: "Полы",
        storePercent: 12.5,
        isExcluded: false,
        minMargin: null,
      },
      {
        id: "t-excluded",
        category: "promo",
        categoryLabel: "Акция",
        storePercent: 99,
        isExcluded: true,
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
      displayName: longOfficial,
      city: "Краснодар",
      specializations: ["painting"],
      workingServiceSpecializationIds: ["painting"],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    listPreference: {
      personalAlias: longName,
      archivedAt: null,
      hiddenAt: null,
    },
    ...overrides,
  };
}

describe("PartnerPartnershipDetailDialog presentation render (P4a)", () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("keeps full term lines in order, including 0% and fractions, without excluded rows", () => {
    render(
      <PartnerPartnershipDetailDialog
        partnership={basePartnership()}
        meId="store-1"
        open
        onClose={vi.fn()}
      />,
    );

    const list = screen.getByTestId("partner-detail-terms-list");
    const items = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "Двери — 10%",
      `${longCategory} — 0%`,
      "Полы — 12.5%",
    ]);
    expect(items.join("\n")).not.toContain("Акция");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(longName);
    expect(screen.getByText(longOfficial)).toBeInTheDocument();
    expect(screen.getByTestId("partner-detail-close")).toHaveTextContent("Закрыть");
  });

  it("renders empty terms, agent-empty hint, and note under the same conditions", () => {
    const partnership = basePartnership({
      status: "INVITED",
      initiatedBy: "agent-1",
      pendingProposedBy: "agent-1",
      terms: [],
      note: "Входящий запрос без условий",
      proUser: {
        id: "agent-1",
        displayName: "Агент",
        city: "Краснодар",
        specializations: [],
        storeCategories: [],
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      },
      listPreference: {
        personalAlias: null,
        archivedAt: null,
        hiddenAt: null,
      },
    });

    render(
      <PartnerPartnershipDetailDialog
        partnership={partnership}
        meId="store-1"
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("partner-detail-terms-list")).toBeNull();
    expect(
      screen.getByText("Персональные условия пока не согласованы."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("partner-detail-agent-empty-hint")).toBeInTheDocument();
    expect(screen.getByText("Входящий запрос без условий")).toBeInTheDocument();
  });

  it("closes via the labeled Закрыть control without changing its text contract", async () => {
    const onClose = vi.fn();
    render(
      <PartnerPartnershipDetailDialog
        partnership={basePartnership()}
        meId="store-1"
        open
        onClose={onClose}
      />,
    );
    const closeBtn = screen.getByTestId("partner-detail-close");
    expect(closeBtn).toHaveAccessibleName("Закрыть");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders PAUSED status label from existing mapping without new actions", () => {
    render(
      <PartnerPartnershipDetailDialog
        partnership={basePartnership({ status: "PAUSED" })}
        meId="store-1"
        open
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Приостановлено")).toBeInTheDocument();
    expect(screen.getByTestId("partner-detail-close")).toHaveTextContent("Закрыть");
    expect(screen.queryByRole("button", { name: /Принять|Отклонить|Пригласить/i })).toBeNull();
  });
});
