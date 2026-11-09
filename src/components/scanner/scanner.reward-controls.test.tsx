import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scannerCss = readFileSync(path.join(__dirname, "scanner.module.css"), "utf8");

function block(css: string, className: string, pseudo = ""): string {
  const escaped = pseudo.replace(":", "\\:");
  const re = new RegExp(`\\.${className}${escaped}\\s*\\{[^}]+\\}`, "s");
  return css.match(re)?.[0] ?? "";
}

describe("Scanner reward summary and expanded controls", () => {
  it("wraps collapsed summary at narrow widths without shrinking type", () => {
    const summary = block(scannerCss, "rewardSummary");
    expect(summary).toMatch(/flex-wrap:\s*wrap/);
    expect(summary).toMatch(/min-height:\s*44px/);
    expect(summary).toMatch(/padding:\s*var\(--space-2\)/);
    expect(block(scannerCss, "rewardSummaryValue")).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block(scannerCss, "rewardSummaryLabel")).toMatch(/min-width:\s*0/);
    expect(summary).toMatch(/font-size:\s*var\(--text-sm\)/);
  });

  it("keeps expanded select, apply link, and checkbox row at >=44px targets", () => {
    expect(scannerCss).toMatch(/\.rewardLabel select[\s\S]*?min-height:\s*44px/);
    expect(block(scannerCss, "rewardApply")).toMatch(/min-height:\s*44px/);
    expect(block(scannerCss, "rewardCheck")).toMatch(/min-height:\s*44px/);
    expect(scannerCss).toMatch(/\.rewardTerms:disabled\s*\{[^}]*opacity:\s*1/);
    expect(scannerCss).not.toMatch(/\.rewardTerms:disabled\s*\{[^}]*opacity:\s*0\.65/);
    expect(scannerCss).toMatch(/\.rewardTerms:disabled select:disabled[\s\S]*?opacity:\s*1/);
  });
});
