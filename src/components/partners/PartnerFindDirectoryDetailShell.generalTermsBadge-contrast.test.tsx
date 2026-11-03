import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnerFindDirectoryDetailShell generalTermsBadge contrast binding", () => {
  const css = readFileSync(
    path.resolve(__dirname, "PartnerFindDirectoryDetailShell.module.css"),
    "utf8",
  );

  it("uses canonical ink on offset badge pill (not muted 4.47:1 on light offset)", () => {
    expect(css).toMatch(/\.generalTermsBadge\s*\{[^}]*background:\s*var\(--offset[^)]*\)/s);
    expect(css).toMatch(/\.generalTermsBadge\s*\{[^}]*color:\s*var\(--ink\)/s);
    expect(css).not.toMatch(/\.generalTermsBadge\s*\{[^}]*color:\s*var\(--muted\)/s);
  });
});
