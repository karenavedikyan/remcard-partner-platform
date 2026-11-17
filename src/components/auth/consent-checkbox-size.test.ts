import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("consent checkboxes (M6.2)", () => {
  const auth = read("src/components/auth/auth.module.css");
  const analytics = read("src/components/consent/ProfAnalyticsConsentUi.module.css");

  it("required and optional consent checkboxes share one size", () => {
    const required = ruleBody(auth, ".consentRow input");
    const optional = ruleBody(analytics, ".checkboxInput");
    for (const body of [required, optional]) {
      expect(body).toContain("width: 1.375rem");
      expect(body).toContain("height: 1.375rem");
    }
  });

  it("the whole row is a ≥44px tap target", () => {
    expect(ruleBody(auth, ".consentRow")).toContain("min-height: 44px");
    expect(ruleBody(analytics, ".checkboxRow")).toContain("min-height: 44px");
  });
});
