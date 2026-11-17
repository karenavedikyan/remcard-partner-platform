/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";
import { revealProfileWizardFromEmpty } from "@/components/profile/empty-state/profileEmptyTestHelpers";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

const persist = vi.fn();

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: (...args: unknown[]) => persist(...args),
  };
});

function baseProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: { id: "org1", name: "", catalogStatus: "DRAFT", partnerType, branchCount: 0 },
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "",
      city: "",
      specializations: [],
      role: "PRO",
      partnerType,
      description: null,
      catalogStatus: "DRAFT",
      isPublic: false,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
    },
  };
}

describe("BusinessWorkingProfileWizard step actions (M3)", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("marks primary / back / draft / link actions for the phone layout; logic buttons unchanged", async () => {
    Element.prototype.scrollIntoView = vi.fn() as unknown as typeof Element.prototype.scrollIntoView;
    const filled = {
      ...baseProfile("COMPANY"),
      user: { ...baseProfile("COMPANY").user, displayName: "Иван", city: "Краснодар" },
    };
    persist.mockResolvedValue(filled);
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("COMPANY")}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    await revealProfileWizardFromEmpty(user);
    await screen.findByLabelText(/Название компании/i);
    const actions = () => screen.getByTestId("business-step-actions");
    expect(actions()).toHaveAttribute("data-step-actions");
    expect(actions()).toHaveAttribute("data-step-no-back");
    expect(actions().querySelectorAll('[data-step-action="primary"]')).toHaveLength(1);
    expect(actions().querySelector('[data-step-action="back"]')).toBeNull();

    await user.type(screen.getByLabelText(/Название компании/i), "Юг");
    await user.type(screen.getByLabelText(/Имя представителя/i), "Иван");
    await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Назад$/i })).toBeTruthy());
    expect(actions()).not.toHaveAttribute("data-step-no-back");
    expect(screen.getByRole("button", { name: /^Назад$/i })).toHaveAttribute("data-step-action", "back");
    expect(screen.getByRole("button", { name: /^Сохранить$/i })).toHaveAttribute("data-step-action", "draft");
    expect(screen.getByRole("button", { name: /Отменить правки/i })).toHaveAttribute("data-step-action", "link");
    expect(screen.getByRole("button", { name: /Пропустить/i })).toHaveAttribute("data-step-action", "link");
    expect(screen.getByRole("button", { name: /Продолжить/i })).toHaveAttribute("data-step-action", "primary");
  });

  it("globals.css lays the actions out for phones: primary full width first, safe-area bottom", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("@media (max-width: 639px)");
    expect(css).toMatch(/\[data-step-action="primary"\]\s*\{[^}]*order:\s*1;[^}]*grid-column:\s*1 \/ -1/);
    expect(css).toMatch(/\[data-step-actions\]\s*\{[^}]*safe-area-inset-bottom/);
    expect(css).toMatch(/\[data-step-action="link"\]\s*\{[^}]*text-decoration:\s*underline/);
  });
});
