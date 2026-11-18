import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import type { AuthUser } from "@/lib/types";
import { AppShell } from "./AppShell";
import { CabinetAppShellClient } from "./CabinetAppShellClient";
import {
  agentEmployeeContext,
  cabinetPresentationFixture,
  companyOrgEmployeeContext,
  specialistEmployeeContext,
  storeBranchEmployeeContext,
  storeOrgEmployeeContext,
} from "@/lib/cabinet-presentation/test-fixtures";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: ({ roleLabel }: { roleLabel?: string }) => (
    <div data-testid="account-session-menu-fixture">{roleLabel}</div>
  ),
}));
vi.mock("@/components/notifications", () => ({ ProfNotificationBell: () => null }));
vi.mock("@/components/layout/CabinetPresentationRefreshListener", () => ({
  CabinetPresentationRefreshListener: () => null,
}));

const employee = (displayName: string): AuthUser => ({
  id: "emp-1",
  displayName,
  role: "CLIENT",
  partnerType: null,
  partnerActivities: [],
});

const inactivePrefs: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: false,
  contextKey: null,
  version: 0,
  theme: null,
  mobileNavKeys: null,
  permittedKeys: null,
  defaultMobileNavKeys: null,
};

function renderClient(user: AuthUser, proContext: Parameters<typeof cabinetPresentationFixture>[1]) {
  const presentation = cabinetPresentationFixture(user, proContext);
  return render(
    <ThemeProvider>
      <CookieConsentProvider>
        <CabinetAppShellClient user={user} presentation={presentation} incomingCount={0} uiPrefs={inactivePrefs}>
          <div>content</div>
        </CabinetAppShellClient>
      </CookieConsentProvider>
    </ThemeProvider>,
  );
}

function sidebar() {
  return screen.getByLabelText("Основная навигация");
}

function sidebarLabels() {
  return within(sidebar())
    .getAllByRole("link")
    .map((el) => el.textContent?.replace(/\d+$/, "").trim());
}

function workspaceCaption(): string {
  const smalls = Array.from(sidebar().querySelectorAll("small"));
  const hint = smalls.find((el) => el.className.includes("workspaceHint"));
  return hint?.textContent ?? "";
}

describe("F1: workspace caption in the sidebar", () => {
  it.each([
    ["store owner", { id: "o1", displayName: "Магазин", role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] } as AuthUser, null, "Магазин"],
    ["company owner", { id: "o2", displayName: "Компания", role: "PRO", partnerType: "COMPANY", partnerActivities: ["STORE"] } as AuthUser, null, "Компания"],
    ["specialist owner", { id: "o3", displayName: "Мастер", role: "PRO", partnerType: "MASTER", partnerActivities: ["SERVICE"] } as AuthUser, null, "Специалист"],
    ["store employee", employee("Продавец"), storeOrgEmployeeContext, "Магазин"],
    ["company employee", employee("Менеджер"), companyOrgEmployeeContext, "Компания"],
    ["store employee at a branch", employee("Продавец"), storeBranchEmployeeContext, "Магазин · Филиал Центр"],
    ["specialist employee", employee("Помощник"), specialistEmployeeContext, "Специалист"],
  ] as const)("%s", (_name, user, ctx, expected) => {
    const presentation = cabinetPresentationFixture(user, ctx);
    render(
      <ThemeProvider>
        <CookieConsentProvider>
          <AppShell user={user} presentation={presentation}>
            <div>content</div>
          </AppShell>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    expect(workspaceCaption()).toBe(expected);
    expect(sidebar().textContent).not.toContain("Организация");
  });

  it("initials ignore separator tokens: «QA18 · M1 · sel2» is «QM», not «Q·»", () => {
    const user = employee("QA18 · M1 · sel2");
    const presentation = { ...cabinetPresentationFixture(user, storeOrgEmployeeContext), workspaceOrganizationName: null };
    render(
      <ThemeProvider>
        <CookieConsentProvider>
          <AppShell user={user} presentation={{ ...presentation, actorDisplayName: "QA18 · M1 · sel2" }}>
            <div>content</div>
          </AppShell>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    const avatar = sidebar().querySelector("span[aria-hidden]");
    expect(avatar?.textContent).toBe("QM");
  });
});

describe("F2: employees of a specialist / agent get the owner's shell", () => {
  it("specialist employee: specialist menu with «Кошелёк», no «Взаиморасчёты»", () => {
    renderClient(employee("S1-sel"), specialistEmployeeContext);
    expect(sidebarLabels()).toEqual([
      "Главная",
      "Клиенты",
      "Сертификаты",
      "Сканер",
      "Партнёры",
      "Кошелёк",
      "Профиль",
    ]);
    expect(sidebar().textContent).not.toContain("Взаиморасчёты");
    expect(workspaceCaption()).toBe("Специалист");
  });

  it("agent employee: agent shell with Сертификаты, Клиенты, Партнёры, Кошелёк, Профиль", () => {
    renderClient(employee("A1-issuer"), agentEmployeeContext);
    expect(sidebarLabels()).toEqual(["Сертификаты", "Клиенты", "Партнёры", "Кошелёк", "Профиль"]);
    expect(sidebar().textContent).not.toContain("Взаиморасчёты");
    expect(sidebar().textContent).toContain("A1 Агент");
    expect(workspaceCaption()).toBe("Агент");
    expect(screen.queryByText("Настроить нижнюю панель")).toBeNull();
  });

  it("store and company employees keep their business menus", () => {
    renderClient(employee("M1-sel2"), storeOrgEmployeeContext);
    expect(sidebarLabels()).toContain("Кошелёк");
    expect(sidebarLabels()).not.toContain("Взаиморасчёты");
  });

  it("no partner type gets «Взаиморасчёты» in the sidebar", () => {
    const cases: Array<[AuthUser, Parameters<typeof cabinetPresentationFixture>[1]]> = [
      [{ id: "1", role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] } as AuthUser, null],
      [{ id: "2", role: "PRO", partnerType: "COMPANY", partnerActivities: ["STORE"] } as AuthUser, null],
      [{ id: "3", role: "PRO", partnerType: "MASTER", partnerActivities: ["SERVICE"] } as AuthUser, null],
      [employee("e1"), storeOrgEmployeeContext],
      [employee("e2"), companyOrgEmployeeContext],
      [employee("e3"), specialistEmployeeContext],
      [employee("e4"), agentEmployeeContext],
      [employee("e5"), { role: "PARTNER_EMPLOYEE", employer: { id: "x", displayName: "Employer" } }],
    ];
    for (const [user, ctx] of cases) {
      const view = renderClient(user, ctx);
      expect(sidebar().textContent).not.toContain("Взаиморасчёты");
      view.unmount();
    }
  });
});
