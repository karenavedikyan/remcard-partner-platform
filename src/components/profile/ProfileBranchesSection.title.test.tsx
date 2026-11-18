import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileBranchesSection } from "./ProfileBranchesSection";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async () => ({ organization: { id: "org-1", name: "Орг", branches: [] } })),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("./ProfileBranchDetail", () => ({
  ProfileBranchDetail: () => <div data-testid="branch-detail" />,
}));

function panelTitle() {
  return screen.getByRole("heading", { level: 2 });
}

describe("ProfileBranchesSection: заголовок панели по типу партнёра", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  it("компания с организацией: «Филиалы»", async () => {
    render(<ProfileBranchesSection hasOrganization partnerType="COMPANY" defaultCity="Казань" />);
    await screen.findByTestId("primary-point-card");
    expect(panelTitle()).toHaveTextContent("Филиалы");
  });

  it("компания без организации: «Филиалы»", () => {
    render(<ProfileBranchesSection hasOrganization={false} partnerType="COMPANY" />);
    expect(panelTitle()).toHaveTextContent("Филиалы");
  });

  it("сотрудник компании (свой профиль без типа, рабочее место COMPANY): «Филиалы»", () => {
    render(
      <ProfileBranchesSection hasOrganization partnerType="MASTER" workplacePartnerType="COMPANY" />,
    );
    expect(panelTitle()).toHaveTextContent("Филиалы");
  });

  it("магазин: «Точки»", async () => {
    render(<ProfileBranchesSection hasOrganization partnerType="STORE" defaultCity="Казань" />);
    await screen.findByTestId("primary-point-card");
    expect(panelTitle()).toHaveTextContent("Точки");
  });

  it("магазин без организации: «Точки»", () => {
    render(<ProfileBranchesSection hasOrganization={false} partnerType="STORE" />);
    expect(panelTitle()).toHaveTextContent("Точки");
  });

  it("специалист: «Точки»", () => {
    render(<ProfileBranchesSection hasOrganization={false} partnerType="MASTER" />);
    expect(panelTitle()).toHaveTextContent("Точки");
  });
});
