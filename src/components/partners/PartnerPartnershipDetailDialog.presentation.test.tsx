import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = path.join(__dirname, "PartnerPartnershipDetailDialog.module.css");
const css = readFileSync(cssPath, "utf8");

function block(selector: string): string {
  const re = new RegExp(
    `${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`,
    "m",
  );
  return css.match(re)?.[1] ?? "";
}

describe("PartnerPartnershipDetailDialog presentation (P4a)", () => {
  it("uses a desktop sheet width of at most 620px", () => {
    const sheet = block(".sheetLayout");
    expect(sheet).toMatch(/width:\s*min\(\s*620px/);
    expect(sheet).not.toMatch(/min\(\s*520px/);
  });

  it("keeps section titles at least 14px without uppercase micro-labels", () => {
    const title = block(".sectionTitle");
    expect(title).toMatch(/font-size:\s*14px/);
    expect(title).toMatch(/text-transform:\s*none/);
    expect(title).not.toMatch(/text-transform:\s*uppercase/);
  });

  it("styles terms as term-summary rows without decorative bullets", () => {
    const list = block(".list");
    const item = block(".list li");
    expect(list).toMatch(/list-style:\s*none/);
    expect(list).toMatch(/padding:\s*0/);
    expect(item).toMatch(/border-top:\s*1px\s+solid\s+var\(--line\)/);
    expect(item).toMatch(/padding:\s*12px\s+0/);
    expect(item).toMatch(/font-size:\s*14px/);
  });

  it("keeps body copy and meta rows at least 14px with wrap-safe overflow", () => {
    const body = block(".body");
    const meta = block(".metaBlock");
    expect(body).toMatch(/font-size:\s*14px/);
    expect(body).toMatch(/overflow-y:\s*auto/);
    expect(body).toMatch(/overflow-x:\s*hidden/);
    expect(meta).toMatch(/font-size:\s*14px/);
    expect(meta).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("scopes a ≥14px font rule to the direct StatusBadge span in .body", () => {
    expect(css).toMatch(
      /\.body\s*>\s*:global\(\s*span\[class\*=["']badge["']\]\s*\)\s*\{[^}]*font-size:\s*14px/,
    );
    expect(css).not.toMatch(/\.list[^{]*\{[^}]*span/);
  });

  it("uses a detail-local neutral FG that clears 4.5:1 on light --offset", () => {
    expect(css).toMatch(
      /\.body\s*>\s*:global\(\s*span\[class\*=["']neutral["']\]\s*\)\s*\{[^}]*color:\s*#5c605a/,
    );
    expect(css).toMatch(
      /\[data-theme=["']dark["']\].*\.body\s*>\s*:global\(\s*span\[class\*=["']neutral["']\]\s*\)\s*\{[^}]*color:\s*var\(--muted\)/s,
    );
    // #5c605a on #f2f1ee (light --offset) — same gate as collection PAUSED fix
    const fg = [0x5c, 0x60, 0x5a];
    const bg = [0xf2, 0xf1, 0xee];
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const L = (rgb: number[]) =>
      0.2126 * lin(rgb[0]!) + 0.7152 * lin(rgb[1]!) + 0.0722 * lin(rgb[2]!);
    const ratio = (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
