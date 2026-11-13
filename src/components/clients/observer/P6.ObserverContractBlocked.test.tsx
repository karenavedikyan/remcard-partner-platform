import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObserverContractBlocked } from "./ObserverContractBlocked";

describe("P6.ObserverContractBlocked", () => {
  it("default test id distinguishes observer parity blocker", () => {
    render(
      <ObserverContractBlocked
        title="Данные направлений недоступны"
        blockerId="BLK-OBSERVER-REFERRED"
        message="Нет контракта для списка направленных клиентов."
        missingRoutes={["GET /api/pro/referred-appeals"]}
      />,
    );
    expect(screen.getByTestId("clients-parity-contract-blocked")).toBeTruthy();
    expect(screen.getByText("BLK-OBSERVER-REFERRED")).toBeTruthy();
    expect(screen.getByText("GET /api/pro/referred-appeals")).toBeTruthy();
  });

  it("allows alternate test id for receiving-side reuse", () => {
    render(
      <ObserverContractBlocked
        title="Клиенты у меня"
        blockerId="BLK-RECEIVING-APPEALS"
        message="Принимающий CRM недоступен."
        missingRoutes={[]}
        testId="ca-receiving-appeals-blocked"
        titleId="ca-receiving-blocked-title"
      />,
    );
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(screen.queryByTestId("clients-parity-contract-blocked")).toBeNull();
  });
});
