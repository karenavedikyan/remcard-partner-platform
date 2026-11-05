import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOrgStaffHomeTemplate } from "./BusinessOrgStaffHomeTemplate";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
}));

describe("BusinessOrgStaffHomeTemplate", () => {
  it("renders navigation template without owner metrics fetch hooks", () => {
    render(<BusinessOrgStaffHomeTemplate partnerType="STORE" />);
    expect(screen.getByTestId("business-org-staff-home-template")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Сканер/i })).toBeTruthy();
    expect(screen.queryByText(/Обновить показатели/i)).toBeNull();
  });
});
