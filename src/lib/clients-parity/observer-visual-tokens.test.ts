import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * C42/C44: numeric token spot-check vs prototype client-appeals.css (no screenshot PASS).
 */
describe("observer visual tokens (numeric, C42/C44 partial)", () => {
  const css = readFileSync(
    path.resolve(__dirname, "../../components/clients/observer/observer.module.css"),
    "utf8",
  );

  it("uses 12px partner category and 20px KPI values", () => {
    expect(css).toMatch(/font-size:\s*12px/);
    expect(css).toMatch(/font-size:\s*20px/);
  });

  it("uses 44px control min-height", () => {
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("uses 16px section radius", () => {
    expect(css).toMatch(/border-radius:\s*16px/);
  });

  it("375px four KPI columns declared", () => {
    expect(css).toMatch(/max-width:\s*375px[\s\S]*grid-template-columns:\s*repeat\(4/);
  });
});
