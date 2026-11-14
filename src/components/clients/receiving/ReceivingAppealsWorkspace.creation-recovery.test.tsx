import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const base = "/api/pro/client-appeals";
const at = "2026-11-15T00:00:00.000Z";
const settings = { workingStages: [], archivedStages: [], refusalReasons: [], manualChannels: [] };
const row = {
  id: "created-one", clientDisplayName: "Созданный клиент", receivingPartnerUserId: "owner",
  stageKey: "sys_new", certificateId: "cert-one", originKind: "CERTIFICATE",
  clientCity: "Краснодар", interest: "Подобрать двери",
  createdAt: at, updatedAt: at,
};

function install(status = 503, failures = 1) {
  const state = { created: false, failures };
  api.mockImplementation(async (path, request) => {
    const route = path.split("?")[0];
    if (route === `${base}/working-stages`) return settings as never;
    if (request?.method === "POST" && [base, `${base}/certificate-entry`].includes(route)) {
      state.created = true;
      return { valid: true, outcome: "created", appeal: row } as never;
    }
    if (route === base) {
      if (state.created && state.failures-- > 0) throw new RemcardApiError(status, "Ошибка перечитывания");
      return {
        appeals: state.created ? [row] : [{ ...row, id: "existing", clientDisplayName: "Исходный клиент" }],
        nextCursor: null, readOnly: false,
      } as never;
    }
    if (route === `${base}/${row.id}`) {
      return { appeal: row, history: [], readOnly: false } as never;
    }
    throw new Error(`Unexpected test request: ${path}`);
  });
  return state;
}

function posts() {
  return api.mock.calls.filter(([, options]) => options?.method === "POST");
}

async function create(kind: "manual" | "certificate") {
  const user = userEvent.setup();
  render(<ReceivingAppealsWorkspace />);
  if (kind === "manual") {
    await user.click(await screen.findByRole("button", { name: "Добавить клиента", exact: true }));
    await user.type(screen.getByRole("textbox", { name: /Имя или компания/ }), "Созданный клиент");
    await user.click(screen.getByRole("button", { name: "Создать обращение", exact: true }));
  } else {
    await user.click(await screen.findByRole("button", { name: "Сканировать сертификат", exact: true }));
    await user.type(screen.getByTestId("ca-receiving-scan-code"), "RC-TEST001");
    await user.click(screen.getByRole("button", { name: "Проверить и продолжить", exact: true }));
  }
  return user;
}

beforeEach(() => vi.clearAllMocks());

describe("creation success is independent from list reconciliation", () => {
  it.each(["manual", "certificate"] as const)("%s: GET503 retry is GET-only and does not hide success", async (kind) => {
    install();
    const user = await create(kind);
    const retry = await screen.findByRole("button", { name: /Повторить обновление/ });
    expect(posts()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Создать обращение", exact: true })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-appeals-error")).not.toBeInTheDocument();
    if (kind === "certificate") {
      expect(await screen.findByTestId("ca-receiving-appeal-detail")).toBeInTheDocument();
      expect(await screen.findByText("Краснодар")).toBeInTheDocument();
      expect(screen.getByText("Подобрать двери")).toBeInTheDocument();
    } else {
      expect(screen.getByText("Обращение создано.")).toBeInTheDocument();
    }
    await user.click(retry);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(posts()).toHaveLength(1);
    if (kind === "certificate") expect(screen.getByTestId("ca-receiving-appeal-detail")).toBeInTheDocument();
    else expect(screen.getByRole("button", { name: /Созданный клиент/ })).toBeInTheDocument();
  });

  it.each(["manual", "certificate"] as const)("%s: repeated GET503 keeps recovery available without POST", async (kind) => {
    install(503, 2);
    const user = await create(kind);
    await user.click(await screen.findByRole("button", { name: /Повторить обновление/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Повторить обновление/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /Повторить обновление/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument());
    expect(posts()).toHaveLength(1);
  });

  it.each([
    ["manual", 401], ["manual", 403], ["certificate", 401], ["certificate", 403],
  ] as const)("%s: GET%s fails closed after committed creation", async (kind, status) => {
    install(status);
    await create(kind);
    expect(await screen.findByTestId("ca-receiving-appeals-error")).toBeInTheDocument();
    expect(screen.queryByTestId("ca-receiving-appeal-detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Повторить обновление/ })).not.toBeInTheDocument();
    expect(posts()).toHaveLength(1);
  });
});
