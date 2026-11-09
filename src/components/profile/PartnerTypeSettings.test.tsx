import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerTypeSettings } from "./PartnerTypeSettings";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
  RemcardApiError: class RemcardApiError extends Error {
    body: Record<string, unknown> | null = null;
    constructor(message: string, body: Record<string, unknown> | null = null) {
      super(message);
      this.body = body;
    }
  },
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="directions-picker-stub" />,
}));

const setupRevision = "2026-01-01T12:00:00.000Z";

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

function switchState(extra: Record<string, unknown> = {}) {
  return {
    currentKind: "agent",
    isEmployee: false,
    publicId: "RC-TEST-1",
    setupRevision,
    options: switchOptions,
    ...extra,
  };
}

describe("PartnerTypeSettings", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("renders current type and open action", async () => {
    remcardFetch.mockResolvedValue(switchState());
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
  });

  it("shows unsaved guard instead of choose dialog when basics are dirty", async () => {
    remcardFetch.mockResolvedValue(switchState());
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
  });

  it("auto-opens setup recovery from certificate focus", async () => {
    remcardFetch.mockImplementation(async (url: string) => {
      if (url.includes("target=specialist")) {
        return switchState({
          currentKind: "specialist",
          setupRecovery: {
            needed: true,
            targetKind: "specialist",
            requiredFields: ["publicName", "city", "serviceSpecializationIds"],
            prefill: {
              publicName: "Мастер",
              city: "Краснодар",
              serviceSpecializationIds: [],
              productCategoryIds: ["doors"],
              organizationName: "",
            },
          },
        });
      }
      return switchState({
        currentKind: "specialist",
        setupRecovery: {
          needed: true,
          targetKind: "specialist",
          requiredFields: ["publicName", "city", "serviceSpecializationIds"],
          prefill: {
            publicName: "Мастер",
            city: "Краснодар",
            serviceSpecializationIds: [],
            productCategoryIds: [],
            organizationName: "",
          },
        },
      });
    });
    render(
      <PartnerTypeSettings
        profile={{
          ...baseProfile,
          user: { ...baseProfile.user, partnerType: "MASTER", partnerActivities: ["SERVICE"] },
        }}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
        autoOpenSetupRecovery
      />,
    );
    expect(await screen.findByTestId("partner-type-setup")).toBeInTheDocument();
    expect(screen.getByTestId("partner-type-setup-publicName")).toHaveValue("Мастер");
    expect(screen.getByTestId("partner-type-setup-city")).toHaveValue("Краснодар");
  });

  it("recovery open respects unsaved guard", async () => {
    remcardFetch.mockResolvedValue(
      switchState({
        setupRecovery: {
          needed: true,
          targetKind: "agent",
          requiredFields: ["publicName", "city"],
          prefill: {
            publicName: "Агент",
            city: "Краснодар",
            serviceSpecializationIds: [],
            productCategoryIds: [],
            organizationName: "",
          },
        },
      }),
    );
    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    await screen.findByTestId("partner-type-setup-recovery-open");
    fireEvent.click(screen.getByTestId("partner-type-setup-recovery-open"));
    expect(await screen.findByTestId("partner-type-unsaved")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-type-setup")).toBeNull();
  });

  it("cancel closes setup without POST", async () => {
    remcardFetch.mockResolvedValue(switchState());
    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    fireEvent.click(await screen.findByTestId("partner-type-open"));
    await screen.findByTestId("partner-type-choose");
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      remcardFetch.mock.calls.some(
        (c) => String(c[0]).includes("/api/pro/partner-type/switch") && c[1]?.method === "POST",
      ),
    ).toBe(false);
  });

  it("disables setup fields while save is pending", async () => {
    let resolvePost: (() => void) | undefined;
    remcardFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") {
        return new Promise((resolve) => {
          resolvePost = () => resolve({ ok: true });
        });
      }
      if (url === "/api/pro/profile") return Promise.resolve(baseProfile);
      return Promise.resolve(
        switchState({
          currentKind: "specialist",
          setupRecovery: {
            needed: true,
            targetKind: "specialist",
            requiredFields: ["publicName", "city", "serviceSpecializationIds"],
            prefill: {
              publicName: "Мастер",
              city: "Краснодар",
              serviceSpecializationIds: ["doors"],
              productCategoryIds: [],
              organizationName: "",
            },
          },
        }),
      );
    });
    render(
      <PartnerTypeSettings
        profile={{
          ...baseProfile,
          user: { ...baseProfile.user, partnerType: "MASTER", partnerActivities: ["SERVICE"] },
        }}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
        autoOpenSetupRecovery
      />,
    );
    await screen.findByTestId("partner-type-setup");
    fireEvent.click(document.querySelector("[data-partner-type-ack]")!);
    fireEvent.click(screen.getByTestId("partner-type-apply"));
    const fieldset = screen.getByTestId("partner-type-setup-fields");
    expect(fieldset).toBeDisabled();
    resolvePost?.();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("POST includes setupRevision and agent payload without directions", async () => {
    remcardFetch.mockImplementation(async (url: string, init?: { method?: string; body?: unknown }) => {
      if (url.includes("target=specialist")) {
        return switchState({
          setupForTarget: {
            targetKind: "specialist",
            requiredFields: ["publicName", "city", "serviceSpecializationIds"],
            prefill: {
              publicName: "Агент",
              city: "Краснодар",
              serviceSpecializationIds: ["doors"],
              productCategoryIds: [],
              organizationName: "",
            },
          },
          preview: { changes: "c", preservedSummary: "p" },
        });
      }
      if (init?.method === "POST") {
        return { ok: true };
      }
      if (url === "/api/pro/profile") {
        return baseProfile;
      }
      return switchState();
    });

    render(
      <PartnerTypeSettings
        profile={baseProfile}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    fireEvent.click(await screen.findByTestId("partner-type-open"));
    await screen.findByTestId("partner-type-choose");
    fireEvent.click(
      document.querySelector('input[name="partner-type"][value="specialist"]') as HTMLInputElement,
    );
    fireEvent.click(document.querySelector('[data-partner-type-action="setup"]')!);
    await screen.findByTestId("partner-type-setup-fields");
    expect(screen.getByTestId("partner-type-setup-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("partner-type-apply")).toBeInTheDocument();
    expect(screen.getByTestId("partner-type-setup-publicName")).toHaveValue("Агент");
    fireEvent.click(document.querySelector("[data-partner-type-ack]")!);
    fireEvent.click(screen.getByTestId("partner-type-apply"));

    await waitFor(() => {
      const post = remcardFetch.mock.calls.find(
        (c) => c[0] === "/api/pro/partner-type/switch" && c[1]?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = post?.[1]?.body as Record<string, unknown>;
      expect(body.setupRevision).toBe(setupRevision);
      const setup = body.setup as Record<string, unknown>;
      expect(setup.serviceSpecializationIds).toEqual(["doors"]);
      expect(setup).not.toHaveProperty("productCategoryIds");
    });
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
        return switchState({
          preview: { changes: "c", preservedSummary: "p" },
          setupForTarget: {
            targetKind: "specialist",
            requiredFields: ["publicName", "city", "serviceSpecializationIds"],
            prefill: {
              publicName: "Агент",
              city: "Краснодар",
              serviceSpecializationIds: [],
              productCategoryIds: [],
              organizationName: "",
            },
          },
        });
      }
      return switchState();
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
    fireEvent.click(await screen.findByTestId("partner-type-open"));
    await screen.findByTestId("partner-type-choose");
    fireEvent.click(
      document.querySelector('input[name="partner-type"][value="specialist"]') as HTMLInputElement,
    );
    fireEvent.click(document.querySelector('[data-partner-type-action="setup"]')!);
    await screen.findByTestId("partner-type-setup");
    fireEvent.click(document.querySelector("[data-partner-type-ack]")!);
    fireEvent.click(screen.getByTestId("partner-type-apply"));

    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(await screen.findByTestId("partner-type-recovery")).toBeInTheDocument();
  });
});
