import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/уже изменён на сервере/i);
    });
    expect(onRefresh).toHaveBeenCalled();
    const postCalls = remcardFetch.mock.calls.filter(
      (c) => c[0] === "/api/pro/partner-type/switch" && c[1]?.method === "POST",
    );
    expect(postCalls.length).toBe(1);
  });
});
