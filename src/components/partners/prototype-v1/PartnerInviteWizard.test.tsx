/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

function meProfile(): ProProfileResponse {
  return {
    user: {
      id: "me",
      publicId: "ME",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: ["painting"],
      role: "PRO",
      partnerType: "MASTER",
      partnerActivities: ["SERVICE"],
      description: null,
      catalogStatus: "APPROVED",
      isPublic: true,
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
      showFullName: true,
    },
    organization: null,
    programs: [],
  };
}

function storeTarget(): PartnerSearchResult {
  return {
    id: "store-1",
    displayName: "Дом материалов",
    city: "Краснодар",
    photoUrl: null,
    description: null,
    specializations: [],
    badges: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
    branches: [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
  };
}

describe("PartnerInviteWizard", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("walks three steps without submitting until final button", async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={meProfile()}
        onClose={() => undefined}
        onSent={onSent}
        disableSubmit
      />,
    );

    expect(screen.getByTestId("invite-wizard-step-partner")).toBeInTheDocument();
    expect(screen.getByTestId("invite-request-terms")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    expect(screen.getByTestId("invite-wizard-step-message")).toBeInTheDocument();
    expect(remcardFetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("invite-template-short"));
    const message = screen.getByTestId("invite-wizard-message") as HTMLTextAreaElement;
    expect(message.value.length).toBeGreaterThan(10);

    await user.click(screen.getByRole("button", { name: /Далее: проверка/i }));
    expect(screen.getByTestId("invite-wizard-step-review")).toBeInTheDocument();
    expect(remcardFetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("invite-wizard-submit"));
    expect(remcardFetch).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Отправка отключена/i);
  });

  it("confirms template replace after custom edit; Escape closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={meProfile()}
        onClose={onClose}
        onSent={() => undefined}
        disableSubmit
      />,
    );

    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByTestId("invite-template-business"));
    const field = screen.getByTestId("invite-wizard-message") as HTMLTextAreaElement;
    await user.clear(field);
    await user.type(field, "мой собственный текст");
    await user.click(screen.getByTestId("invite-template-friendly"));
    expect(screen.getByTestId("invite-template-confirm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Оставить свой/i }));
    expect(field.value).toContain("мой собственный текст");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows four-type agent one-way copy for pure agent inviter", async () => {
    const agentProfile = meProfile();
    agentProfile.user.partnerType = "COMPANY";
    agentProfile.user.partnerActivities = ["AGENT"];
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={agentProfile}
        onClose={() => undefined}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    const step = screen.getByTestId("invite-wizard-step-partner");
    expect(within(step).getByText(/рекомендуете товары и услуги получателя/i)).toBeInTheDocument();
  });
});
