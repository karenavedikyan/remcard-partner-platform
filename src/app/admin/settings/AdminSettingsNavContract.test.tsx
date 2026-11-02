/** @vitest-environment node */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    clear: () => mem.clear(),
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
});

/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "../AdminNav";

const ROOT = dirname(fileURLToPath(import.meta.url));
const NAV = join(process.cwd(), "src/app/admin/AdminNav.tsx");

describe("A35a settings AdminNav contract", () => {
  it("adds Настройки in control group after notifications", () => {
    const navSrc = readFileSync(NAV, "utf8");
    expect(navSrc).toContain('{ href: "/admin/settings", label: "Настройки", icon: "settings", group: "control" }');
    expect(navSrc).toContain('case "settings":');
    const idxNotify = ADMIN_NAV_ITEMS.findIndex((i) => i.href === "/admin/notifications");
    const idxSettings = ADMIN_NAV_ITEMS.findIndex((i) => i.href === "/admin/settings");
    expect(idxSettings).toBe(idxNotify + 1);
  });

  it("page guard pins /admin/settings", () => {
    const page = readFileSync(join(ROOT, "page.tsx"), "utf8");
    expect(page).toContain('requireProfPlatformAdmin("/admin/settings")');
  });
});
