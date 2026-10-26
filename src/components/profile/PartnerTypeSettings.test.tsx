import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerTypeSettings } from "./PartnerTypeSettings";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
  RemcardApiError: class RemcardApiError extends Error {},
}));

const switchOptions = [
  { kind: "agent", label: "Агент", description: "desc", isCurrent: true },
  { kind: "specialist", label: "Специалист", description: "d", isCurrent: false },
  { kind: "store", label: "Магазин", description: "d", isCurrent: false },
  { kind: "company", label: "Компания", description: "d", isCurrent: false },
];

const baseProfile = {
  user: {
    id: "u1",
    publicId: "RC-TEST-1",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
  organization: null,
  programs: [],
};

describe("PartnerTypeSettings", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("renders current type and open action", async () => {
    remcardFetch.mockResolvedValue({
      currentKind: "agent",
      isEmployee: false,
      publicId: "RC-TEST-1",
      options: switchOptions,
    });
    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    expect(await screen.findByTestId("partner-type-settings")).toBeInTheDocument();
    expect(screen.getByTestId("partner-type-current")).toHaveTextContent("Агент");
    expect(screen.getByTestId("partner-type-open")).toBeInTheDocument();
  });

  it("shows unsaved guard instead of choose dialog when basics are dirty", async () => {
    remcardFetch.mockResolvedValue({
      currentKind: "agent",
      isEmployee: false,
      publicId: "RC-TEST-1",
      options: switchOptions,
    });
    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    await screen.findByTestId("partner-type-open");
    fireEvent.click(screen.getByTestId("partner-type-open"));
    expect(await screen.findByTestId("partner-type-unsaved")).toBeInTheDocument();
    expect(
      remcardFetch.mock.calls.some(
        (c) => String(c[0]).includes("/api/pro/partner-type/switch") && c[1]?.method === "POST",
      ),
    ).toBe(false);
  });

  it("shows recovery message when POST succeeds but profile refresh fails", async () => {
    remcardFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.startsWith("/api/pro/partner-type/switch") && init?.method === "POST") {
        return { ok: true };
      }
      if (url === "/api/pro/profile") {
        throw new Error("profile down");
      }
      if (url.includes("target=specialist")) {
        return {
          currentKind: "agent",
          isEmployee: false,
          publicId: "RC-TEST-1",
          options: switchOptions,
          preview: { changes: "c", preservedSummary: "p" },
        };
      }
      return {
        currentKind: "agent",
        isEmployee: false,
        publicId: "RC-TEST-1",
        options: switchOptions,
      };
    });

    const onRefresh = vi.fn();
    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={onRefresh}
      />,
    );
    await screen.findByTestId("partner-type-open");
    fireEvent.click(screen.getByTestId("partner-type-open"));
    await screen.findByTestId("partner-type-choose");
    fireEvent.click(
      document.querySelector('input[name="partner-type"][value="specialist"]') as HTMLInputElement,
    );
    fireEvent.click(document.querySelector('[data-partner-type-action="review"]')!);
    await screen.findByTestId("partner-type-review");
    fireEvent.click(document.querySelector("[data-partner-type-ack]")!);
    fireEvent.click(screen.getByTestId("partner-type-apply"));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const recovery = await screen.findByTestId("partner-type-recovery");
    expect(recovery.textContent).toMatch(/уже изменён на сервере/i);
    const postCalls = remcardFetch.mock.calls.filter(
      (c) => c[0] === "/api/pro/partner-type/switch" && c[1]?.method === "POST",
    );
    expect(postCalls.length).toBe(1);
  });

  it("settled post-commit recovery keeps notice after dialog closes", async () => {
    const state = {
      currentKind: "agent" as const,
      isEmployee: false,
      publicId: "RC-REVIEW-TEST",
      options: switchOptions,
      preview: null,
    };
    let committed = false;
    remcardFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/pro/profile") throw new Error("profile unavailable");
      if (init?.method === "POST") {
        committed = true;
        return { ok: true, newKind: "specialist" };
      }
      return {
        ...state,
        currentKind: committed ? ("specialist" as const) : ("agent" as const),
      };
    });
    const refresh = vi.fn();
    render(
      <PartnerTypeSettings
        profile={{
          ...baseProfile,
          user: { ...baseProfile.user, publicId: "RC-REVIEW-TEST" },
        }}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={vi.fn()}
        onRequestRefresh={refresh}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Сменить тип партнёрства/ }));
    fireEvent.click(await screen.findByRole("radio", { name: /Специалист/ }));
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Сменить на/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("partner-type-recovery").textContent).toMatch(
      /уже изменён на сервере/i,
    );
    expect(
      remcardFetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });
});
