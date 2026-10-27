import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { COOKIE_CONSENT_HTTP, COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

const mocks = vi.hoisted(() => ({ visit: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: mocks.visit,
  fetchManagementOverview: vi.fn(),
}));

import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import {
  ProfAnalyticsConsentBanner,
  ProfAnalyticsConsentManage,
} from "./ProfAnalyticsConsentUi";
import { ProfPartnerSessionVisit } from "@/components/layout/ProfPartnerSessionVisit";

function CabinetWithConsent() {
  return (
    <CookieConsentProvider>
      <ProfPartnerSessionVisit />
      <ProfAnalyticsConsentBanner />
      <ProfAnalyticsConsentManage />
    </CookieConsentProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.visit.mockResolvedValue({ ok: true, recorded: true });
  localStorage.clear();
  document.cookie = `${COOKIE_CONSENT_HTTP}=; path=/; max-age=0`;
});

describe("PROF analytics consent user path", () => {
  it("does not record a visit before the user decides", async () => {
    render(<CabinetWithConsent />);
    await screen.findByRole("dialog");
    expect(mocks.visit).not.toHaveBeenCalled();
    expect(document.cookie).not.toMatch(/analytics":true/);
  });

  it("records after the user accepts analytics via the banner", async () => {
    render(<CabinetWithConsent />);
    fireEvent.click(await screen.findByRole("button", { name: "Разрешить аналитику" }));
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toMatch(/"analytics":true/);
    expect(decodeURIComponent(document.cookie)).toContain('"analytics":true');
  });

  it("does not record when the user rejects analytics and cabinet stays usable", async () => {
    render(<CabinetWithConsent />);
    fireEvent.click(await screen.findByRole("button", { name: "Не сейчас" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.visit).not.toHaveBeenCalled();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toMatch(/"analytics":false/);
  });

  it("re-sends visit when analytics is enabled later from manage control", async () => {
    render(<CabinetWithConsent />);
    fireEvent.click(await screen.findByRole("button", { name: "Не сейчас" }));
    await waitFor(() => expect(screen.getByTestId("analytics-consent-manage")).toBeTruthy());
    mocks.visit.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Включить" }));
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
    mocks.visit.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Отключить" }));
    await waitFor(() => expect(mocks.visit).not.toHaveBeenCalled());
  });
});
