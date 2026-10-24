/**
 * @vitest-environment jsdom
 */
import { useEffect, useState, type ReactNode } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { remcardFetch } from "@/lib/api-client";
import {
  catalogPrefillBusinessOrgProfile,
  createCatalogPrefillOrgTransport,
} from "@/lib/catalog-prefill-org-transport.fixture";
import type { ProProfileResponse } from "@/lib/types";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams("section=basics");
let navBump: (() => void) | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: (href: string) => {
      pushMock(href);
      const qs = href.includes("?") ? href.split("?")[1] : "";
      mockSearchParams = new URLSearchParams(qs);
      navBump?.();
    },
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/profile",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, profileComplete: false }),
}));

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, hasAgentActivity: false }),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "mount", label: "Монтаж" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: () => null,
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => null,
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => null,
}));

vi.mock("./agent/AgentProfileSection", () => ({
  AgentProfileSection: () => null,
}));

vi.mock("./ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => null,
}));

vi.mock("./ProfileOverviewSection", () => ({
  ProfileOverviewSection: () => null,
}));

vi.mock("./OrganizationCatalogPublicBranchSelector", () => ({
  OrganizationCatalogPublicBranchSelector: () => null,
}));

function NavSync({ children }: { children: ReactNode }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    navBump = () => setTick((t) => t + 1);
    return () => {
      navBump = null;
    };
  }, []);
  return children;
}

const businessOrgProfile = catalogPrefillBusinessOrgProfile;

function catalogWizardNodeAtStep(step: number) {
  const nodes = screen.getAllByTestId("organization-catalog-wizard");
  const match = nodes.find((n) => n.getAttribute("data-catalog-step") === String(step));
  if (!match) {
    throw new Error(`No organization catalog wizard at step ${step}`);
  }
  return match;
}

function catalogRootAtStep(step: number) {
  return within(catalogWizardNodeAtStep(step));
}

function catalogRoot() {
  const nodes = screen.getAllByTestId("organization-catalog-wizard");
  const step = Math.max(
    ...nodes.map((n) => Number(n.getAttribute("data-catalog-step") ?? 0)),
  );
  return catalogRootAtStep(step);
}

async function waitForCatalogStep(step: number) {
  await waitFor(() => {
    const nodes = screen.getAllByTestId("organization-catalog-wizard");
    expect(nodes.some((n) => n.getAttribute("data-catalog-step") === String(step))).toBe(
      true,
    );
  });
}

async function advanceCatalogPastBasics(ui: ReturnType<typeof userEvent.setup>) {
  const root = catalogRootAtStep(0);
  const branch =
    root.queryByLabelText(/Адрес первого филиала/i) ??
    catalogWizardNodeAtStep(0).querySelector("#catalog-branch-address");
  if (branch) {
    await ui.type(branch, "ул. Тестовая, 1");
  }
  await ui.click(root.getByRole("button", { name: "Далее" }));
  await waitForCatalogStep(1);
  const root1 = catalogRootAtStep(1);
  const product = root1.queryByRole("checkbox", { name: /Двери/i });
  if (product && !(product as HTMLInputElement).checked) {
    await ui.click(product);
  }
  const stage = root1.queryByRole("checkbox", { name: /Инженерия/i });
  if (stage && !(stage as HTMLInputElement).checked) {
    await ui.click(stage);
  }
  await waitFor(() =>
    expect(root1.getByRole("checkbox", { name: /Инженерия/i })).toBeChecked(),
  );
}

async function goToCatalogContacts(ui: ReturnType<typeof userEvent.setup>) {
  await advanceCatalogPastBasics(ui);
  await ui.click(catalogRootAtStep(1).getByRole("button", { name: "Далее" }));
  await waitForCatalogStep(2);
  expect(catalogRootAtStep(2).getByText("Публичные контакты")).toBeInTheDocument();
}

describe("ProfileEditor working profile → org catalog prefill", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockSearchParams = new URLSearchParams("section=basics");
    pushMock.mockReset();
    navBump = null;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/moderation-notes") return { notes: [] };
      throw new Error(`Unexpected ${String(path)} ${init?.method ?? "GET"}`);
    });
  });

  it.each(["STORE", "COMPANY"] as const)(
    "syncs org catalog stages when user.catalogDraft already matches working seed (%s)",
    async (partnerType) => {
      mockSearchParams = new URLSearchParams("section=catalog");
      render(
        <ProfileEditor
          cabinetAccess={ownerProfileCabinetAccess()}
          initial={businessOrgProfile(partnerType)}
          section="catalog"
        />,
      );
      const ui = userEvent.setup();
      await screen.findByTestId("catalog-public-name");
      await advanceCatalogPastBasics(ui);
    },
  );

  it.each(["STORE", "COMPANY"] as const)(
    "prefills org website/telegram from organization, not user (%s)",
    async (partnerType) => {
      mockSearchParams = new URLSearchParams("section=catalog");
      render(
        <ProfileEditor
          cabinetAccess={ownerProfileCabinetAccess()}
          initial={businessOrgProfile(partnerType)}
          section="catalog"
        />,
      );
      const ui = userEvent.setup();
      await screen.findByTestId("catalog-public-name");
      await goToCatalogContacts(ui);
      expect(catalogRootAtStep(2).getByDisplayValue("https://org-site.example")).toBeInTheDocument();
      expect(catalogRootAtStep(2).getByDisplayValue("@org_public")).toBeInTheDocument();
      expect(catalogRootAtStep(2).queryByDisplayValue("https://user-only.example")).toBeNull();
    },
  );

  it("re-applies prefill after fresh GET snapshot with same source key", async () => {
    mockSearchParams = new URLSearchParams("section=catalog");
    const initial = businessOrgProfile("STORE");
    const refreshed = structuredClone(initial);
    refreshed.organization = { ...refreshed.organization!, publicCatalogCity: "" };

    function Host() {
      const [snap, setSnap] = useState(initial);
      useEffect(() => {
        setSnap(refreshed);
      }, []);
      return (
        <ProfileEditor
          cabinetAccess={ownerProfileCabinetAccess()}
          initial={snap}
          section="catalog"
        />
      );
    }

    const ui = userEvent.setup();
    render(<Host />);
    await screen.findByTestId("catalog-public-name");
    await waitFor(() =>
      expect((screen.getByTestId("catalog-city-input") as HTMLInputElement).value).toBe("Сочи"),
    );
    await ui.type(screen.getByLabelText(/Адрес первого филиала/i), "ул. Тестовая, 1");
    await advanceCatalogPastBasics(ui);
  });

  describe("stateful working save → catalog tab", () => {
    it.each(["STORE", "COMPANY"] as const)(
      "saves basics then opens catalog with prefilled fields (%s)",
      async (partnerType) => {
        const transport = createCatalogPrefillOrgTransport(partnerType);
        await transport.seedOrgWithWorkingDefaults(
          partnerType === "STORE" ? "Магазин Транспорт" : "Компания Транспорт",
          "Сочи",
        );
        const initial = await transport.freshProfileGet();
        vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);

        const ui = userEvent.setup();
        render(
          <NavSync>
            <ProfileEditor
              cabinetAccess={ownerProfileCabinetAccess()}
              initial={initial}
              section="basics"
            />
          </NavSync>,
        );

        await screen.findByTestId("business-profile-scope");
        const summary = screen.queryByTestId("business-profile-completed-summary");
        if (summary) {
          await ui.click(screen.getByTestId("business-profile-edit-button"));
        }
        await ui.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(screen.getByTestId("business-profile-scope")).toBeInTheDocument());

        await ui.click(screen.getByRole("tab", { name: "Каталог RemCard" }));
        await waitFor(() =>
          expect(screen.getByTestId("organization-catalog-wizard")).toBeInTheDocument(),
        );

        expect((screen.getByTestId("catalog-public-name") as HTMLInputElement).value).toContain(
          "Транспорт",
        );
        expect((screen.getByTestId("catalog-city-input") as HTMLInputElement).value).toBe("Сочи");
      },
    );
  });

  describe("catalog draft persistence", () => {
    async function openCatalogWithPrefill(partnerType: "STORE" | "COMPANY") {
      const transport = createCatalogPrefillOrgTransport(partnerType);
      await transport.seedOrgWithWorkingDefaults("Магазин Persist", "Сочи");
      const initial = await transport.freshProfileGet();
      vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);
      mockSearchParams = new URLSearchParams("section=catalog");
      const ui = userEvent.setup();
      render(
        <ProfileEditor
          cabinetAccess={ownerProfileCabinetAccess()}
          initial={initial}
          section="catalog"
        />,
      );
      await screen.findByTestId("organization-catalog-wizard");
      const branchEl =
        catalogRoot().queryByLabelText(/Адрес первого филиала/i) ??
        catalogWizardNodeAtStep(0).querySelector("#catalog-branch-address");
      if (branchEl) {
        await ui.type(branchEl, "ул. Persist, 1");
      }
      return { ui, transport };
    }

    it.each(["STORE", "COMPANY"] as const)(
      "edited catalog survives save → GET → remount (%s)",
      async (partnerType) => {
        const { ui, transport } = await openCatalogWithPrefill(partnerType);
        await goToCatalogContacts(ui);
        const emailInput = screen.getByLabelText(/Email для клиентов/i);
        await ui.clear(emailInput);
        await ui.type(emailInput, "edited-catalog@example.com");
        await ui.click(catalogRoot().getByRole("button", { name: "Сохранить черновик" }));
        await waitFor(() =>
          expect(transport.getCatalogState().publicEmail).toBe("edited-catalog@example.com"),
        );

        const fresh = await transport.freshProfileGet();
        expect(fresh.organization?.publicEmail).toBe("edited-catalog@example.com");
        const first = render(
          <ProfileEditor
            cabinetAccess={ownerProfileCabinetAccess()}
            initial={fresh}
            section="catalog"
          />,
        );
        first.unmount();
        render(
          <ProfileEditor
            cabinetAccess={ownerProfileCabinetAccess()}
            initial={fresh}
            section="catalog"
          />,
        );
        const ui2 = userEvent.setup();
        await goToCatalogContacts(ui2);
        await waitFor(() =>
          expect(catalogRoot().getByDisplayValue("edited-catalog@example.com")).toBeInTheDocument(),
        );
      },
    );

    it.each(["STORE", "COMPANY"] as const)(
      "cleared public phone stays empty after save and remount (%s)",
      async (partnerType) => {
        const { ui, transport } = await openCatalogWithPrefill(partnerType);
        await goToCatalogContacts(ui);
        const phoneInput = screen.getByLabelText(/Телефон/i);
        await ui.clear(phoneInput);
        await ui.click(screen.getByRole("button", { name: "Сохранить черновик" }));
        await waitFor(() => expect(transport.getCatalogState().publicPhone).toBeFalsy());

        const fresh = await transport.freshProfileGet();
        render(
          <ProfileEditor
            cabinetAccess={ownerProfileCabinetAccess()}
            initial={fresh}
            section="catalog"
          />,
        );
        const ui2 = userEvent.setup();
        await goToCatalogContacts(ui2);
        expect((catalogRoot().getByLabelText(/Телефон/i) as HTMLInputElement).value.trim()).toBe(
          "",
        );
      },
    );

    it.each(["STORE", "COMPANY"] as const)(
      "working profile city change does not overwrite saved catalog email (%s)",
      async (partnerType) => {
        const { ui, transport } = await openCatalogWithPrefill(partnerType);
        await goToCatalogContacts(ui);
        const emailInput = screen.getByLabelText(/Email для клиентов/i);
        await ui.clear(emailInput);
        await ui.type(emailInput, "locked@example.com");
        await ui.click(screen.getByRole("button", { name: "Сохранить черновик" }));
        await waitFor(() => expect(transport.getCatalogState().publicEmail).toBe("locked@example.com"));

        const profile = transport.getProfile();
        profile.user.city = "Москва";
        transport.setProfile(profile);
        const afterWorkingChange = await transport.freshProfileGet();
        cleanup();
        render(
          <ProfileEditor
            cabinetAccess={ownerProfileCabinetAccess()}
            initial={afterWorkingChange}
            section="catalog"
          />,
        );
        const ui2 = userEvent.setup();
        await goToCatalogContacts(ui2);
        expect(catalogRoot().getByDisplayValue("locked@example.com")).toBeInTheDocument();
      },
    );

    it("keeps unsaved catalog edits when switching tabs and returning", async () => {
      const transport = createCatalogPrefillOrgTransport("STORE");
      await transport.seedOrgWithWorkingDefaults("Магазин Dirty", "Сочи");
      const initial = await transport.freshProfileGet();
      vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);
      mockSearchParams = new URLSearchParams("section=catalog");

      const ui = userEvent.setup();
      render(
        <NavSync>
          <ProfileEditor
            cabinetAccess={ownerProfileCabinetAccess()}
            initial={initial}
            section="catalog"
          />
        </NavSync>,
      );
      await screen.findByTestId("organization-catalog-wizard");
      await ui.type(screen.getByLabelText(/Адрес первого филиала/i), "ул. Dirty, 1");
      const nameInput = screen.getByTestId("catalog-public-name");
      await ui.clear(nameInput);
      await ui.type(nameInput, "Несохранённое имя каталога");

      await ui.click(screen.getByRole("tab", { name: "Основные данные" }));
      await ui.click(screen.getByRole("tab", { name: "Каталог RemCard" }));

      await waitFor(() =>
        expect((screen.getByTestId("catalog-public-name") as HTMLInputElement).value).toBe(
          "Несохранённое имя каталога",
        ),
      );
    });
  });
});
