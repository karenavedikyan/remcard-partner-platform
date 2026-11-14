import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { OwnerClientsModeProvider } from "./OwnerClientsModeContext";
import { ClientsPageChromeProvider } from "./new-partner-empty/clientsPageChrome";
import { ReceivingAppealsWorkspace } from "./receiving/ReceivingAppealsWorkspace";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...actual,
    isReceivingAppealsProxyReady: () => true,
    isReceivingBatchProxyReady: () => true,
    isReceivingCertificateEntryProxyReady: () => true,
    fetchReceivingAppealsWorkspace: vi.fn().mockImplementation(
      async (filters: { bucket?: string }) => {
        if (filters.bucket === "archive" || filters.bucket === "trash") {
          return { ok: true, data: { appeals: [], readOnly: false, access: { listAllowed: true, mutationsAllowed: true } } };
        }
        return {
          ok: true,
          data: {
            appeals: [],
            readOnly: false,
            access: { listAllowed: true, mutationsAllowed: true },
            settings: { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] },
          },
        };
      },
    ),
  };
});

function wrap(ui: React.ReactNode) {
  return (
    <OwnerClientsModeProvider mode="specialist">
      <ClientsPageChromeProvider accessMode="specialist">{ui}</ClientsPageChromeProvider>
    </OwnerClientsModeProvider>
  );
}

describe("P6 clients direction intro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows receiving intro only after all buckets are proven empty", async () => {
    render(wrap(<ReceivingAppealsWorkspace directionProbe="incoming" />));
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    expect(screen.getByText("Здесь начнётся работа с вашими клиентами")).toBeInTheDocument();
  });

  it("keeps normal list when archive bucket has records", async () => {
    const api = await import("@/lib/clients-parity/receiving-appeals-api");
    vi.mocked(api.fetchReceivingAppealsWorkspace).mockImplementation(async (filters) => {
      if (filters.bucket === "archive") {
        return {
          ok: true,
          data: {
            appeals: [{ id: "a1", bucket: "archive" } as never],
            readOnly: false,
            access: { listAllowed: true, mutationsAllowed: true },
          },
        };
      }
      if (filters.bucket === "trash") {
        return { ok: true, data: { appeals: [], readOnly: false, access: { listAllowed: true, mutationsAllowed: true } } };
      }
      return {
        ok: true,
        data: {
          appeals: [],
          readOnly: false,
          access: { listAllowed: true, mutationsAllowed: true },
          settings: { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] },
        },
      };
    });

    render(wrap(<ReceivingAppealsWorkspace directionProbe="incoming" />));
    await waitFor(() => expect(screen.getByTestId("ca-receiving-appeals-list")).toBeInTheDocument());
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});