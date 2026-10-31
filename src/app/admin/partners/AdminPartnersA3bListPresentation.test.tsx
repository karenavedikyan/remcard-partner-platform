/** @vitest-environment jsdom */
/**
 * A3b layout-pin suite superseded by owner R1 Partners parity
 * (`AdminPartnersR1ParityPresentation.test.tsx`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersRegistryList } from "./AdminPartnersRegistryList";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

const ROOT = __dirname;

const row = {
  id: "p1",
  publicId: "P001",
  displayName: "Агент Тест",
  partnerType: "AGENT",
  partnerKind: "agent" as const,
  city: "Краснодар",
  registrationLabel: "ACTIVE" as const,
  lifecycle: null,
  catalogVisibility: "VISIBLE" as const,
  partnerSearchVisibility: {
    visible: true,
    reasonCode: "OK",
    reasonLabel: "Доступен",
    adminOverride: "AUTO" as const,
  },
  partnershipCounts: { active: 2, invited: 0, pending: 0, paused: 0, ended: 0, total: 2 },
  publicCatalogLinks: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
});

describe("A3b superseded — R1 list presentation", () => {
  it("documents supersession and R1 list markers", () => {
    const r1 = readFileSync(path.join(ROOT, "AdminPartnersR1ParityPresentation.test.tsx"), "utf8");
    expect(r1).toContain("R1 Partners visual parity");
    const list = readFileSync(path.join(ROOT, "AdminPartnersRegistryList.tsx"), "utf8");
    expect(list).toContain("partnersTable");
    expect(list).toContain("mobileCard");
    expect(list).toContain("Визит*");
    expect(list).toContain("onOpenPartner");
  });

  it("table shows partner identity, registration, catalog, cooperation, visit GAP", () => {
    const headerRef = { current: null } as React.RefObject<HTMLInputElement>;
    const cardsRef = { current: null } as React.RefObject<HTMLInputElement>;
    render(
      <AdminPartnersRegistryList
        viewMode="table"
        items={[row]}
        loading={false}
        selectedIds={new Map()}
        pageSelectState="none"
        onTogglePageSelect={() => {}}
        onToggleRow={() => {}}
        selectionBlocked={false}
        singleSelected={null}
        onOpenPartner={() => {}}
        interactionsDisabled={false}
        headerSelectRef={headerRef}
        cardsPageSelectRef={cardsRef}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Партнёр" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Регистрация" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Каталог" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Сотрудничество" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Визит*" })).toBeTruthy();
    expect(screen.getByText("Агент · Краснодар")).toBeTruthy();
    expect(screen.getByText("Активный")).toBeTruthy();
    expect(screen.getAllByText("Виден").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Нет данных")).toBeTruthy();
  });

  it("cards mode opens partner via name button", async () => {
    const opened: string[] = [];
    const headerRef = { current: null } as React.RefObject<HTMLInputElement>;
    const cardsRef = { current: null } as React.RefObject<HTMLInputElement>;
    render(
      <AdminPartnersRegistryList
        viewMode="cards"
        items={[row]}
        loading={false}
        selectedIds={new Map()}
        pageSelectState="none"
        onTogglePageSelect={() => {}}
        onToggleRow={() => {}}
        selectionBlocked={false}
        singleSelected={null}
        onOpenPartner={(r) => opened.push(r.id)}
        interactionsDisabled={false}
        headerSelectRef={headerRef}
        cardsPageSelectRef={cardsRef}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Агент Тест/ }));
    await waitFor(() => expect(opened).toEqual(["p1"]));
  });
});
