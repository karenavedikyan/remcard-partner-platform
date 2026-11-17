import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));
const api = vi.mocked(remcardFetch);
const at = "2026-11-14T20:00:00.000Z";

function install() {
  const state = { revision: 5, stage: "sys_refused", refusedReason: "Дорого" as string | null };
  api.mockImplementation(async (_path, request) => {
    if (request?.method === "PATCH") {
      const body = request.body as { stageKey: string; refusedReason?: string | null; expectedRevision: number };
      if (body.expectedRevision !== state.revision) throw new Error("stale revision");
      state.stage = body.stageKey;
      state.refusedReason = null;
      state.revision++;
      return {} as never;
    }
    return {
      appeal: {
        id: "one", clientDisplayName: "Клиент один", receivingPartnerUserId: "owner",
        receivingBranchId: null, receivingOrganizationId: null, originKind: "manual",
        stageKey: state.stage, refusedReason: state.refusedReason, privateNotes: "", createdAt: at, updatedAt: at,
      },
      revision: state.revision, history: [],
      workingStages: [{ id: "work_contact", label: "На связи" }],
      refusalReasons: ["Дорого"],
    } as never;
  });
  return state;
}

beforeEach(() => api.mockReset());

describe("B4: return a refused appeal to work", () => {
  it("PATCH stage sys_new, then the card shows «Новое обращение» with the usual actions", async () => {
    const state = install();
    const user = userEvent.setup();
    render(<ReceivingAppealDetailHost appealId="one" onBack={vi.fn()} readOnly={false} />);

    expect(await screen.findByRole("heading", { name: "Отказ" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Вернуть в работу" }));

    const patches = api.mock.calls.filter(([, r]) => r?.method === "PATCH");
    expect(patches).toHaveLength(1);
    expect(String(patches[0][0])).toContain("/stage");
    expect(patches[0][1]?.body).toMatchObject({ stageKey: "sys_new", expectedRevision: 5 });
    expect(state.stage).toBe("sys_new");

    expect(await screen.findByTestId("ca-receiving-next-primary")).toBeInTheDocument();
    expect(screen.getByTestId("ca-receiving-refuse")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Вернуть в работу" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Новое обращение").length).toBeGreaterThan(0);
  });
});
