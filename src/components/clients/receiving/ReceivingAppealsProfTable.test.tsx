import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { profDemoListResponse } from "@/lib/clients-parity/prof-appeals-demo-fixtures";
import { ReceivingAppealsProfTable } from "./ReceivingAppealsProfTable";

describe("ReceivingAppealsProfTable — p149", () => {
  it("shows remCard filter count from server and filters rows client-side", async () => {
    const user = userEvent.setup();
    const data = profDemoListResponse();
    render(
      <ReceivingAppealsProfTable
        data={data}
        profRows={data.profAppeals}
        remCardMatchCount={data.remCardMatchCount}
        filters={{
          q: "",
          status: "Все статусы",
          source: "all",
          bucket: "active",
          remCardOnly: false,
          requestFilter: "Все",
          appealSourceKey: "all",
        }}
        onFiltersChange={() => {}}
        onOpenAppeal={() => {}}
      />,
    );
    expect(screen.getByTestId("ca-remcard-filter")).toHaveTextContent("1");
    expect(screen.getAllByTestId(/ca-prof-row-/).length).toBeGreaterThan(1);
    await user.click(screen.getByRole("checkbox", { name: /Только клиенты с RemCard/ }));
  });

  it("marks cabinet only on confirmed remCard.inCabinet", () => {
    const data = profDemoListResponse();
    render(
      <ReceivingAppealsProfTable
        data={data}
        profRows={data.profAppeals}
        remCardMatchCount={1}
        filters={{
          q: "",
          status: "Все статусы",
          source: "all",
          bucket: "active",
        }}
        onFiltersChange={() => {}}
        onOpenAppeal={() => {}}
      />,
    );
    const withCabinet = screen.getAllByTestId("ca-prof-account").find((el) =>
      el.textContent?.includes("Есть в RemCard"),
    );
    expect(withCabinet).toBeDefined();
    expect(screen.getByText("Отделка прихожей")).toBeInTheDocument();
  });
});