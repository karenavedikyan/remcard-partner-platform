import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";

const receivingInitialAppealId = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams("direction=receiving&appealId=ap_return"),
}));

vi.mock("@/components/clients/receiving/ReceivingAppealsWorkspace", () => ({
  ReceivingAppealsWorkspace: (props: { initialAppealId?: string | null }) => {
    receivingInitialAppealId(props.initialAppealId);
    return <div data-testid="ca-receiving-workspace-stub" />;
  },
}));

describe("P6 ClientsDirectionWorkspace receiving return", () => {
  it("passes appealId from URL into receiving workspace", () => {
    receivingInitialAppealId.mockClear();
    render(
      <OwnerClientsModeProvider mode="specialist">
        <ClientsDirectionWorkspace accessMode="specialist" />
      </OwnerClientsModeProvider>,
    );
    expect(screen.getByTestId("ca-receiving-workspace-stub")).toBeTruthy();
    expect(receivingInitialAppealId).toHaveBeenCalledWith("ap_return");
  });
});
