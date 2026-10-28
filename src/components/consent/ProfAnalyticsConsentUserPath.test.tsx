import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COOKIE_CONSENT_HTTP, COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

const mocks = vi.hoisted(() => ({ visit: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: mocks.visit,
  fetchManagementOverview: vi.fn(),
}));

import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import {
  ProfAnalyticsConsentLoginBlock,
  ProfAnalyticsConsentProfileSetting,
} from "./ProfAnalyticsConsentUi";
import { ProfPartnerSessionVisit } from "@/components/layout/ProfPartnerSessionVisit";

function CabinetWithVisit() {
  return (
    <CookieConsentProvider>
      <ProfPartnerSessionVisit />
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
  it("does not persist or record visit while checkbox is only shown pre-checked", async () => {
    render(
      <CookieConsentProvider>
        <ProfAnalyticsConsentLoginBlock />
        <ProfPartnerSessionVisit />
      </CookieConsentProvider>,
    );
    const checkbox = await screen.findByRole("checkbox", {
      name: /разрешить учёт посещений/i,
    });
    expect(checkbox).toBeChecked();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(document.cookie).not.toMatch(/analytics":true/);
    expect(mocks.visit).not.toHaveBeenCalled();
  });

  it("saves analytics=true only after explicit confirm with checked box", async () => {
    render(
      <CookieConsentProvider>
        <ProfAnalyticsConsentLoginBlock />
        <ProfPartnerSessionVisit />
      </CookieConsentProvider>,
    );
    await screen.findByRole("checkbox", { name: /разрешить учёт посещений/i });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить выбор" }));
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toMatch(/"analytics":true/);
    expect(decodeURIComponent(document.cookie)).toContain('"analytics":true');
    expect(screen.queryByTestId("analytics-consent-login")).toBeNull();
  });

  it("saves analytics=false when user unchecks before confirm", async () => {
    render(
      <CookieConsentProvider>
        <ProfAnalyticsConsentLoginBlock />
        <ProfPartnerSessionVisit />
      </CookieConsentProvider>,
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole("checkbox", { name: /разрешить учёт посещений/i }));
    await ui.click(screen.getByRole("button", { name: "Подтвердить выбор" }));
    await waitFor(() =>
      expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toMatch(/"analytics":false/),
    );
    expect(mocks.visit).not.toHaveBeenCalled();
  });

  it("keeps stored rejection after reload without opt-in draft override", async () => {
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
        <ProfAnalyticsConsentLoginBlock />
        <ProfAnalyticsConsentProfileSetting />
      </CookieConsentProvider>,
    );
    expect(screen.queryByTestId("analytics-consent-login")).toBeNull();
    expect(await screen.findByTestId("analytics-consent-profile")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /разрешить учёт посещений/i })).not.toBeChecked();
  });

  it("profile save enables visit tracking and disable stops further events", async () => {
    render(
      <CookieConsentProvider>
        <ProfAnalyticsConsentProfileSetting />
        <ProfPartnerSessionVisit />
      </CookieConsentProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Сохранить настройку" }));
    await waitFor(() => expect(mocks.visit).toHaveBeenCalledTimes(1));
    mocks.visit.mockClear();
    const ui = userEvent.setup();
    await ui.click(screen.getByRole("checkbox", { name: /разрешить учёт посещений/i }));
    await ui.click(screen.getByRole("button", { name: "Сохранить настройку" }));
    await waitFor(() =>
      expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toMatch(/"analytics":false/),
    );
    expect(mocks.visit).not.toHaveBeenCalled();
  });

  it("does not show global fixed banner or footer manage control in cabinet shell content", () => {
    render(<CabinetWithVisit />);
    expect(document.querySelector('[class*="banner"]')).toBeNull();
    expect(screen.queryByTestId("analytics-consent-manage")).toBeNull();
  });
});
