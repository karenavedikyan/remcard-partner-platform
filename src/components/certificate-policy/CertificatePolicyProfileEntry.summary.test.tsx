import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CertificatePolicyProfileEntry } from "./CertificatePolicyProfileEntry";

vi.mock("./CertificatePolicyDialog", () => ({ CertificatePolicyDialog: () => null }));
vi.mock("@/lib/certificate-policy/api", () => ({ fetchCertificatePolicyWorkspace: vi.fn() }));
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";

beforeEach(() => {
  vi.mocked(fetchCertificatePolicyWorkspace).mockReset();
});

describe("CertificatePolicyProfileEntry summary", () => {
  it("does not fetch the workspace unless the summary is requested", () => {
    render(<CertificatePolicyProfileEntry viewerUserId="v" canEditSettings />);
    expect(fetchCertificatePolicyWorkspace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("cp-entry-summary")).toBeNull();
  });

  it("shows the general validity and purchase limit", async () => {
    vi.mocked(fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: { general: { effective: { validityDays: 14, purchaseLimit: 5 } } },
    } as never);
    render(<CertificatePolicyProfileEntry viewerUserId="v" canEditSettings showSummary />);
    expect(await screen.findByTestId("cp-entry-summary")).toHaveTextContent("Срок скидки14 днейПокупок5");
    expect(screen.getByTestId("cp-entry-summary-days")).toHaveTextContent("14 дней");
    expect(screen.getByTestId("cp-entry-summary-purchases")).toHaveTextContent("5");
    expect(screen.getByRole("button", { name: "Настроить" })).toBeInTheDocument();
  });

  it("stays quiet when the summary cannot be loaded", async () => {
    vi.mocked(fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: false, code: "ERROR", message: "x" });
    render(<CertificatePolicyProfileEntry viewerUserId="v" canEditSettings showSummary />);
    await vi.waitFor(() => expect(fetchCertificatePolicyWorkspace).toHaveBeenCalled());
    expect(screen.queryByTestId("cp-entry-summary")).toBeNull();
    expect(screen.getByTestId("cp-profile-entry")).toBeInTheDocument();
  });
});
