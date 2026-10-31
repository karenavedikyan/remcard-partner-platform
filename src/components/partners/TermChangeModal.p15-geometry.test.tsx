import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import { TermChangeModal } from "./TermChangeModal";
import styles from "./TermChangeModal.module.css";

/**
 * CSS-module contract for P15 R1 gutters.
 * Real border-box x/width are asserted in native Playwright against frozen R1.
 */
describe("TermChangeModal P15 R1 gutter CSS", () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("exposes centered backdrop + sheet classes used for R1 19px gutters", () => {
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={() => {}}>
        <span>body</span>
      </TermChangeModal>,
    );
    const backdrop = screen.getByTestId("partner-term-change-modal-backdrop");
    const sheet = screen.getByTestId("partner-term-change-modal");
    expect(backdrop.className).toContain(styles.backdrop);
    expect(sheet.className).toContain(styles.sheet);
  });

  it("module CSS pins 19px backdrop padding and min(620px, 100%) sheet", () => {
    expect(styles.backdrop).toBeTruthy();
    expect(styles.sheet).toBeTruthy();
    const src = readFileSync(
      path.join(process.cwd(), "src/components/partners/TermChangeModal.module.css"),
      "utf8",
    );
    expect(src).toMatch(/padding:\s*19px/);
    expect(src).toMatch(/width:\s*min\(620px,\s*100%\)/);
    expect(src).not.toMatch(/align-items:\s*flex-end/);
    // Must not double-subtract (padding 19 + calc(100%-38) would undersize).
    expect(src).not.toMatch(/calc\(100%\s*-\s*3[28]px\)/);
  });
});
