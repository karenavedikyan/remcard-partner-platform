import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpecialistHomeDashboard } from "./SpecialistHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {},
}));

const { remcardFetch } = await import("@/lib/api-client");

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
    expect(screen.getByRole("link", { name: /Создать сертификат/ })).toHaveAttribute(
      "href",
      "/recommendations/new",
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1 500 ₽")).toBeInTheDocument();
      expect(screen.getByText("400 ₽")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Партнёры/ })).toHaveAttribute("href", "/partners");
    expect(screen.getByRole("link", { name: /Сертификаты/ })).toHaveAttribute(
      "href",
      "/recommendations",
    );
    expect(screen.getByRole("link", { name: /Бонусы/ })).toHaveAttribute("href", "/settlements");
  });
});
