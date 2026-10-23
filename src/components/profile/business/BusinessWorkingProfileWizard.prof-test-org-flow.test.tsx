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
  AgentPhoneField: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      aria-label="Телефон партнёра"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
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

async function fillStep1(
  user: ReturnType<typeof userEvent.setup>,
  partnerType: "STORE" | "COMPANY",
  rep: string,
  city: string,
  orgName: string,
) {
  const orgLabel = partnerType === "STORE" ? /Название магазина/i : /Название компании/i;
  await screen.findByLabelText(orgLabel);
  await user.clear(screen.getByLabelText(orgLabel));
  await user.type(screen.getByLabelText(orgLabel), orgName);
  await user.clear(screen.getByLabelText(/Имя представителя/i));
  await user.type(screen.getByLabelText(/Имя представителя/i), rep);
  await user.clear(screen.getByLabelText(/^Город/i));
  await user.type(screen.getByLabelText(/^Город/i), city);
}

async function fillStep3Contacts(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText(/Сайт и Telegram/i));
  await user.type(screen.getByLabelText("Сайт"), "https://shop.example");
  await user.type(screen.getByLabelText("Telegram"), "@shop");
  await user.type(screen.getByLabelText("Email"), "partner@example.com");
  await user.type(screen.getByLabelText("Контактное лицо"), "Мария");
}

async function completeWizard(
  user: ReturnType<typeof userEvent.setup>,
  partnerType: "STORE" | "COMPANY",
) {
  await fillStep1(user, partnerType, "Иван Петров", "Сочи", partnerType === "STORE" ? "Магазин Юг" : "СтройКомпания");
  await user.click(screen.getByRole("button", { name: /Продолжить/i }));
  await waitFor(() => expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 2"));
  await user.click(screen.getByRole("button", { name: /Продолжить/i }));
  await waitFor(() => expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 3"));
  await fillStep3Contacts(user);
  await user.click(screen.getByRole("button", { name: /Продолжить/i }));
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

  it.each(["STORE", "COMPANY"] as const)(
    "%s: remount after unmount shows fresh GET summary",
    async (partnerType) => {
      const transport = createProfTestOrgTransport(partnerType);
      vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);
      const user = userEvent.setup();

      const { unmount } = render(
        <BusinessWorkingProfileWizard
          initialProfile={baseProfTestProfile(partnerType)}
          partnerType={partnerType}
          basicsEditable
        />,
      );
      await completeWizard(user, partnerType);
      unmount();

      const fresh = await transport.freshProfileGet();
      render(
        <BusinessWorkingProfileWizard
          initialProfile={fresh}
          partnerType={partnerType}
          basicsEditable
        />,
      );
      expect(screen.getByTestId("business-profile-completed-summary")).toBeInTheDocument();
      expect(transport.getOrg()?.website).toBe("https://shop.example");
      expect(fresh.user.displayName).toBe("Иван Петров");
      expect(fresh.user.city).toBe("Сочи");
    },
  );

  it.each(["STORE", "COMPANY"] as const)("%s: 403 keeps step 1 form values", async (partnerType) => {
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") return { organization: null };
      if (path === "/api/pro/organization" && init?.method === "POST") {
        throw new RemcardApiError(403, "Поля недоступны", { code: "PROF_TEST_ORG_WRITE_FORBIDDEN" });
      }
      if (path === "/api/auth/me" && init?.method === "PATCH") {
        return { user: { displayName: "Иван" } };
      }
      return {};
    });
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfTestProfile(partnerType)}
        partnerType={partnerType}
        basicsEditable
      />,
    );
    const orgName = partnerType === "STORE" ? "Магазин Юг" : "СтройКомпания";
    await fillStep1(user, partnerType, "Иван", "Сочи", orgName);
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() => expect(screen.getByText(/Поля недоступны/i)).toBeInTheDocument());
    expect(screen.getByTestId("business-profile-progress")).toHaveTextContent("Шаг 1");
    expect(screen.getByDisplayValue(orgName)).toBeInTheDocument();
  });
});
