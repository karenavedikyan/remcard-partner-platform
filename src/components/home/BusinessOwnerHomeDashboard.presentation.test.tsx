import { render, screen, waitFor } from "@testing-library/react";
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

const { remcardFetch } = await import("@/lib/api-client");

describe("BusinessOwnerHomeDashboard", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("renders store hero and maps metrics", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      partnerType: "STORE",
      activeBranchLabel: "ул. 1, Краснодар",
      metrics: {
        primary: { state: "ok", value: 3 },
        secondary: { state: "ok", value: 2 },
        tertiary: { state: "empty" },
      },
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Начните с продажи по рекомендации/ }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Проверить сертификат/ })).toHaveAttribute(
      "href",
      "/scanner",
    );
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy());
    expect(screen.getByText("ул. 1, Краснодар")).toBeTruthy();
  });

  it("renders company hero and invite CTA", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      partnerType: "COMPANY",
      activeBranchLabel: null,
      metrics: {
        primary: { state: "empty" },
        secondary: { state: "ok", value: 4 },
        tertiary: { state: "ok", value: 1 },
      },
    });

    render(<BusinessOwnerHomeDashboard partnerType="COMPANY" />);

    expect(screen.getByRole("link", { name: /Пригласить сотрудника/ })).toHaveAttribute(
      "href",
      "/profile?section=team",
    );
    await waitFor(() => expect(screen.getByText("4")).toBeTruthy());
    expect(screen.getByText(/Активных партнёрств: 1/)).toBeTruthy();
  });

  it("shows retry when metrics request fails", async () => {
    vi.mocked(remcardFetch).mockRejectedValue(new Error("network"));
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeTruthy(),
    );
    expect(screen.getAllByText(/Не удалось загрузить показатели/).length).toBeGreaterThan(0);
  });

  it("surfaces needs_branch for sales without treating it as zero", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      partnerType: "STORE",
      activeBranchLabel: null,
      metrics: {
        primary: {
          state: "needs_branch",
          message: "Выберите текущий филиал, чтобы увидеть продажи за сегодня",
        },
        secondary: { state: "empty" },
        tertiary: { state: "empty" },
      },
    });
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() =>
      expect(
        screen.getByText(/Выберите текущий филиал, чтобы увидеть продажи за сегодня/),
      ).toBeTruthy(),
    );
  });
});
