import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConsentStep } from "./ConsentStep";

const termsA = {
  kind: "TERMS",
  legalDocumentId: "doc-a",
  version: "1.0",
  url: "/terms",
  status: "missing" as const,
};

describe("ConsentStep", () => {
  it("keys acceptance to kind and legalDocumentId", async () => {
    const onSubmit = vi.fn();
    const ui = userEvent.setup();
    const { rerender } = render(
      <ConsentStep
        requirements={[termsA]}
        error=""
        loading={false}
        onSubmit={onSubmit}
        onRetryReadiness={() => undefined}
      />,
    );

    await ui.click(screen.getByRole("checkbox"));
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(onSubmit).toHaveBeenCalledWith(new Set(["TERMS:doc-a"]));

    rerender(
      <ConsentStep
        requirements={[{ ...termsA, legalDocumentId: "doc-b", version: "2.0" }]}
        error=""
        loading={false}
        onSubmit={onSubmit}
        onRetryReadiness={() => undefined}
      />,
    );

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("shows retry when requirements are empty", async () => {
    const onRetry = vi.fn();
    const ui = userEvent.setup();
    render(
      <ConsentStep
        requirements={[]}
        error=""
        loading={false}
        onSubmit={() => undefined}
        onRetryReadiness={onRetry}
      />,
    );

    await ui.click(screen.getByRole("button", { name: /повторить проверку/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
