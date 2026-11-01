import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin notifications mark-all local colour contract", () => {
  it("pairs the theme surface with ink instead of inheriting dark text on the secondary fill", () => {
    const css = readFileSync(
      path.resolve(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"),
      "utf8",
    );
    const rule = css.match(/\.markAllButton\s*\{([^}]+)\}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/background:\s*var\(--surface\)\s*!important/);
    expect(rule).toMatch(/color:\s*var\(--ink\)\s*!important/);
    expect(rule).toMatch(/border:\s*1px solid var\(--line\)\s*!important/);
  });
});
