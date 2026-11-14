import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClientsListWorkspace } from "./ClientsListWorkspace";
import * as observerFetch from "@/lib/clients-parity/fetch-observer-appeals";
import { OwnerClientsModeProvider } from "./OwnerClientsModeContext";

vi.mock("@/lib/clients-parity/fetch-observer-appeals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients-parity/fetch-observer-appeals")>();
  return {
    ...actual,
    fetchObserverReferredAppeals: vi.fn().mockResolvedValue({
      ok: true,
      appeals: [],
      partners: [],
    }),
  };
});

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...actual,
    isReceivingAppealsProxyReady: () => true,
    isReceivingBatchProxyReady: () => true,
    isReceivingCertificateEntryProxyReady: () => true,
    fetchReceivingAppealsWorkspace: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        appeals: [],
        readOnly: false,
        access: { listAllowed: true, mutationsAllowed: true },
        settings: { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] },
      },
    }),
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("./OwnerClientsGate", () => ({
  OwnerClientsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function wrap(mode: "specialist" | "agent", ui: React.ReactNode) {
  return (
    <OwnerClientsModeProvider mode={mode}>
      {ui}
    </OwnerClientsModeProvider>
  );
}

describe("P6 clients direction intro chrome", () => {
  it("hides page heading and direction tabs when both directions are proven empty", async () => {
    render(wrap("specialist", <ClientsListWorkspace />));
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId("clients-direction-workspace")).toHaveAttribute(
        "data-clients-chrome-tabs-hidden",
        "true",
      ),
    );
    expect(screen.getByText("Здесь начнётся работа с вашими клиентами")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-clients-directions")).toBeNull();
    expect(screen.queryByText("Клиенты у вас и направления к партнёрам.")).toBeNull();
  });

  it("keeps direction tabs when observer still loading", async () => {
    vi.mocked(observerFetch.fetchObserverReferredAppeals).mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    render(wrap("specialist", <ClientsListWorkspace />));
    await waitFor(() => expect(screen.getByTestId("ca-receiving-appeals-loading")).toBeInTheDocument());
    expect(screen.getByTestId("ca-clients-directions")).toBeInTheDocument();
  });

  it("agent shows at-partners intro without duplicate heading", async () => {
    render(wrap("agent", <ClientsListWorkspace />));
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    expect(screen.getByText("Здесь появятся клиенты, которых вы направили")).toBeInTheDocument();
    expect(screen.queryByText("Направленные клиенты и статусы у принимающих партнёров.")).toBeNull();
  });
});