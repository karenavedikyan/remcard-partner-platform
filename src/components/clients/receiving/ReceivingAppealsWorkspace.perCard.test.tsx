import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

/**
 * "All branches" changes only what is displayed: each row/card is editable by the per-appeal flag the server computes
 * from the appeal's stored branch. The server mock mirrors the real one: the general list carries an AGGREGATE access
 * envelope (writer if any branch is writable), rows and cards carry their own flags, an explicit branch answers for itself.
 */
const api = vi.mocked(remcardFetch);
const at = "2026-11-14T18:40:00.000Z";
const A = { id: "br-a", name: "Филиал А", city: "Город", address: null };
const B = { id: "br-b", name: "Филиал Б", city: "Город", address: null };
const ROWS = [
  { id: "a1", name: "Клиент А", branch: A.id },
  { id: "b1", name: "Клиент Б", branch: B.id },
];
const full = { listAllowed: true, actorKind: "staff" };
const writer = { ...full, mutationsAllowed: true, denialCode: null, canManageLeads: true, canScan: true };
const viewer = { ...full, mutationsAllowed: false, denialCode: "READ_ONLY", canManageLeads: false, canScan: false };

function install(opts: { writable: string[]; legacy?: boolean; cookie?: string; serverDenies?: string[] }) {
  const accessOf = (ids: string[]) => (ids.some((b) => opts.writable.includes(b)) ? writer : viewer);
  api.mockImplementation(async (path, request) => {
    const url = new URL(path, "https://x.invalid");
    const base = url.pathname;
    const q = url.searchParams;
    if (base.endsWith("/working-stages")) {
      return { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] } as never;
    }
    if (request?.method && request.method !== "GET") {
      if (base === "/api/pro/client-appeals/batch") {
        const ids = (request.body as { ids: string[] }).ids;
        const rows = ids.map((id) => ROWS.find((r) => r.id === id)!);
        const allowed = (r: (typeof ROWS)[number]) => opts.writable.includes(r.branch) && !opts.serverDenies?.includes(r.branch);
        return {
          updatedIds: rows.filter(allowed).map((r) => r.id),
          skippedIds: [],
          failures: rows.filter((r) => !allowed(r)).map((r) => ({ id: r.id, code: "FOREIGN_BRANCH" })),
        } as never;
      }
      return { appeal: {}, revision: 4 } as never;
    }
    const all = q.get("branchScope") === "all";
    const branchId = q.get("branchId") ?? (all ? null : (opts.cookie ?? A.id));
    if (base === "/api/pro/client-appeals") {
      const rows = ROWS.filter((r) => all || r.branch === branchId);
      return {
        appeals: q.get("bucket") === "archive" ? [] : rows.map((r) => ({
          id: r.id, clientDisplayName: r.name, receivingPartnerUserId: "owner", receivingBranchId: r.branch,
          stageKey: "sys_new", originKind: "manual", createdAt: at, updatedAt: at, bucket: "active",
          ...(opts.legacy ? {} : { capabilities: { canManageLeads: opts.writable.includes(r.branch), canScan: opts.writable.includes(r.branch) } }),
        })),
        readOnly: accessOf(rows.map((r) => r.branch)).mutationsAllowed === false,
        access: accessOf(all ? [A.id, B.id] : [branchId!]),
        principal: { receivingPartnerUserId: "owner", receivingBranchId: all ? null : branchId },
        branchScope: { branches: [A, B] },
        nextCursor: null,
      } as never;
    }
    const m = /^\/api\/pro\/client-appeals\/([^/]+)$/.exec(base);
    if (m) {
      const row = ROWS.find((r) => r.id === m[1])!;
      const own = opts.writable.includes(row.branch);
      const aggregate = all ? writer : own ? writer : viewer;
      return {
        appeal: {
          id: row.id, clientDisplayName: row.name, receivingPartnerUserId: "owner", receivingBranchId: row.branch,
          receivingOrganizationId: null, originKind: "manual", stageKey: "sys_new", privateNotes: "", createdAt: at, updatedAt: at,
        },
        revision: 3, history: [], workingStages: [{ id: "work_contact", label: "На связи" }], refusalReasons: ["Дорого"],
        ...(opts.legacy
          ? { readOnly: !aggregate.mutationsAllowed, access: aggregate }
          : {
              capabilities: { canManageLeads: own, canScan: own },
              readOnly: !own,
              access: own ? writer : viewer,
            }),
      } as never;
    }
    throw new Error(`unexpected ${path}`);
  });
}

const selectedCount = (n: number) =>
  screen.getByText((_, el) => el?.classList.contains("ca-bulk-count") === true && el.textContent === `Выбрано: ${n}`);
const mutations = () => api.mock.calls.filter(([, r]) => r?.method && r.method !== "GET");
const cardWritable = () => Boolean(screen.queryByTestId("ca-receiving-next-primary") || screen.queryByTestId("ca-receiving-refuse"));
const checkboxFor = (name: string) => screen.queryByRole("checkbox", { name: `Выбрать ${name}` });

beforeEach(() => {
  api.mockReset();
});

async function chooseAll(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("ca-receiving-branch-trigger"));
  await user.click(screen.getByTestId("ca-receiving-branch-option-all"));
  await screen.findByText("Клиент Б");
}
async function chooseBranch(user: ReturnType<typeof userEvent.setup>, id: string) {
  await user.click(await screen.findByTestId("ca-receiving-branch-trigger"));
  await user.click(screen.getByTestId(`ca-receiving-branch-option-${id}`));
}

describe("A=writer, B=viewer (cookie A)", () => {
  beforeEach(() => install({ writable: [A.id] }));

  it("«all»: only the writable row is selectable; the viewer row has no checkbox and select-all skips it", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    expect(checkboxFor("Клиент А")).toBeInTheDocument();
    expect(checkboxFor("Клиент Б")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Все найденные (1)" }));
    expect(checkboxFor("Клиент А")).toBeChecked();
    expect(selectedCount(1)).toBeInTheDocument();
  });

  it("«all»: bulk archive sends only the writable id, without branchId/branchScope, and does not touch the context", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByRole("checkbox", { name: "Все найденные (1)" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    const [path, req] = mutations()[0];
    expect(path).toBe("/api/pro/client-appeals/batch");
    expect(req?.body).toEqual({ action: "archive", ids: ["a1"] });
    expect(api.mock.calls.some(([p]) => p.startsWith("/api/pro/context"))).toBe(false);
  });

  it("«all»: card of B is read-only (no write controls, no mutation); card of A is editable", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByText("Клиент Б"));
    await waitFor(() => expect(screen.getAllByText(/только просмотр/i).length).toBeGreaterThan(0));
    expect(cardWritable()).toBe(false);
    expect(screen.queryByRole("button", { name: "Отметить оплату" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /К списку|Назад/ }));
    await screen.findByText("Клиент А");
    await user.click(screen.getByText("Клиент А"));
    expect(await screen.findByTestId("ca-receiving-next-primary")).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });

  it("explicit A keeps normal editing; explicit B stays read-only from its own flags", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByText("Клиент А");
    expect(checkboxFor("Клиент А")).toBeInTheDocument();
    await user.click(screen.getByText("Клиент А"));
    expect(await screen.findByTestId("ca-receiving-next-primary")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /К списку|Назад/ }));
    await chooseBranch(user, B.id);
    await screen.findByText("Клиент Б");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await user.click(screen.getByText("Клиент Б"));
    await waitFor(() => expect(screen.getAllByText(/только просмотр/i).length).toBeGreaterThan(0));
    expect(cardWritable()).toBe(false);
  });

  it("returning from a card keeps the explicit scope, the per-row rights and the label", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByText("Клиент Б"));
    await waitFor(() => expect(screen.getAllByText(/только просмотр/i).length).toBeGreaterThan(0));
    await user.click(await screen.findByRole("button", { name: /К списку|Назад/ }));
    await screen.findByText("Клиент А");
    expect(screen.getByTestId("ca-receiving-branch-trigger")).toHaveTextContent("Все филиалы");
    expect(checkboxFor("Клиент А")).toBeInTheDocument();
    expect(checkboxFor("Клиент Б")).not.toBeInTheDocument();
  });
});

describe("reverse: A=viewer, B=writer, working branch (cookie) A", () => {
  beforeEach(() => install({ writable: [B.id] }));

  it("A alone is read-only; from «all» the B card is editable and the write carries no scope", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByText("Клиент А");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await chooseAll(user);
    expect(checkboxFor("Клиент А")).not.toBeInTheDocument();
    expect(checkboxFor("Клиент Б")).toBeInTheDocument();
    await user.click(screen.getByText("Клиент Б"));
    const next = await screen.findByTestId("ca-receiving-next-primary");
    await user.click(next);
    await waitFor(() => expect(mutations().length).toBeGreaterThan(0));
    for (const [path] of mutations()) {
      expect(path).toContain("/api/pro/client-appeals/b1");
      expect(path).not.toMatch(/branchId|branchScope/);
    }
    expect(api.mock.calls.some(([p]) => p.startsWith("/api/pro/context"))).toBe(false);
  });
});

describe("writer in both branches: mixed bulk across branches and the server's partial answer", () => {
  it("viewer rows never reach the batch even when everything is selected", async () => {
    install({ writable: [A.id] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByRole("checkbox", { name: "Все найденные (1)" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][1]?.body).toEqual({ action: "archive", ids: ["a1"] });
  });

  it("flags say both writable but the server re-authorizes and denies B: partial result is shown, B stays selected", async () => {
    install({ writable: [A.id, B.id], serverDenies: [B.id] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByRole("checkbox", { name: "Все найденные (2)" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(selectedCount(1)).toBeInTheDocument());
    expect(screen.getAllByText(/Обновлено: 1/).length).toBeGreaterThan(0);
    expect(mutations()[0][1]?.body).toEqual({ action: "archive", ids: ["a1", "b1"] });
  });

  it("both branches writable: one confirmed batch carries both ids", async () => {
    install({ writable: [A.id, B.id] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByRole("checkbox", { name: "Все найденные (2)" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][1]?.body).toEqual({ action: "archive", ids: ["a1", "b1"] });
  });
});

describe("older server without per-appeal flags", () => {
  beforeEach(() => install({ writable: [A.id], legacy: true }));

  it("«all» fails closed to read-only (aggregate is not a write right); an explicit branch keeps its own answer", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await user.click(screen.getByText("Клиент А"));
    await waitFor(() => expect(screen.getAllByText(/только просмотр/i).length).toBeGreaterThan(0));
    expect(cardWritable()).toBe(false);
    await user.click(await screen.findByRole("button", { name: /К списку|Назад/ }));
    await chooseBranch(user, A.id);
    await waitFor(() => expect(checkboxFor("Клиент А")).toBeInTheDocument());
    expect(mutations()).toHaveLength(0);
  });
});

describe("add / scan in the general mode", () => {
  it("still ask to choose a working context and send nothing", async () => {
    install({ writable: [A.id] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await chooseAll(user);
    await user.click(screen.getByRole("button", { name: "Добавить клиента" }));
    expect(screen.getByTestId("ca-receiving-branch-required")).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
  });
});
