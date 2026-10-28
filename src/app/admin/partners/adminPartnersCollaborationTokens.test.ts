import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = join(process.cwd(), "src/app/admin/partners/AdminPartners.module.css");

function collaborationBlock(source: string): string {
  const start = source.indexOf(".collaborationBlock");
  const end = source.indexOf(".tableCompact th { padding: 10px 12px");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("AdminPartners collaboration CSS tokens", () => {
  it("uses globals-defined tokens for new collaboration and drilldown rules", () => {
    const block = collaborationBlock(readFileSync(cssPath, "utf8"));
    expect(block).not.toMatch(/var\(--accent\)/);
    expect(block).not.toMatch(/var\(--onaccent\)/);
    expect(block).toContain("var(--green-soft)");
    expect(block).toContain("var(--green)");
    expect(block).toContain("outline: 2px solid var(--primary)");
    expect(block).toContain("var(--tab-active-bg)");
    expect(block).toContain("var(--tab-active-fg)");
  });
});
