import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReceivingFunnel, ReceivingFunnelLoadResult } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingFunnelPage } from "./ReceivingFunnelPage";

function funnel(over: Partial<ReceivingFunnel> = {}): ReceivingFunnel {
  return {
    total: 10,
    inWork: 6,
    paid: 4,
    shipped: 2,
    returned: 1,
    conv: "40%",
    period: { from: null, to: null },
    avgCheckKopecks: 1_250_000,
    avgCheckPurchases: 4,
    certificate: { total: 6, paid: 3, conv: "50%" },
    manual: { total: 4, paid: 1, conv: "25%" },
    ...over,
  };
}

const ok = (f: ReceivingFunnel): ReceivingFunnelLoadResult => ({ ok: true, funnel: f });

describe("ReceivingFunnelPage", () => {
  it("shows server numbers for the whole set with the prototype funnel, returns and comparison", async () => {
    const fetchFunnel = vi.fn().mockResolvedValue(ok(funnel()));
    render(<ReceivingFunnelPage onBack={vi.fn()} fetchFunnel={fetchFunnel} />);
    const kpis = await screen.findByTestId("ca-funnel-kpis");
    expect(within(kpis).getAllByRole("listitem").map((i) => i.textContent)).toEqual([
      "Обращения10",
      "Оплачено4",
      "Отгружено2",
      "Возвраты1",
      expect.stringMatching(/^Средний чек12\s?500/),
    ]);
    expect(screen.getByTestId("ca-funnel-bars")).toHaveTextContent("50% от пред. · 20% от всех");
    expect(screen.getByText(/учитываются отдельно/)).toBeInTheDocument();
    expect(screen.getByTestId("ca-funnel-compare")).toHaveTextContent("6 обр. · опл. 50%");
    expect(screen.getByTestId("ca-funnel-compare")).toHaveTextContent("4 обр. · опл. 25%");
  });

  it("an empty cohort shows the hint and no fake percentages or average check", async () => {
    const fetchFunnel = vi.fn().mockResolvedValue(
      ok(
        funnel({
          total: 0,
          inWork: 0,
          paid: 0,
          shipped: 0,
          returned: 0,
          conv: "—",
          avgCheckKopecks: null,
          avgCheckPurchases: 0,
          certificate: { total: 0, paid: 0, conv: "—" },
          manual: { total: 0, paid: 0, conv: "—" },
        }),
      ),
    );
    render(<ReceivingFunnelPage onBack={vi.fn()} fetchFunnel={fetchFunnel} />);
    expect(await screen.findByTestId("ca-funnel-empty")).toHaveTextContent(
      "За период обращений нет — создайте первое сканированием или вручную.",
    );
    expect(screen.getByTestId("ca-funnel-bars")).toHaveTextContent("— от всех");
    expect(screen.getByTestId("ca-funnel-bars").textContent).not.toMatch(/\d+% от/);
    expect(within(screen.getByTestId("ca-funnel-kpis")).getByText("Средний чек").parentElement).toHaveTextContent("—");
    expect(screen.getByTestId("ca-funnel-compare")).toHaveTextContent("0 обр. · опл. —");
  });

  it("defaults to the last 30 days, presets and dates drive the query, a reversed period never hits the server", async () => {
    const user = userEvent.setup();
    const fetchFunnel = vi.fn().mockResolvedValue(ok(funnel()));
    render(<ReceivingFunnelPage onBack={vi.fn()} fetchFunnel={fetchFunnel} />);
    await screen.findByTestId("ca-funnel-kpis");
    const first = fetchFunnel.mock.calls[0][0] as { from?: string; to?: string };
    expect(first.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await user.click(screen.getByTestId("ca-funnel-preset-all"));
    await waitFor(() => expect(fetchFunnel).toHaveBeenLastCalledWith({ from: undefined, to: undefined }, expect.anything()));
    expect(screen.getByTestId("ca-funnel-preset-all")).toHaveAttribute("aria-pressed", "true");

    const calls = fetchFunnel.mock.calls.length;
    await user.type(screen.getByTestId("ca-funnel-from"), "2026-11-10");
    await user.type(screen.getByTestId("ca-funnel-to"), "2026-11-01");
    expect(await screen.findByTestId("ca-funnel-range-error")).toBeInTheDocument();
    await waitFor(() => expect(fetchFunnel.mock.calls.length).toBeGreaterThanOrEqual(calls));
    const last = fetchFunnel.mock.calls.at(-1)?.[0] as { from?: string; to?: string };
    expect(!(last.from && last.to && last.from > last.to)).toBe(true);
  });

  it("an error is explicit and retryable", async () => {
    const user = userEvent.setup();
    const fetchFunnel = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "ERROR", message: "Не удалось загрузить аналитику" })
      .mockResolvedValueOnce(ok(funnel()));
    render(<ReceivingFunnelPage onBack={vi.fn()} fetchFunnel={fetchFunnel} />);
    expect(await screen.findByTestId("ca-funnel-error")).toHaveTextContent("Не удалось загрузить аналитику");
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByTestId("ca-funnel-kpis")).toBeInTheDocument();
  });
});
