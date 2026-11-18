import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const at = "2026-11-14T18:40:00.000Z";
const BRANCHES = [
  { id: "br-a", name: "Филиал А", city: "Москва", address: "Тверская, 1" },
  { id: "br-b", name: "Филиал Б", city: "Казань", address: "Баумана, 2" },
];

type Access = {
  mutationsAllowed: boolean;
  denialCode: string | null;
  canManageLeads: boolean;
  canScan: boolean;
  actorKind: "owner" | "staff" | "assistant";
};

const staffAccess = (over: Partial<Access> = {}): Access => ({
  mutationsAllowed: true,
  denialCode: null,
  canManageLeads: true,
  canScan: true,
  actorKind: "staff",
  ...over,
});

function install(opts: { access: Access; branches?: typeof BRANCHES; listStatus?: number }) {
  api.mockImplementation(async (path) => {
    const base = path.split("?")[0];
    if (base === "/api/pro/context") return { role: "BRANCH_EMPLOYEE", branches: opts.branches ?? BRANCHES } as never;
    if (base.endsWith("/working-stages")) {
      return { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] } as never;
    }
    if (base === "/api/pro/client-appeals") {
      if (opts.listStatus) throw new RemcardApiError(opts.listStatus, "Forbidden");
      return {
        appeals: [
          {
            id: "one", clientDisplayName: "Клиент один", receivingPartnerUserId: "owner",
            stageKey: "sys_new", originKind: "manual", createdAt: at, updatedAt: at,
          },
        ],
        readOnly: !opts.access.mutationsAllowed,
        access: { listAllowed: true, ...opts.access },
        ...(opts.access.actorKind === "staff" ? { branchScope: { branches: opts.branches ?? BRANCHES } } : {}),
        nextCursor: null,
      } as never;
    }
    throw new Error(`unexpected ${path}`);
  });
}

const listReads = () => api.mock.calls.map(([p]) => p).filter((p) => p.split("?")[0] === "/api/pro/client-appeals");

beforeEach(() => {
  api.mockReset();
});

describe("B2: /clients for an organization employee", () => {
  it("offers only his own branches and filters the list by the chosen one", async () => {
    install({ access: staffAccess() });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    expect(trigger).toHaveTextContent("Все филиалы");
    await user.click(trigger);
    const options = within(screen.getByRole("menu")).getAllByRole("menuitemradio").map((o) => o.textContent);
    expect(options).toHaveLength(3);
    expect(options[0]).toContain("Все доступные филиалы");
    expect(options.join(" ")).toContain("Филиал А");
    expect(options.join(" ")).toContain("Филиал Б");

    await user.click(screen.getByTestId("ca-receiving-branch-option-br-b"));
    await waitFor(() => expect(listReads().some((p) => p.includes("branchId=br-b"))).toBe(true));
    expect(listReads()[0]).not.toContain("branchId");
    expect(listReads()[0]).not.toContain("branchScope");
  });

  it("a single-branch employee sees his branch as a label, not a selector", async () => {
    install({ access: staffAccess(), branches: [BRANCHES[0]!] });
    render(<ReceivingAppealsWorkspace />);
    expect(await screen.findByTestId("ca-receiving-branch-single")).toHaveTextContent("Филиал А");
    expect(screen.queryByTestId("ca-receiving-branch-trigger")).not.toBeInTheDocument();
  });

  it("the owner gets no branch selector (behavior unchanged)", async () => {
    install({ access: staffAccess({ actorKind: "owner" }) });
    render(<ReceivingAppealsWorkspace />);
    await screen.findByText("Клиент один");
    expect(screen.queryByTestId("ca-receiving-branch-filter")).not.toBeInTheDocument();
    expect(api.mock.calls.some(([p]) => p === "/api/pro/context")).toBe(false);
  });

  it("a VIEWER sees the list without any change button", async () => {
    install({ access: staffAccess({ mutationsAllowed: false, denialCode: "READ_ONLY", canManageLeads: false, canScan: false }) });
    render(<ReceivingAppealsWorkspace />);
    await screen.findByText("Клиент один");
    expect(screen.getByText(/Только просмотр/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сканировать сертификат" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Добавить клиента" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Этапы и причины/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("an employee who only accepts certificates keeps the scan entry but not manual/settings", async () => {
    install({ access: staffAccess({ canManageLeads: false }) });
    render(<ReceivingAppealsWorkspace />);
    await screen.findByText("Клиент один");
    expect(screen.getByRole("button", { name: "Сканировать сертификат" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Добавить клиента" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Этапы и причины/ })).not.toBeInTheDocument();
  });

  it("any 403 on the list reads as a plain access sentence, never bare «Forbidden»", async () => {
    install({ access: staffAccess(), listStatus: 403 });
    render(<ReceivingAppealsWorkspace />);
    const alert = await screen.findByTestId("ca-receiving-appeals-error");
    expect(alert).toHaveTextContent("Нет доступа к клиентам этого филиала. Обратитесь к владельцу кабинета");
    expect(alert).not.toHaveTextContent(/^forbidden$/i);
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument();
  });

  it("a 5xx keeps its own message", async () => {
    install({ access: staffAccess(), listStatus: 503 });
    render(<ReceivingAppealsWorkspace />);
    const alert = await screen.findByTestId("ca-receiving-appeals-error");
    expect(alert).not.toHaveTextContent("Нет доступа");
  });
});
