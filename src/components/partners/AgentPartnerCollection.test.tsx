import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

vi.mock("@/components/partners/AgentPartnerWorkspaceActions", () => ({
  AgentPartnerWorkspaceActions: () => <div data-testid="workspace-actions-stub" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function basePartnership(overrides: Partial<Partnership>): Partnership {
  return {
    id: "p1",
    status: "INVITED",
    initiatedBy: "agent-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Shop Owner",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
      displayName: "Seda Rallis",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

const noop = () => {};

const defaultProps = {
  meId: "store-1",
  viewMode: "table" as const,
  busyId: null,
  onRunAction: vi.fn(),
  onUpdated: noop,
  termRequests: {},
  onLoadTermRequests: vi.fn(),
  expandedTermPartnershipId: null,
  selectedIds: new Set<string>(),
  onToggleSelect: noop,
  onToggleSelectAll: noop,
  page: 0,
  pageSize: 10,
  totalCount: 1,
  onPageChange: noop,
  onPageSizeChange: noop,
};

describe("AgentPartnerCollection row actions", () => {
  it("shows inline workflow for empty incoming agent request without eye toggle", async () => {
    const onRunAction = vi.fn();
    const partnership = basePartnership({ id: "incoming-agent" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        onRunAction={onRunAction}
      />,
    );

    const table = screen.getByTestId("agent-r04-partners-table");
    const workflow = within(table).getByTestId("partner-row-inline-workflow");
    expect(within(workflow).getByRole("button", { name: "Предложение агенту" })).toBeVisible();
    expect(within(workflow).getByRole("button", { name: "Отклонить" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Детали" })).toBeNull();

    await userEvent.click(within(workflow).getByRole("button", { name: "Предложение агенту" }));
    expect(onRunAction).toHaveBeenCalledTimes(1);
    expect(onRunAction).toHaveBeenCalledWith("incoming-agent", "counter_offer");
  });

  it("opens read-only details on name click and restores focus on close", async () => {
    const partnership = basePartnership({
      id: "p-alias",
      listPreference: { personalAlias: "Мой агент", archivedAt: null, hiddenAt: null },
      terms: [
        {
          id: "t1",
          category: "doors",
          categoryLabel: "Двери",
          storePercent: 12,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t2",
          category: "tiles",
          categoryLabel: "Плитка",
          storePercent: 8,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t3",
          category: "plumbing",
          categoryLabel: "Сантехника",
          storePercent: 5,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t4",
          category: "flooring",
          categoryLabel: "Напольные покрытия",
          storePercent: 7,
          isExcluded: false,
          minMargin: null,
        },
      ],
    });
    const onRunAction = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        onRunAction={onRunAction}
        onToggleSelect={onToggleSelect}
      />,
    );

    const nameButton = screen.getAllByTestId("partner-row-name-button")[0]!;
    expect(nameButton).toHaveTextContent("Мой агент");
    await userEvent.click(nameButton);

    const dialog = screen.getByTestId("partner-partnership-detail-dialog");
    expect(within(dialog).getByText(/Seda Rallis/)).toBeInTheDocument();
    const termsList = within(dialog).getByTestId("partner-detail-terms-list");
    expect(within(termsList).getAllByRole("listitem")).toHaveLength(4);
    expect(within(dialog).queryByRole("button", { name: "Предложение агенту" })).toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).toBeNull();
    expect(nameButton).toHaveFocus();
    expect(onRunAction).not.toHaveBeenCalled();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("renders mobile row with inline actions and clickable name", () => {
    const partnership = basePartnership({
      status: "INVITED",
      initiatedBy: "store-1",
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
    });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        meId="agent-1"
        partnerships={[partnership]}
      />,
    );

    const mobileRow = screen.getByTestId("agent-partner-mobile-row");
    expect(within(mobileRow).getByTestId("partner-row-name-button")).toBeInTheDocument();
    expect(within(mobileRow).getByRole("button", { name: "Принять" })).toBeVisible();
  });

  it("disables inline actions when row is busy", () => {
    const partnership = basePartnership({ id: "busy-row" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        busyId="busy-row"
      />,
    );

    const workflow = screen.getAllByTestId("partner-row-inline-workflow")[0]!;
    expect(within(workflow).getByRole("button", { name: "Предложение агенту" })).toBeDisabled();
  });

  it("shows card view primary workflow without expansion", () => {
    const partnership = basePartnership({ id: "card-row" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[partnership]}
      />,
    );

    const card = screen.getByTestId("agent-r04-partners-cards");
    expect(within(card).getByRole("button", { name: "Предложение агенту" })).toBeVisible();
    expect(within(card).getByTestId("partner-row-name-button")).toBeInTheDocument();
  });
});

describe("AgentPartnerCollection P3a display hierarchy", () => {
  const longCity =
    "Краснодарский край, муниципальное образование город Краснодар, микрорайон Центральный";
  const longSpecIds = ["doors", "flooring", "tiles"] as const;

  function activePartner(overrides: Partial<Partnership> = {}): Partnership {
    const proOverrides = overrides.proUser ?? {};
    return basePartnership({
      id: "active-1",
      status: "ACTIVE",
      ...overrides,
      proUser: {
        id: "agent-1",
        displayName: "Seda Rallis",
        organizationName: "Seda Rallis Agency",
        city: "Краснодар",
        specializations: ["painting"],
        workingServiceSpecializationIds: ["painting"],
        storeCategories: [],
        partnerType: "COMPANY",
        // STORE+AGENT keeps company (not pure-agent); activities alone do not become a second type.
        partnerActivities: ["STORE", "AGENT"],
        ...proOverrides,
      },
    });
  }

  const paintingLabel = "Покраска и штукатурка";

  function assertHierarchy(
    root: HTMLElement,
    expected: {
      title: string;
      type: string;
      detail: string;
      official?: string | null;
      status: string;
    },
  ) {
    expect(within(root).getByTestId("partner-row-name-button")).toHaveTextContent(expected.title);
    expect(within(root).getByTestId("partner-row-type-caption")).toHaveTextContent(expected.type);
    expect(within(root).getByTestId("partner-row-detail")).toHaveTextContent(expected.detail);
    expect(within(root).getByTestId("partner-row-type-caption").textContent).not.toMatch(/Краснодар/);
    expect(within(root).getByTestId("partner-row-type-caption").textContent).not.toContain("·");
    if (expected.official) {
      expect(within(root).getByTestId("partner-row-official-line")).toHaveTextContent(
        `Официально: ${expected.official}`,
      );
    } else {
      expect(within(root).queryByTestId("partner-row-official-line")).toBeNull();
    }
    expect(within(root).getByText(expected.status)).toBeInTheDocument();
    expect(within(root).queryByText("Условия согласованы")).toBeNull();
  }

  it("desktop list: type caption, city+spec details, alias + official, real status", () => {
    const partnership = activePartner({
      listPreference: { personalAlias: "Мой агент", archivedAt: null, hiddenAt: null },
    });

    render(
      <AgentPartnerCollection {...defaultProps} partnerships={[partnership]} />,
    );

    const row = screen.getByTestId("agent-r04-partners-table-row");
    assertHierarchy(row, {
      title: "Мой агент",
      type: "Компания",
      detail: `Краснодар · ${paintingLabel}`,
      official: "Seda Rallis Agency",
      status: "Активно",
    });
    expect(within(row).getByTestId("partner-row-detail").textContent).toMatch(/Краснодар/);
    expect(within(row).getByTestId("partner-row-detail").textContent).toMatch(/Покраска/);
  });

  it("cards and mobile repeat the same hierarchy including official line", () => {
    const partnership = activePartner({
      id: "cards-mobile",
      listPreference: { personalAlias: "Мой агент", archivedAt: null, hiddenAt: null },
    });

    const { rerender } = render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[partnership]}
      />,
    );

    assertHierarchy(screen.getByTestId("agent-r04-partners-cards"), {
      title: "Мой агент",
      type: "Компания",
      detail: `Краснодар · ${paintingLabel}`,
      official: "Seda Rallis Agency",
      status: "Активно",
    });

    rerender(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="table"
        partnerships={[partnership]}
      />,
    );

    assertHierarchy(screen.getByTestId("agent-partner-mobile-row"), {
      title: "Мой агент",
      type: "Компания",
      detail: `Краснодар · ${paintingLabel}`,
      official: "Seda Rallis Agency",
      status: "Активно",
    });
  });

  it("collection suppresses duplicate official when alias equals official; still hides when absent", () => {
    const noAlias = activePartner({ id: "no-alias", listPreference: undefined });
    const { rerender } = render(
      <AgentPartnerCollection {...defaultProps} partnerships={[noAlias]} />,
    );
    assertHierarchy(screen.getByTestId("agent-r04-partners-table-row"), {
      title: "Seda Rallis Agency",
      type: "Компания",
      detail: `Краснодар · ${paintingLabel}`,
      official: null,
      status: "Активно",
    });

    const sameAlias = activePartner({
      id: "same-alias",
      listPreference: {
        personalAlias: "Seda Rallis Agency",
        archivedAt: null,
        hiddenAt: null,
      },
    });
    rerender(<AgentPartnerCollection {...defaultProps} partnerships={[sameAlias]} />);
    assertHierarchy(screen.getByTestId("agent-r04-partners-table-row"), {
      title: "Seda Rallis Agency",
      type: "Компания",
      detail: `Краснодар · ${paintingLabel}`,
      official: null,
      status: "Активно",
    });
  });

  it("keeps city and specialization fallbacks together in all three views", () => {
    const cityMissingSpecPresent = activePartner({
      id: "city-miss",
      proUser: {
        id: "agent-1",
        displayName: "Spec Only Co",
        city: "",
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
        storeCategories: ["doors"],
        specializations: [],
        workingServiceSpecializationIds: [],
        workingProductCategoryIds: [],
      },
    });
    const cityPresentSpecMissing = activePartner({
      id: "spec-miss",
      proUser: {
        id: "agent-1",
        displayName: "City Only Co",
        city: "Анапа",
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
        storeCategories: [],
        specializations: [],
        workingServiceSpecializationIds: [],
        workingProductCategoryIds: [],
      },
    });
    const bothMissing = activePartner({
      id: "both-miss",
      proUser: {
        id: "agent-1",
        displayName: "Bare Co",
        city: "",
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
        storeCategories: [],
        specializations: [],
        workingServiceSpecializationIds: [],
        workingProductCategoryIds: [],
      },
    });

    const { rerender } = render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[cityMissingSpecPresent, cityPresentSpecMissing, bothMissing]}
        totalCount={3}
      />,
    );

    const expectDetailTrio = (details: HTMLElement[]) => {
      expect(details).toHaveLength(3);
      expect(details[0]).toHaveTextContent("Город не указан · Двери");
      expect(details[1]).toHaveTextContent("Анапа · Специализация не указана");
      expect(details[2]).toHaveTextContent("Город не указан · Специализация не указана");
    };

    expectDetailTrio(
      within(screen.getByTestId("agent-r04-partners-table")).getAllByTestId("partner-row-detail"),
    );
    expectDetailTrio(
      screen.getAllByTestId("agent-partner-mobile-row").map(
        (row) => within(row).getByTestId("partner-row-detail"),
      ),
    );

    rerender(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[cityMissingSpecPresent, cityPresentSpecMissing, bothMissing]}
        totalCount={3}
      />,
    );
    expectDetailTrio(
      within(screen.getByTestId("agent-r04-partners-cards")).getAllByTestId("partner-row-detail"),
    );
  });

  it("covers four canonical kinds and mixed AGENT activity stays company/store", () => {
    const rows: Partnership[] = [
      activePartner({
        id: "k-agent",
        proUser: {
          id: "agent-1",
          displayName: "Agent Only",
          city: "Сочи",
          partnerType: "COMPANY",
          partnerActivities: ["AGENT"],
          specializations: [],
          storeCategories: [],
        },
      }),
      activePartner({
        id: "k-store",
        status: "PAUSED",
        proUser: {
          id: "agent-1",
          displayName: "Store Partner",
          city: "Анапа",
          partnerType: "STORE",
          partnerActivities: ["STORE", "AGENT"],
          storeCategories: ["doors"],
          specializations: [],
        },
      }),
      activePartner({
        id: "k-company",
        proUser: {
          id: "agent-1",
          displayName: "Company Partner",
          city: "Новороссийск",
          partnerType: "COMPANY",
          partnerActivities: ["STORE", "AGENT"],
          specializations: ["painting"],
          workingServiceSpecializationIds: ["painting"],
          storeCategories: [],
        },
      }),
      activePartner({
        id: "k-specialist",
        proUser: {
          id: "agent-1",
          displayName: "Specialist Partner",
          city: "Геленджик",
          partnerType: "MASTER",
          partnerActivities: ["SERVICE"],
          specializations: ["painting"],
          workingServiceSpecializationIds: ["painting"],
          storeCategories: [],
        },
      }),
    ];

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={rows}
        totalCount={rows.length}
      />,
    );

    const tableRows = screen.getAllByTestId("agent-r04-partners-table-row");
    expect(within(tableRows[0]!).getByTestId("partner-row-type-caption")).toHaveTextContent("Агент");
    expect(within(tableRows[0]!).getByTestId("partner-row-detail")).toHaveTextContent("Сочи");
    expect(within(tableRows[1]!).getByTestId("partner-row-type-caption")).toHaveTextContent("Магазин");
    expect(within(tableRows[1]!).getByText("Приостановлено")).toBeInTheDocument();
    expect(within(tableRows[1]!).getByTestId("partner-row-detail").textContent).toMatch(/Анапа/);
    expect(within(tableRows[1]!).getByTestId("partner-row-detail").textContent).toMatch(/Двери/);
    expect(within(tableRows[2]!).getByTestId("partner-row-type-caption")).toHaveTextContent("Компания");
    expect(within(tableRows[3]!).getByTestId("partner-row-type-caption")).toHaveTextContent(
      "Специалист",
    );
  });

  it("uses fallbacks for empty optionals and wraps long name/city/spec without inventing data", () => {
    const partnership = activePartner({
      id: "long-empty",
      status: "PAUSED",
      listPreference: {
        personalAlias:
          "Очень длинный личный псевдоним партнёра для проверки переноса строки без столкновения со статусом",
        archivedAt: null,
        hiddenAt: null,
      },
      proUser: {
        id: "agent-1",
        displayName: "Short",
        organizationName:
          "Официальное юридическое наименование организации с чрезмерно длинной строкой для desktop/cards",
        city: longCity,
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        storeCategories: [...longSpecIds],
        specializations: [],
      },
    });

    const emptyOptionals = activePartner({
      id: "empty-opt",
      proUser: {
        id: "agent-1",
        displayName: "Bare Partner",
        organizationName: undefined,
        city: "",
        partnerType: "UNKNOWN_KIND" as never,
        partnerActivities: [],
        storeCategories: [],
        specializations: [],
        workingServiceSpecializationIds: [],
        workingProductCategoryIds: [],
      },
    });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership, emptyOptionals]}
        totalCount={2}
      />,
    );

    const [longRow, emptyRow] = screen.getAllByTestId("agent-r04-partners-table-row");
    expect(within(longRow!).getByTestId("partner-row-name-button").textContent).toMatch(/длинный личный/);
    expect(within(longRow!).getByTestId("partner-row-official-line").textContent).toMatch(
      /Официально:.*юридическое/,
    );
    expect(within(longRow!).getByTestId("partner-row-detail").textContent).toContain(longCity);
    expect(within(longRow!).getByTestId("partner-row-detail").textContent).not.toMatch(/\bdoors\b/);
    expect(within(longRow!).getByText("Приостановлено")).toBeInTheDocument();

    expect(within(emptyRow!).getByTestId("partner-row-type-caption")).toHaveTextContent("Партнёр");
    expect(within(emptyRow!).getByTestId("partner-row-detail")).toHaveTextContent(
      "Город не указан · Специализация не указана",
    );
    expect(within(emptyRow!).queryByText("undefined")).toBeNull();
    expect(within(emptyRow!).queryByTestId("partner-row-official-line")).toBeNull();
  });
});

describe("AgentPartnerCollection P3b cards selection", () => {
  function activeCard(id: string): Partnership {
    return basePartnership({
      id,
      status: "ACTIVE",
      listPreference: { personalAlias: `Партнёр ${id}`, archivedAt: null, hiddenAt: null },
    });
  }

  it("shows the same select-page row in cards and toggles page selection", async () => {
    const user = userEvent.setup();
    const onToggleSelectAll = vi.fn();
    const partnerships = [activeCard("c1"), activeCard("c2")];

    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={partnerships}
        totalCount={2}
        onToggleSelectAll={onToggleSelectAll}
      />,
    );

    const pageRow = screen.getByTestId("agent-r04-select-page-row");
    expect(pageRow).toHaveTextContent("Выбрать страницу (2)");
    const pageCheckbox = within(pageRow).getByRole("checkbox", {
      name: "Выбрать страницу (2)",
    });
    expect(pageCheckbox).not.toBeChecked();

    await user.click(pageCheckbox);
    expect(onToggleSelectAll).toHaveBeenCalledWith(["c1", "c2"], true);
  });

  it("marks selected cards with local selected class while checkbox stays visible", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const partnerships = [activeCard("sel-1"), activeCard("sel-2")];

    const { rerender } = render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={partnerships}
        totalCount={2}
        selectedIds={new Set(["sel-1"])}
        onToggleSelect={onToggleSelect}
      />,
    );

    const cards = screen.getByTestId("agent-r04-partners-cards");
    const articles = within(cards).getAllByRole("article");
    expect(articles[0]).toHaveAttribute("data-selected", "true");
    expect(articles[1]).toHaveAttribute("data-selected", "false");
    expect(articles[0]!.className).toMatch(/partnerCardSelected/);
    expect(articles[1]!.className).not.toMatch(/partnerCardSelected/);

    const selectedCheckbox = within(articles[0]!).getByRole("checkbox", {
      name: "Выбрать карточку",
    });
    expect(selectedCheckbox).toBeChecked();
    expect(selectedCheckbox).toBeVisible();

    await user.click(selectedCheckbox);
    expect(onToggleSelect).toHaveBeenCalledWith("sel-1");

    rerender(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={partnerships}
        totalCount={2}
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
      />,
    );
    expect(within(cards).getAllByRole("article")[0]).toHaveAttribute("data-selected", "false");
    expect(within(cards).getAllByRole("article")[0]!.className).not.toMatch(/partnerCardSelected/);
  });

  it("does not make the card name control toggle selection", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const partnership = activeCard("name-only");

    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[partnership]}
        totalCount={1}
        onToggleSelect={onToggleSelect}
      />,
    );

    await user.click(screen.getByTestId("partner-row-name-button"));
    expect(onToggleSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps allSelected false when only part of the page is selected", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[activeCard("p-a"), activeCard("p-b"), activeCard("p-c")]}
        totalCount={3}
        selectedIds={new Set(["p-a", "p-b"])}
      />,
    );

    const pageCheckbox = within(screen.getByTestId("agent-r04-select-page-row")).getByRole(
      "checkbox",
      { name: "Выбрать страницу (3)" },
    );
    expect(pageCheckbox).not.toBeChecked();
  });
});


