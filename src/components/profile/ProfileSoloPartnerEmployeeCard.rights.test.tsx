import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileSoloPartnerEmployeeCard, type SoloPartnerEmployeeRow } from "./ProfileSoloPartnerEmployeeCard";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {},
}));

const employee = (over: Partial<SoloPartnerEmployeeRow> = {}): SoloPartnerEmployeeRow => ({
  id: "pe-1",
  role: "MANAGER",
  status: "ACTIVE",
  position: null,
  permissions: null,
  user: { id: "u1", displayName: "Помощник", publicId: "RC-1" } as never,
  ...over,
});

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset().mockResolvedValue({});
});

async function open(row: SoloPartnerEmployeeRow) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  render(
    <ul>
      <ProfileSoloPartnerEmployeeCard employee={row} onChanged={onChanged} />
    </ul>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Помощник/ }));
  return onChanged;
}

describe("ProfileSoloPartnerEmployeeCard: persisted rights editing", () => {
  it("never-saved employee shows no granted rights and says so; legacy employees are not given speculative grants", async () => {
    await open(employee({ permissions: null }));
    expect(screen.getByText(/Права ещё не заданы/)).toBeVisible();
    expect(screen.getByTestId("team-permission-matrix")).toBeVisible();
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.filter((b) => b.checked && b.dataset.testid !== "team-perm-own")).toHaveLength(0);
  });

  it("saves the role together with the explicitly chosen rights through the existing employees route", async () => {
    const onChanged = await open(employee({ permissions: { canManageCertificates: false } }));
    await userEvent.click(screen.getByTestId("team-perm-scan"));
    await userEvent.click(screen.getByRole("button", { name: "Сохранить роль и права" }));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    const [path, init] = vi.mocked(remcardFetch).mock.calls[0] as [string, { method: string; body: Record<string, unknown> }];
    expect(path).toBe("/api/pro/employees/pe-1");
    expect(init.method).toBe("PATCH");
    expect(init.body.role).toBe("MANAGER");
    expect(init.body.permissions).toMatchObject({ canManageCertificates: true });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("an explicitly saved false flag stays unchecked after reopening", async () => {
    await open(employee({ permissions: { canManageCertificates: false, canViewWallet: true } }));
    expect(screen.getByTestId("team-perm-scan")).not.toBeChecked();
    expect(screen.getByTestId("team-perm-ledger")).toBeChecked();
  });

  it("revoke uses DELETE of the employment row", async () => {
    await open(employee());
    await userEvent.click(screen.getByRole("button", { name: "Отозвать доступ" }));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(remcardFetch).mock.calls[0]![1]).toMatchObject({ method: "DELETE" });
  });
});
