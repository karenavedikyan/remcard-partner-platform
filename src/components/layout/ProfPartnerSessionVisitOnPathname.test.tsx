import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

const mocks = vi.hoisted(() => ({
  visit: vi.fn(),
  pathname: "/",
  search: "",
}));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: mocks.visit,
  fetchManagementOverview: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { ProfPartnerSessionVisitOnPathname } from "@/components/layout/ProfPartnerSessionVisitOnPathname";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.visit.mockResolvedValue({ ok: true, recorded: true });
  mocks.pathname = "/";
  mocks.search = "";
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: false,
      decidedAt: "2026-10-01T00:00:00.000Z",
      version: "1.0",
    }),
  );
});

describe("ProfPartnerSessionVisitOnPathname cadence", () => {
  it("records once when analytics consent is on", async () => {
    render(
      <CookieConsentProvider>
        <ProfPartnerSessionVisitOnPathname />
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
  });

  it("does not record when analytics consent is off", async () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        decidedAt: "2026-10-01T00:00:00.000Z",
        version: "1.0",
      }),
    );
    render(
      <CookieConsentProvider>
        <ProfPartnerSessionVisitOnPathname />
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).not.toHaveBeenCalled());
  });

  it("re-keys analytics when shell identity changes on the same pathname", async () => {
    const { rerender } = render(
      <CookieConsentProvider>
        <CabinetShellContextProvider shellContextToken="identity-a">
          <ProfPartnerSessionVisitOnPathname />
        </CabinetShellContextProvider>
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));

    rerender(
      <CookieConsentProvider>
        <CabinetShellContextProvider shellContextToken="identity-b">
          <ProfPartnerSessionVisitOnPathname />
        </CabinetShellContextProvider>
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(2));
  });

  it("fires again on pathname change but not on query-only change", async () => {
    const { rerender } = render(
      <CookieConsentProvider>
        <ProfPartnerSessionVisitOnPathname />
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
    mocks.pathname = "/clients";
    rerender(
      <CookieConsentProvider>
        <ProfPartnerSessionVisitOnPathname />
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(2));
    mocks.search = "section=find";
    rerender(
      <CookieConsentProvider>
        <ProfPartnerSessionVisitOnPathname />
      </CookieConsentProvider>,
    );
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(2));
  });
});
