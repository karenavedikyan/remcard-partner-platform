import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessOwnerHomeDashboard } from "./BusinessOwnerHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const { remcardFetch, RemcardApiError } = await import("@/lib/api-client");

describe("BusinessOwnerHomeDashboard without an organization (M6.4)", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
    sessionStorage.clear();
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return Promise.reject(
          new RemcardApiError("Организация не найдена — создайте профиль организации", 404),
        );
      }
      return Promise.resolve({ role: "ORG_OWNER", branches: [] });
    });
  });

  it("company: first CTA fills the profile, neutral hint instead of a red alert, no invite CTA", async () => {
    render(<BusinessOwnerHomeDashboard partnerType="COMPANY" />);
    const cta = await screen.findByTestId("business-home-fill-profile-cta");
    expect(cta).toHaveTextContent("Заполнить профиль компании");
    expect(cta).toHaveAttribute("href", "/profile?section=basics&fill=1");
    expect(screen.queryByText(/Пригласить сотрудника/)).toBeNull();

    const hint = screen.getByTestId("business-home-no-org-hint");
    expect(hint).toHaveTextContent("Сначала заполните профиль компании");
    expect(hint.querySelector("a")).toHaveAttribute("href", "/profile?section=basics&fill=1");
    expect(screen.queryByText(/Организация не найдена/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("store: same pattern with the store noun", async () => {
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByTestId("business-home-fill-profile-cta")).toBeTruthy());
    expect(screen.getByTestId("business-home-fill-profile-cta")).toHaveTextContent(
      "Заполнить профиль магазина",
    );
    expect(screen.getByTestId("business-home-no-org-hint")).toHaveTextContent(
      "Сначала заполните профиль магазина",
    );
  });

  it("other metric errors keep the regular error presentation", async () => {
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return Promise.reject(new RemcardApiError("Сервис недоступен", 500));
      }
      return Promise.resolve({ role: "ORG_OWNER", branches: [] });
    });
    render(<BusinessOwnerHomeDashboard partnerType="COMPANY" />);
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.queryByTestId("business-home-fill-profile-cta")).toBeNull();
  });
});
