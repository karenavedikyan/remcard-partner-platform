import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecordRowActions } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

const noop = () => {};

describe("RecordRowActions mobileFooter variant", () => {
  it("does not apply full-width card toolbar class on mobile list footers", () => {
    const { container } = render(
      <RecordRowActions
        ariaLabel="Test"
        variant="mobileFooter"
        actions={[
          { id: "open", label: "Open", onClick: noop },
          { id: "share", label: "Share", onClick: noop },
        ]}
      />,
    );
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar?.className).toContain(styles.mobileRecordFooterActions);
    expect(toolbar?.className).not.toContain(styles.recordActionToolbarEnd);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
