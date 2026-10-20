import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CertificateListResponse } from "@/lib/certificate-types";
import { SpecialistHomeDashboard } from "./SpecialistHomeDashboard";

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

function compactStatText(value: string): string {
  return value.replace(/[\u00a0\u202f\s]/g, "");
}

/** Match stat `<strong>` values (money may be split into nowrap group spans). */
function getStatText(text: string): HTMLElement {
  const expected = compactStatText(text);
  return screen.getByText((_, element) => {
    return (
      element?.tagName === "STRONG" &&
      compactStatText(element.textContent ?? "") === expected
    );
  });
}

describe("SpecialistHomeDashboard", () => {
  it("renders prototype copy and maps wallet metrics", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return { role: "MASTER", totalRub: 1500, paidRub: 400, pendingRub: 1100, count: 3 };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [{ id: "c1" }, { id: "c2" }] };
      }
      throw new Error(`unexpected ${path}`);
    });

    render(<SpecialistHomeDashboard />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Рекомендуйте проверенного партнёра/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(getStatText("2")).toBeInTheDocument();
      expect(getStatText("1 500 ₽")).toBeInTheDocument();
      expect(getStatText("400 ₽")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Партнёры/ })).toHaveAttribute("href", "/partners");
    expect(screen.getByRole("link", { name: /Сертификаты/ })).toHaveAttribute(
      "href",
      "/recommendations",
    );
    expect(screen.getByRole("link", { name: /Мои бонусы/ })).toHaveAttribute("href", "/settlements");
    expect(screen.getByRole("link", { name: /Создать сертификат/ })).toHaveAttribute(
      "href",
      "/recommendations/new",
    );
    expect(screen.queryByRole("button", { name: /Создать сертификат/ })).not.toBeInTheDocument();
  });

  it("shows dash for malformed certificate payload without treating as zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return { role: "MASTER", totalRub: 0, paidRub: 0, pendingRub: 0, count: 0 };
      }
      if (path === "/api/store/certificate") {
        return {} as CertificateListResponse;
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Партнёры/ })).toBeInTheDocument();
  });

  it("shows zero certificates for empty list without treating as error", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return { role: "MASTER", totalRub: 0, paidRub: 0, pendingRub: 0, count: 0 };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(getStatText("0")).toBeInTheDocument();
      expect(
        screen.getAllByText((_, element) => {
          return (
            element?.tagName === "STRONG" &&
            compactStatText(element.textContent ?? "") === compactStatText("0 ₽")
          );
        }).length,
      ).toBeGreaterThanOrEqual(2);
    });
    expect(screen.queryByRole("button", { name: /Обновить показатели/ })).not.toBeInTheDocument();
  });

  it("keeps navigation when wallet fails but certificates load", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        throw new RemcardApiError("Кошелёк недоступен", 503);
      }
      if (path === "/api/store/certificate") {
        return { certificates: [{ id: "c1" }] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByRole("link", { name: /Партнёры/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeInTheDocument();
  });

  it("renders large monetary values inside stat cards", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return {
          role: "MASTER",
          totalRub: 5_123_456,
          paidRub: 2_345_678,
          pendingRub: 2_777_778,
          count: 1,
        };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(getStatText("5 123 456 ₽")).toBeInTheDocument();
      expect(getStatText("2 345 678 ₽")).toBeInTheDocument();
    });
  });

  it("retries metrics after partial failure", async () => {
    let walletCalls = 0;
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        walletCalls += 1;
        if (walletCalls === 1) {
          throw new RemcardApiError("Временная ошибка", 503);
        }
        return { role: "MASTER", totalRub: 500, paidRub: 100, pendingRub: 400, count: 1 };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /Обновить показатели/ }));

    await waitFor(() => {
      expect(getStatText("500 ₽")).toBeInTheDocument();
    });
    expect(walletCalls).toBeGreaterThanOrEqual(2);
  });
});
