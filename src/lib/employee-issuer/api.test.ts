import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEmployeeIssuerStatus, fetchEmployeeIssuerStatusSafe } from "./api";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ remcardFetch: vi.fn() }));

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset();
});

describe("employee issuer status client", () => {
  it("reads the whitelisted status route", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ applicable: true, workspace: "agent", canIssue: true });
    await expect(fetchEmployeeIssuerStatus()).resolves.toMatchObject({ workspace: "agent" });
    expect(vi.mocked(remcardFetch).mock.calls[0]![0]).toBe("/api/pro/employee-issuer/status");
  });

  it("the safe variant fails closed: any error means no employee workspace", async () => {
    vi.mocked(remcardFetch).mockImplementation(() => Promise.reject(new Error("403")));
    await expect(fetchEmployeeIssuerStatusSafe()).resolves.toBeNull();
  });
});
