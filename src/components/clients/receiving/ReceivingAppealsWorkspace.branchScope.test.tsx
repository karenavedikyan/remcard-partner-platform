import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { PageHeading } from "@/components/ui/PageHeading";
import {
  ClientsPageChromeProvider,
  useClientsPageChrome,
} from "@/components/clients/new-partner-empty/clientsPageChrome";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

/**
 * Synthetic company: working branch A has no appeals, allowed branch B has two. The fake server mirrors
 * the BE contract: no scope -> working branch (cookie), branchId -> that branch, branchScope=all -> A and B.
 */
const api = vi.mocked(remcardFetch);
const at = "2026-11-14T18:40:00.000Z";
const A = { id: "br-a", name: "Филиал А", city: "Город", address: null };
const B = { id: "br-b", name: "Филиал Б", city: "Город", address: null };
const C = { id: "br-c", name: "Филиал В", city: "Город", address: null };
const ROWS = [
  { id: "b1", name: "Клиент Один", branch: B.id },
  { id: "b2", name: "Клиент Два", branch: B.id },
];

const wire = (row: (typeof ROWS)[number]) => ({
  id: row.id,
  clientDisplayName: row.name,
  receivingPartnerUserId: "owner",
  receivingBranchId: row.branch,
  stageKey: "sys_new",
  originKind: "manual",
  createdAt: at,
  updatedAt: at,
  bucket: "active",
});

const staff = { listAllowed: true, mutationsAllowed: true, denialCode: null, canManageLeads: true, canScan: true, actorKind: "staff" };

/**
 * `branches` = trusted read scope the server puts into the list (branchScope.branches);
 * `context` = what /api/pro/context says (working assignments only) — deliberately different in some tests.
 */
function install(opts: { branches?: (typeof A)[]; context?: (typeof A)[]; actorKind?: string } = {}) {
  api.mockImplementation(async (path, request) => {
    const url = new URL(path, "https://x.invalid");
    const base = url.pathname;
    if (base === "/api/pro/context") return { branches: opts.context ?? [], activeBranch: { id: A.id } } as never;
    if (base.endsWith("/working-stages")) {
      return { workingStages: [], refusalReasons: [], archivedStages: [], manualChannels: [] } as never;
    }
    if (base === "/api/pro/client-appeals" && (!request?.method || request.method === "GET")) {
      const q = url.searchParams;
      const branchId = q.get("branchId");
      const all = q.get("branchScope") === "all";
      const scoped = all ? [B.id] : branchId ? [branchId] : [A.id];
      const appeals = q.get("bucket") === "archive" ? [] : ROWS.filter((r) => scoped.includes(r.branch)).map(wire);
      return {
        appeals,
        readOnly: false,
        access: { ...staff, actorKind: opts.actorKind ?? "staff" },
        ...((opts.actorKind ?? "staff") === "staff" ? { branchScope: { branches: opts.branches ?? [A, B, C] } } : {}),
        principal: { receivingPartnerUserId: "owner", receivingBranchId: all ? null : (branchId ?? A.id) },
        nextCursor: null,
      } as never;
    }
    if (/^\/api\/pro\/client-appeals\/[^/]+$/.test(base)) throw new RemcardApiError(404, "not found");
    if (base === "/api/pro/client-appeals" && request?.method === "POST") return { appeal: { id: "n" } } as never;
    throw new Error(`unexpected ${path}`);
  });
}

const reads = () =>
  api.mock.calls
    .map(([p, r]) => ({ path: p, method: r?.method ?? "GET" }))
    .filter((c) => c.method === "GET" && c.path.split("?")[0] === "/api/pro/client-appeals")
    .map((c) => c.path);
const detailReads = () =>
  api.mock.calls.map(([p]) => p).filter((p) => /^\/api\/pro\/client-appeals\/[^/?]+(\?|$)/.test(p) && !p.includes("/funnel") && !p.includes("working-stages"));

beforeEach(() => {
  api.mockReset();
});

describe("compact branch filter: A empty, allowed B has two", () => {
  it("keeps the filter on an empty list and widens to all without changing the working branch", async () => {
    install();
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    expect(trigger).toHaveTextContent("Филиал А");
    expect(await screen.findByTestId("ca-receiving-appeals-empty")).toBeInTheDocument();
    expect(reads()[0]).not.toContain("branchScope");

    await user.click(screen.getByTestId("ca-receiving-show-all-branches"));
    await screen.findByText("Клиент Один");
    expect(screen.getByText("Клиент Два")).toBeInTheDocument();
    expect(reads().at(-1)).toContain("branchScope=all");
    expect(reads().at(-1)).not.toContain("branchId");
    expect(screen.getByTestId("ca-receiving-branch-trigger")).toHaveTextContent("Все филиалы");
    expect(screen.queryByTestId("ca-receiving-show-all-branches")).not.toBeInTheDocument();

    const labels = screen.getAllByTestId("ca-row-branch").map((n) => n.textContent);
    expect(labels).toEqual(["Филиал Б", "Филиал Б"]);

    expect(api.mock.calls.some(([, r]) => r?.method === "PATCH")).toBe(false);
    const contextCalls = api.mock.calls.filter(([p]) => p.startsWith("/api/pro/context"));
    expect(contextCalls.every(([, r]) => !r?.method || r.method === "GET")).toBe(true);
  });

  it("the menu lists all and the allowed branches, marks the current one and returns to A", async () => {
    install();
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    await screen.findByTestId("ca-receiving-appeals-empty");

    await user.click(trigger);
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual([
      "Все доступные филиалы",
      "Филиал Атекущий✓",
      "Филиал Б",
      "Филиал В",
    ]);
    await user.click(screen.getByTestId("ca-receiving-branch-option-all"));
    await screen.findByText("Клиент Один");

    await user.click(screen.getByTestId("ca-receiving-branch-trigger"));
    await user.click(screen.getByTestId("ca-receiving-branch-option-br-a"));
    await screen.findByTestId("ca-receiving-appeals-empty");
    expect(reads().at(-1)).toContain("branchId=br-a");
    expect(screen.getByTestId("ca-receiving-branch-trigger")).toHaveTextContent("Филиал А");
  });

  it("Escape closes the menu and returns focus; arrow keys move between options", async () => {
    install();
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    await screen.findByTestId("ca-receiving-appeals-empty");
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[2]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(reads()).toHaveLength(1);
  });

  it("opens the card with the explicit scope and keeps it after returning to the list, archive and tabs", async () => {
    install();
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    await user.click(screen.getByTestId("ca-receiving-show-all-branches"));
    await user.click(await screen.findByText("Клиент Один"));
    await waitFor(() => expect(detailReads().length).toBeGreaterThan(0));
    expect(detailReads()[0]).toBe("/api/pro/client-appeals/b1?branchScope=all");
    expect(detailReads().every((p) => p.includes("branchScope=all"))).toBe(true);
    await user.click(await screen.findByRole("button", { name: /К списку|Назад/ }));
    await screen.findByText("Клиент Два");
    expect(screen.getByTestId("ca-receiving-branch-trigger")).toHaveTextContent("Все филиалы");

    await user.click(screen.getByRole("tab", { name: "Архив" }));
    await waitFor(() => expect(reads().at(-1)).toContain("bucket=archive"));
    expect(reads().at(-1)).toContain("branchScope=all");
  });

  it("scan and manual create need a concrete branch in the general mode; a chosen branch is sent on create", async () => {
    install();
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    await user.click(screen.getByTestId("ca-receiving-show-all-branches"));
    await screen.findByText("Клиент Один");

    await user.click(screen.getByRole("button", { name: "Добавить клиента" }));
    expect(screen.getByTestId("ca-receiving-branch-required")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Сканировать сертификат" }));
    expect(screen.getByTestId("ca-receiving-branch-required")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-certificate-scan")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("ca-receiving-branch-trigger"));
    await user.click(screen.getByTestId("ca-receiving-branch-option-br-b"));
    await screen.findByText("Клиент Один");
    expect(screen.queryByTestId("ca-receiving-branch-required")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("ca-row-branch")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Добавить клиента" }));
    expect(screen.queryByTestId("ca-receiving-branch-required")).not.toBeInTheDocument();
  });

  it("no extra control for one branch, no branches or the owner", async () => {
    install({ branches: [A] });
    const first = render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-branch-single");
    expect(screen.queryByTestId("ca-receiving-branch-trigger")).not.toBeInTheDocument();
    first.unmount();

    api.mockReset();
    install({ branches: [] });
    const second = render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    expect(screen.queryByTestId("ca-receiving-branch-trigger")).not.toBeInTheDocument();
    second.unmount();

    api.mockReset();
    install({ actorKind: "owner" });
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    expect(screen.queryByTestId("ca-receiving-branch-trigger")).not.toBeInTheDocument();
    expect(api.mock.calls.some(([p]) => p.startsWith("/api/pro/context"))).toBe(false);
  });

  it("head office without assignments: the menu comes from the list scope, not from /api/pro/context", async () => {
    install({ context: [] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    await user.click(trigger);
    expect(within(screen.getByRole("menu")).getAllByRole("menuitemradio")).toHaveLength(4);
    expect(api.mock.calls.some(([p]) => p.startsWith("/api/pro/context"))).toBe(false);
  });

  it("head office with a single assignment still gets every readable branch and their labels", async () => {
    install({ context: [A] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    expect(screen.queryByTestId("ca-receiving-branch-single")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("ca-receiving-show-all-branches"));
    await screen.findByText("Клиент Один");
    expect(screen.getAllByTestId("ca-row-branch").map((n) => n.textContent)).toEqual(["Филиал Б", "Филиал Б"]);
    await user.click(screen.getByTestId("ca-receiving-branch-trigger"));
    expect(screen.getByTestId("ca-receiving-branch-option-br-c")).toBeInTheDocument();
  });

  it("a restricted employee sees only the branches of the server scope even if the context lists more", async () => {
    install({ branches: [A, B], context: [A, B, C] });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace />);
    await user.click(await screen.findByTestId("ca-receiving-branch-trigger"));
    const items = within(screen.getByRole("menu")).getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent?.replace(/текущий|✓/g, ""))).toEqual([
      "Все доступные филиалы",
      "Филиал А",
      "Филиал Б",
    ]);
    expect(screen.queryByTestId("ca-receiving-branch-option-br-c")).not.toBeInTheDocument();
  });

  it("an older server without branchScope shows no filter and nothing breaks", async () => {
    install();
    const real = api.getMockImplementation()!;
    api.mockImplementation(async (path, request) => {
      const res = (await real(path, request)) as Record<string, unknown>;
      if (res && "branchScope" in res) delete res.branchScope;
      return res as never;
    });
    render(<ReceivingAppealsWorkspace />);
    await screen.findByTestId("ca-receiving-appeals-empty");
    expect(screen.queryByTestId("ca-receiving-branch-trigger")).not.toBeInTheDocument();
  });

  it("portals into the title-row slot of the page heading", async () => {
    install();
    function Page() {
      const chrome = useClientsPageChrome();
      return (
        <>
          <PageHeading eyebrow="Партнёры" title="Клиенты" actionSlotRef={chrome?.setHeadingAction} />
          <ReceivingAppealsWorkspace />
        </>
      );
    }
    const { container } = render(
      <ClientsPageChromeProvider accessMode="business">
        <Page />
      </ClientsPageChromeProvider>,
    );
    const trigger = await screen.findByTestId("ca-receiving-branch-trigger");
    const heading = container.querySelector("header")!;
    expect(heading.contains(trigger)).toBe(true);
    expect(heading.querySelector("h1")).toHaveTextContent("Клиенты");
    expect(await screen.findByTestId("ca-receiving-appeals-empty")).toBeInTheDocument();
  });
});
