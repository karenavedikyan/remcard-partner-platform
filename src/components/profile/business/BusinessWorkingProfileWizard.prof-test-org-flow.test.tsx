/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import {
  baseProfTestProfile,
  createProfTestOrgTransport,
} from "@/lib/prof-test-org-transport.fixture";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

vi.mock("@/lib/onboarding-save", () => ({
  saveDisplayNameViaAuthMe: vi.fn().mockResolvedValue(undefined),
}));

async function walkFourSteps(user: ReturnType<typeof userEvent.setup>, partnerType: "STORE" | "COMPANY") {
  const orgLabel = partnerType === "STORE" ? /Название магазина/i : /Название компании/i;
  await screen.findByLabelText(orgLabel);
  await user.clear(screen.getByLabelText(orgLabel));
  await user.type(screen.getByLabelText(orgLabel), partnerType === "STORE" ? "Магазин Юг" : "СтройКомпания");
  await user.clear(screen.getByLabelText(/Имя представителя/i));
  await user.type(screen.getByLabelText(/Имя представителя/i), "Алексей");
  await user.clear(screen.getByLabelText(/^Город/i));
  await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
  await user.click(screen.getByRole("button", { name: /Продолжить/i }));
  await waitFor(() => expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 2"));

  await user.click(screen.getByRole("button", { name: /Продолжить/i }));
  await waitFor(() => expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 3"));

  await user.click(screen.getByRole("button", { name: /Пропустить/i }));
  await waitFor(() => expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 4"));

  await user.click(screen.getByRole("button", { name: /Сохранить профиль/i }));
  await waitFor(() =>
    expect(screen.getByTestId("business-profile-completed-summary")).toBeInTheDocument(),
  );
}

describe("BusinessWorkingProfileWizard prof-test org flow", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("STORE: four steps with stateful transport create then reload profile", async () => {
    const transport = createProfTestOrgTransport("STORE");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);
    const user = userEvent.setup();

    const { rerender } = render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfTestProfile("STORE")}
        partnerType="STORE"
        basicsEditable
      />,
    );

    await walkFourSteps(user, "STORE");
    expect(transport.getOrg()?.name).toBe("Магазин Юг");

    rerender(
      <BusinessWorkingProfileWizard
        initialProfile={transport.getProfile()}
        partnerType="STORE"
        basicsEditable
      />,
    );
    expect(screen.getByTestId("business-profile-completed-summary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Магазин Юг" })).toBeInTheDocument();
  });

  it("COMPANY: four steps create org via real persist chain", async () => {
    const transport = createProfTestOrgTransport("COMPANY");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);
    const user = userEvent.setup();

    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfTestProfile("COMPANY")}
        partnerType="COMPANY"
        basicsEditable
      />,
    );

    await walkFourSteps(user, "COMPANY");
    expect(transport.getOrg()?.partnerType).toBe("COMPANY");
  });

  it("shows error banner on 403 without leaving step 1", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") return { organization: null };
      if (path === "/api/pro/organization" && init?.method === "POST") {
        throw new RemcardApiError(403, "Поля недоступны", { code: "PROF_TEST_ORG_WRITE_FORBIDDEN" });
      }
      return {};
    });
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfTestProfile("STORE")}
        partnerType="STORE"
        basicsEditable
      />,
    );
    await user.type(screen.getByLabelText(/Название магазина/i), "Магазин Юг");
    await user.type(screen.getByLabelText(/Имя представителя/i), "Алексей");
    await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));

    await waitFor(() => expect(screen.getByText(/Поля недоступны/i)).toBeInTheDocument());
    expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 1");
    expect(screen.getByDisplayValue("Магазин Юг")).toBeInTheDocument();
  });
});
