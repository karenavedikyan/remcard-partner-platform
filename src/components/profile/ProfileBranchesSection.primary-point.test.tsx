import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { additionalAddressesSummary } from "@/lib/profile-primary-point";
import { ProfileBranchesSection } from "./ProfileBranchesSection";

const remcardFetchMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetchMock(...args),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("./ProfileBranchDetail", () => ({
  ProfileBranchDetail: ({ branchId }: { branchId: string }) => (
    <div data-testid="branch-detail">{branchId}</div>
  ),
}));

function branch(id: string, city: string, address: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: "",
    city,
    address,
    catalogStatus: "APPROVED",
    catalogPublished: true,
    isActive: true,
    workingHours: null,
    specializations: [],
    storeCategories: [],
    ...extra,
  };
}

function mockOrganization(branches: ReturnType<typeof branch>[]) {
  remcardFetchMock.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === "/api/pro/organization" && (!init || init.method === "GET")) {
      return { organization: { id: "org-synthetic", name: "Синтетический магазин", branches } };
    }
    return {};
  });
}

describe("ProfileBranchesSection: основная точка и дополнительные адреса", () => {
  beforeEach(() => {
    remcardFetchMock.mockReset();
  });

  it("zero branches: primary point is shown, additional addresses are optional and the add form stays", async () => {
    mockOrganization([]);
    render(
      <ProfileBranchesSection
        hasOrganization
        partnerType="STORE"
        defaultCity="Краснодар"
        primaryName="Синтетический магазин"
        primaryPublished
      />,
    );

    const card = await screen.findByTestId("primary-point-card");
    expect(within(card).getByText("Основная точка")).toBeInTheDocument();
    expect(within(card).getByText("Синтетический магазин")).toBeInTheDocument();
    expect(within(card).getByText("Краснодар")).toBeInTheDocument();
    expect(within(card).getByText("В каталоге")).toBeInTheDocument();

    expect(screen.getByText(/Дополнительные адреса · необязательно/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("branches-empty")).toBeInTheDocument());
    expect(screen.queryByText(/Пока нет филиалов/)).toBeNull();
    expect(screen.queryByText(/Добавьте первую точку/)).toBeNull();
    expect(screen.getByTestId("branch-add-submit")).toBeInTheDocument();
    expect(screen.getByTestId("branch-add-submit")).toHaveTextContent("Добавить адрес");
    expect(screen.getByLabelText(/Город адреса/)).toBeInTheDocument();
    expect(screen.queryByText("Добавить филиал")).toBeNull();
    expect(screen.queryByLabelText(/Город филиала/)).toBeNull();
  });

  it("one real branch: primary point first, branch listed as additional address with edit", async () => {
    mockOrganization([branch("b1", "Анапа", "ул. Синтетическая, 1")]);
    const ui = userEvent.setup();
    render(
      <ProfileBranchesSection
        hasOrganization
        partnerType="COMPANY"
        defaultCity="Краснодар"
        primaryName="Синтетическая компания"
        primaryPublished={false}
      />,
    );

    const card = await screen.findByTestId("primary-point-card");
    expect(within(card).getByText("Не опубликована")).toBeInTheDocument();
    expect(await screen.findByText(/Анапа, ул\. Синтетическая, 1/)).toBeInTheDocument();
    expect(screen.queryByTestId("branches-empty")).toBeNull();

    const primaryNode = screen.getByTestId("primary-point-card");
    const branchNode = screen.getByText(/Анапа, ул\. Синтетическая, 1/);
    expect(
      primaryNode.compareDocumentPosition(branchNode) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await ui.click(screen.getByRole("button", { name: "Редактировать" }));
    expect(screen.getByTestId("branch-detail")).toHaveTextContent("b1");
  });

  it("multiple real branches are all listed; primary point is never one of them", async () => {
    mockOrganization([
      branch("b1", "Анапа", "ул. Первая, 1"),
      branch("b2", "Сочи", "ул. Вторая, 2", { isActive: false, catalogPublished: false }),
    ]);
    render(
      <ProfileBranchesSection
        hasOrganization
        partnerType="STORE"
        defaultCity="Краснодар"
        primaryName="Синтетический магазин"
      />,
    );
    await screen.findByText(/Анапа, ул\. Первая, 1/);
    expect(screen.getByText(/Сочи, ул\. Вторая, 2/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Редактировать" })).toHaveLength(2);
    expect(screen.getAllByTestId("primary-point-card")).toHaveLength(1);
  });

  it("add form still creates a real branch through the existing branches endpoint", async () => {
    mockOrganization([]);
    const ui = userEvent.setup();
    render(
      <ProfileBranchesSection
        hasOrganization
        partnerType="STORE"
        defaultCity="Краснодар"
        primaryName="Синтетический магазин"
      />,
    );
    await screen.findByTestId("branches-empty");
    await ui.type(screen.getByLabelText(/Адрес/), "ул. Новая, 5");
    await ui.click(screen.getByTestId("branch-add-submit"));
    await waitFor(() =>
      expect(remcardFetchMock).toHaveBeenCalledWith("/api/pro/organization/branches", {
        method: "POST",
        body: { city: "Краснодар", address: "ул. Новая, 5", name: undefined },
      }),
    );
  });

  it("solo specialist sees the primary point and no branch form", () => {
    mockOrganization([]);
    render(
      <ProfileBranchesSection
        hasOrganization={false}
        partnerType="MASTER"
        defaultCity="Казань"
        primaryName="Синтетический мастер"
      />,
    );
    expect(screen.getByTestId("primary-point-card")).toHaveTextContent("Синтетический мастер");
    expect(screen.queryByTestId("branch-add-submit")).toBeNull();
  });

  it("owner without organization yet still sees the primary point", () => {
    mockOrganization([]);
    render(
      <ProfileBranchesSection
        hasOrganization={false}
        partnerType="STORE"
        defaultCity="Казань"
        primaryName="Синтетический владелец"
      />,
    );
    expect(screen.getByTestId("primary-point-card")).toHaveTextContent("Синтетический владелец");
    expect(screen.queryByTestId("branch-add-submit")).toBeNull();
  });

  it("additional address summary never claims a physical branch for zero", () => {
    expect(additionalAddressesSummary(0)).toBe("Доп. адресов нет");
    expect(additionalAddressesSummary(3)).toBe("Доп. адреса: 3");
    expect(additionalAddressesSummary(0)).not.toMatch(/Филиал/);
  });
});
