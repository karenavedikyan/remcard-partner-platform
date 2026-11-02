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

const ROOT = dirname(fileURLToPath(import.meta.url));
const PROXY = join(process.cwd(), "src/lib/remcard-proxy.ts");

describe("A35b settings source contracts", () => {
  it("allows exact GET audit only in proxy and keeps notification handoff", () => {
    const proxy = readFileSync(PROXY, "utf8");
    expect(proxy).toMatch(
      /\{\s*methods:\s*new Set\(\["GET"\]\),\s*pattern:\s*\/\^\\\/api\\\/pro\\\/admin\\\/access\\\/audit\$\/\s*\}/,
    );
    const client = readFileSync(join(ROOT, "AdminSettingsClient.tsx"), "utf8");
    const copy = readFileSync(join(ROOT, "adminSettingsCopy.ts"), "utf8");
    expect(copy).toContain("admin-notify-settings-title");
    expect(client).toContain("ADMIN_SETTINGS_NOTIFICATIONS_HREF");
    expect(client).not.toMatch(/AdminNotificationSettingsSection/);
  });

  it("labels administrative access journal scope accurately", () => {
    const model = readFileSync(join(ROOT, "adminSettingsModel.ts"), "utf8");
    expect(model).toContain("ADMIN_SETTINGS_AUDIT_TITLE");
    expect(model).toContain("не история партнёров");
    expect(model).toContain("formatStaffAccessAuditMetaDetail");
  });
});
