import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyProfileEntry } from "./CertificatePolicyProfileEntry";

vi.mock("./CertificatePolicyDialog", () => ({
  CertificatePolicyDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="policy-dialog" /> : null),
}));
vi.mock("@/lib/certificate-policy/api", () => ({ fetchCertificatePolicyWorkspace: vi.fn() }));
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";

beforeEach(() => vi.mocked(fetchCertificatePolicyWorkspace).mockReset());

describe("Partners overview policy entry", () => {
  it("shows labelled bold values, a neutral outlined button and opens the same editor", async () => {
    vi.mocked(fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: { general: { effective: { validityDays: 30, purchaseLimit: 1 } } },
    } as never);
    render(<CertificatePolicyProfileEntry viewerUserId="v" canEditSettings showSummary />);
    expect(screen.getByRole("heading", { name: "Общие условия сертификатов" })).toBeInTheDocument();
    expect(await screen.findByText("Срок скидки")).toBeInTheDocument();
    expect(screen.getByTestId("cp-entry-summary-days")).toHaveTextContent("30 дней");
    expect(screen.getByTestId("cp-entry-summary-purchases")).toHaveTextContent(/^1$/);
    const button = screen.getByTestId("cp-open-settings");
    expect(button.className).toMatch(/dpPolicyButton/);
    expect(button.className).not.toMatch(/primary/);
    await userEvent.click(button);
    expect(screen.getByTestId("policy-dialog")).toBeInTheDocument();
  });
});
