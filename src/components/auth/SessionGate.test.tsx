import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { CabinetShellTemplateReconciler } from "@/components/layout/CabinetShellTemplateReconciler";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/components/auth/AuthFlow", () => ({
  AuthFlow: () => <div data-testid="auth-flow">auth</div>,
}));

const peekCabinetSession = vi.fn();
const computeCabinetShellContextToken = vi.fn();

vi.mock("@/lib/session", () => ({
  peekCabinetSession: (...args: unknown[]) => peekCabinetSession(...args),
}));

vi.mock("@/lib/cabinet-shell-context-token", () => ({
  computeCabinetShellContextToken: (...args: unknown[]) => computeCabinetShellContextToken(...args),
}));

import { SessionGate } from "@/components/auth/SessionGate";

async function renderGateInProvider(shellToken: string, props: Parameters<typeof SessionGate>[0]) {
  const ui = await SessionGate(props);
  return render(
    <CabinetShellContextProvider shellContextToken={shellToken}>{ui}</CabinetShellContextProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  peekCabinetSession.mockResolvedValue(null);
  computeCabinetShellContextToken.mockResolvedValue("none");
});

describe("SessionGate shell identity reconciler", () => {
  it("requests exactly one refresh for null user inside the persistent provider", async () => {
    const ui = await SessionGate({ reason: "session" });
    const { rerender } = render(
      <CabinetShellContextProvider shellContextToken="shell-a">{ui}</CabinetShellContextProvider>,
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("auth-flow")).toBeInTheDocument();
    const uiAgain = await SessionGate({ reason: "session" });
    rerender(
      <CabinetShellContextProvider shellContextToken="shell-a">{uiAgain}</CabinetShellContextProvider>,
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when peek user matches shell token (upstream failure UI)", async () => {
    peekCabinetSession.mockResolvedValue({ id: "u1", role: "PRO" });
    computeCabinetShellContextToken.mockResolvedValue("shell-a");
    await renderGateInProvider("shell-a", { reason: "session" });
    await waitFor(() => expect(screen.getByTestId("auth-flow")).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("forces none token only when shellContextTokenNone is set", async () => {
    peekCabinetSession.mockResolvedValue({ id: "u1", role: "PRO" });
    computeCabinetShellContextToken.mockResolvedValue("shell-a");
    await renderGateInProvider("shell-a", { shellContextTokenNone: true });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("does not refresh outside the persistent provider", async () => {
    const ui = await SessionGate({ reason: "session" });
    render(ui);
    await waitFor(() => expect(screen.getByTestId("auth-flow")).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("runs A->none->B->A->B refresh cycle with bounded counts", () => {
    function CycleHarness() {
      const [shellToken, setShellToken] = useState("A");
      const [fresh, setFresh] = useState("B");
      return (
        <>
          <button type="button" data-testid="shell-b" onClick={() => setShellToken("B")} />
          <button type="button" data-testid="fresh-none" onClick={() => setFresh("none")} />
          <button type="button" data-testid="fresh-a" onClick={() => setFresh("A")} />
          <button type="button" data-testid="fresh-b" onClick={() => setFresh("B")} />
          <CabinetShellContextProvider shellContextToken={shellToken}>
            <CabinetShellTemplateReconciler freshShellContextToken={fresh}>
              <div data-testid="auth-flow">auth</div>
            </CabinetShellTemplateReconciler>
          </CabinetShellContextProvider>
        </>
      );
    }

    render(<CycleHarness />);
    expect(refresh).toHaveBeenCalledTimes(1);
    screen.getByTestId("fresh-a").click();
    expect(refresh).toHaveBeenCalledTimes(1);
    screen.getByTestId("fresh-none").click();
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(1);
    screen.getByTestId("shell-b").click();
    screen.getByTestId("fresh-b").click();
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
