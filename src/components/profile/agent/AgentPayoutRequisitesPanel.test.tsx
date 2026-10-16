import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { AgentPayoutRequisitesPanel } from "./AgentPayoutRequisitesPanel";

const api = vi.hoisted(() => ({
  listAgentRequisites: vi.fn(),
  fetchAgentRequisites: vi.fn(),
  createAgentRequisites: vi.fn(),
  patchAgentRequisites: vi.fn(),
}));
vi.mock("@/lib/agent-profile/api", () => api);

const listItem = {
  id: "req-1",
  kind: "person",
  label: "Личный счёт",
  legalName: "Parity Agent",
  inn: "7707083893",
  kpp: null,
  bankName: "Тест",
  bik: "044525225",
  accountNumberMasked: "****0001",
  corrAccountMasked: "****0000",
  isPrimary: true,
  applyForNextPayout: false,
  isArchived: false,
  version: 1,
};

describe("AgentPayoutRequisitesPanel copy", () => {
  afterEach(cleanup);

  it("errors when authorized detail fetch fails (no masked fallback copy)", async () => {
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockRejectedValue(new RemcardApiError(500, "Server error"));
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Скопировать" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать" }));
    await screen.findByText(/Не удалось загрузить полные реквизиты/);
    expect(screen.queryByText(/Скопировано в буфер/)).not.toBeInTheDocument();
  });

  it("copies full text when detail returns unmasked account", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    api.listAgentRequisites.mockResolvedValue({ items: [listItem] });
    api.fetchAgentRequisites.mockResolvedValue({
      item: {
        ...listItem,
        accountNumber: "40817810000000000001",
        corrAccount: "30101810000000000000",
      },
    });
    render(<AgentPayoutRequisitesPanel />);
    await screen.findByRole("button", { name: "Скопировать" });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    const text = write.mock.calls[0][0] as string;
    expect(text).toContain("Parity Agent");
    expect(text).toContain("40817810000000000001");
    expect(text).not.toContain("****");
  });
});
