import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));
const api = vi.mocked(remcardFetch);
const at = "2026-11-14T20:00:00.000Z";

function install(patchError: RemcardApiError | null) {
  let stagePatchError = patchError;
  const state = { revision: 3, stage: "sys_new" };
  api.mockImplementation(async (path, request) => {
    if (request?.method === "PATCH") {
      if (stagePatchError) {
        const err = stagePatchError;
        stagePatchError = null;
        if (err.status === 409) {
          state.revision = 4;
        }
        throw err;
      }
      const body = request.body as { stageKey: string; expectedRevision: number };
      if (body.expectedRevision !== state.revision) throw new Error("stale revision");
      state.stage = body.stageKey;
      state.revision++;
      return {} as never;
    }
    return {
      appeal: {
        id: "one", clientDisplayName: "Клиент один", receivingPartnerUserId: "owner",
        receivingBranchId: null, receivingOrganizationId: null, originKind: "manual",
        stageKey: state.stage, privateNotes: "", createdAt: at, updatedAt: at,
      },
      revision: state.revision, history: [],
      workingStages: [{ id: "work_contact", label: "На связи" }],
      refusalReasons: [],
    } as never;
  });
  return state;
}

beforeEach(() => api.mockReset());

describe("Receiving detail: stage version conflict and server error are explicit", () => {
  it("409 refreshes the card in place, says so, and the retry uses the new revision", async () => {
    install(new RemcardApiError(409, "Конфликт версии"));
    const user = userEvent.setup();
    render(<ReceivingAppealDetailHost appealId="one" onBack={vi.fn()} readOnly={false} />);
    await user.click(await screen.findByTestId("ca-receiving-next-primary"));
    const notice = await screen.findByTestId("ca-receiving-stage-error");
    expect(notice).toHaveTextContent("Карточка изменилась — данные обновлены");
    expect(screen.getByRole("heading", { name: "Клиент один" })).toBeInTheDocument();
    const patches = () => api.mock.calls.filter(([, r]) => r?.method === "PATCH");
    expect(patches()).toHaveLength(1);
    expect(patches()[0][1]?.body).toMatchObject({ expectedRevision: 3 });
    const next = await screen.findByTestId("ca-receiving-next-primary");
    await user.click(next);
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1][1]?.body).toMatchObject({ expectedRevision: 4 });
    await waitFor(() => expect(screen.queryByTestId("ca-receiving-stage-error")).not.toBeInTheDocument());
  });

  it("a server error keeps the card and the action available for another attempt", async () => {
    install(new RemcardApiError(503, "Сервер недоступен"));
    const user = userEvent.setup();
    render(<ReceivingAppealDetailHost appealId="one" onBack={vi.fn()} readOnly={false} />);
    await user.click(await screen.findByTestId("ca-receiving-next-primary"));
    expect(await screen.findByTestId("ca-receiving-stage-error")).toHaveTextContent("Сервер недоступен");
    expect(screen.getByTestId("ca-receiving-next-primary")).toBeEnabled();
  });
});
