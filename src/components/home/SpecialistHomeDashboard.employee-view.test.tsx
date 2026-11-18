import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistHomeDashboard } from "./SpecialistHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async (path: string) => {
    if (path === "/api/partnership/list") return { partnerships: [{ id: "p1" }] };
    if (path === "/api/pro/wallet/balance") {
      return { role: "MASTER", totalRub: 0, paidRub: 0, pendingRub: 0, count: 0 };
    }
    if (path === "/api/store/certificate") return { certificates: [] };
    throw new Error(`unexpected ${path}`);
  }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

describe("SpecialistHomeDashboard employee view", () => {
  beforeEach(() => cleanup());

  it("owner keeps the profile settings panel", async () => {
    render(<SpecialistHomeDashboard />);
    expect(await screen.findByText("Настроить профиль")).toBeInTheDocument();
  });

  it("employee does not get owner profile settings", async () => {
    render(<SpecialistHomeDashboard employeeView />);
    expect(await screen.findByRole("heading", { level: 2, name: /Рекомендуйте проверенного партнёра/ })).toBeInTheDocument();
    expect(screen.queryByText("Настроить профиль")).toBeNull();
    expect(screen.queryByText("Ничего лишнего на старте")).toBeNull();
  });
});
