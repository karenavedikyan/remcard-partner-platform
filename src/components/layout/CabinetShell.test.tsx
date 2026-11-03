import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  peekCabinetSession: vi.fn(),
}));

vi.mock("@/lib/cabinet-shell-context-token", () => ({
  computeCabinetShellContextToken: vi.fn(),
}));

vi.mock("@/components/layout/CabinetShellTemplateReconciler", () => ({
  CabinetShellTemplateReconciler: ({
    freshShellContextToken,
    children,
  }: {
    freshShellContextToken: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="reconciler" data-token={freshShellContextToken}>
      {children}
    </div>
  ),
}));

import { peekCabinetSession } from "@/lib/session";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";
import { CabinetShell } from "@/components/layout/CabinetShell";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CabinetShell page wrapper", () => {
  it("computes a fresh token from peek without redirecting", async () => {
    vi.mocked(peekCabinetSession).mockResolvedValue({
      id: "u1",
      role: "PRO",
    });
    vi.mocked(computeCabinetShellContextToken).mockResolvedValue("hash-u1");

    const element = await CabinetShell({
      returnTo: "/clients",
      children: <span>body</span>,
    });

    expect(peekCabinetSession).toHaveBeenCalledTimes(1);
    expect(computeCabinetShellContextToken).toHaveBeenCalledWith({
      id: "u1",
      role: "PRO",
    });
    expect(element.props.freshShellContextToken).toBe("hash-u1");
  });

  it('uses "none" when peek is null', async () => {
    vi.mocked(peekCabinetSession).mockResolvedValue(null);
    vi.mocked(computeCabinetShellContextToken).mockResolvedValue("none");

    const element = await CabinetShell({ children: <span>body</span> });
    expect(element.props.freshShellContextToken).toBe("none");
  });
});
