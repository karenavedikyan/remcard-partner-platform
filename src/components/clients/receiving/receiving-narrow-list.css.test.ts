import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("narrow screens: client row", () => {
  it("moves the status badge under the name and lets the name wrap at ≤480px", () => {
    const css = readFileSync(join(__dirname, "receiving.module.css"), "utf8");
    const block = css.slice(css.lastIndexOf("@media(max-width:480px){"));
    expect(block).toContain('grid-template-areas:"name" "status" "request" "meta" "amount" "age" "chev"');
    expect(block).toMatch(/\.ca-row \.ca-row-name strong\)\{white-space:normal/);
    expect(block).toMatch(/\.ca-row \.ca-row-status\)\{width:auto/);
  });
});
