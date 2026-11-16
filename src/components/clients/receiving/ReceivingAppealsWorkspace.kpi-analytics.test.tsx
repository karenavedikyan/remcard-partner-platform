import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const at = "2026-11-14T18:40:00.000Z";

const wire = (id: string) => ({
  id,
  clientDisplayName: `Клиент ${id}`,
  receivingPartnerUserId: "receiver",
  stageKey: "sys_new",
  originKind: "manual",
  createdAt: at,
  updatedAt: at,
  bucket: "active",
});

const funnel = {
  total: 8,
  inWork: 5,
  paid: 2,
  shipped: 1,
  returned: 0,
  conv: "25%",
  period: { from: null, to: null },
  avgCheckKopecks: 500_000,
  avgCheckPurchases: 2,
  certificate: { total: 5, paid: 2, conv: "40%" },
  manual: { total: 3, paid: 0, conv: "0%" },
};

beforeEach(() => {
  api.mockReset();
  api.mockImplementation(async (path) => {
    if (path.endsWith("/working-stages")) {
      return { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] } as never;
    }
    if (path.startsWith("/api/pro/client-appeals/funnel")) return { funnel } as never;
    if (path.split("?")[0] === "/api/pro/client-appeals") {
      const cursor = new URL(path, "https://x.invalid").searchParams.get("cursor");
      if (cursor) return { appeals: [wire("c")], readOnly: false, nextCursor: null } as never;
      return {
        appeals: [wire("a"), wire("b")],
        readOnly: false,
        nextCursor: "next",
        kpis: { total: 8, inWork: 5, paid: 2, shipped: 1, returned: 0, conv: "25%" },
      } as never;
    }
    throw new Error(`Unexpected request ${path}`);
  });
});

describe("Receiving workspace — KPI and analytics", () => {
  it("keeps the whole-set KPI after «Загрузить ещё» (later pages carry no kpis)", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const strip = await screen.findByTestId("ca-receiving-kpi-strip");
    expect(strip).toHaveTextContent("Конверсия в оплату25%");
    await user.click(screen.getByRole("button", { name: "Загрузить ещё" }));
    await screen.findByText("Клиент c");
    expect(screen.getByTestId("ca-receiving-kpi-strip")).toHaveTextContent("Конверсия в оплату25%");
    expect(screen.getByTestId("ca-receiving-kpi-strip")).toHaveTextContent("В работе5");
  });

  it("«Аналитика» opens the funnel page backed by the funnel route and returns to the list", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-kpi-strip");
    await user.click(screen.getByRole("button", { name: "Аналитика" }));
    const kpis = await screen.findByTestId("ca-funnel-kpis");
    expect(within(kpis).getByText("Обращения").parentElement).toHaveTextContent("8");
    const funnelCall = api.mock.calls.find(([p]) => p.startsWith("/api/pro/client-appeals/funnel"));
    expect(funnelCall?.[0]).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
    await user.click(screen.getByTestId("ca-clients-back"));
    await waitFor(() => expect(screen.getByTestId("ca-receiving-appeals-list")).toBeInTheDocument());
  });
});
