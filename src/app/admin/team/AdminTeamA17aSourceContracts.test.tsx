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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CLIENT = join(ROOT, "AdminTeamClient.tsx");
const PAGE = join(ROOT, "page.tsx");
const CSS = join(ROOT, "AdminTeam.r1.module.css");
const API = join(process.cwd(), "src/lib/prof-admin-team-api.ts");
const PROXY = join(process.cwd(), "src/lib/remcard-proxy.ts");
const NAV = join(process.cwd(), "src/app/admin/AdminNav.tsx");
const PARTNERS = join(process.cwd(), "src/app/admin/partners/AdminPartnersClient.tsx");
const DETAIL = join(
  process.cwd(),
  "src/app/admin/partners/AdminPartnersPartnerDetailDialog.tsx",
);

describe("A17a team source contracts", () => {
  it("pins readonly page guard, GET helper, and access deep-link", () => {
    const page = readFileSync(PAGE, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const api = readFileSync(API, "utf8");
    expect(page).toContain('requireProfPlatformAdmin("/admin/team")');
    expect(api).toContain('remcardFetch<unknown>("/api/admin/team"');
    expect(api).not.toContain("/api/admin/team/search");
    expect(api).not.toContain("clientBonus");
    expect(client).toContain('href="/admin/access/users"');
    expect(client).toContain("только для просмотра");
    expect(client).not.toMatch(/team\/search|staffRole:\s*null/);
  });

  it("adds Команда to AdminNav without a second main-menu landmark", () => {
    const nav = readFileSync(NAV, "utf8");
    expect(nav).toContain('{ href: "/admin/team", label: "Команда"');
    expect(nav).toContain('aria-label="Администрирование"');
    expect(nav).not.toContain("Главное меню");
    expect((nav.match(/aria-label="Администрирование"/g) || []).length).toBe(2);
  });

  it("allows exact GET /api/admin/team only in proxy", () => {
    const proxy = readFileSync(PROXY, "utf8");
    expect(proxy).toMatch(/pattern:\s*\/\^\\\/api\\\/admin\\\/team\$\//);
    expect(proxy).not.toMatch(/\/api\\\/admin\\\/\*/);
    expect(proxy).not.toContain("/api/admin/team/search");
  });

  it("keeps R1 team chrome markers and visit copy fix", () => {
    const css = readFileSync(CSS, "utf8");
    const partners = readFileSync(PARTNERS, "utf8");
    const detail = readFileSync(DETAIL, "utf8");
    expect(css).toContain(".teamGrid");
    expect(css).toContain(".employee");
    expect(css).toContain(".avatar");
    expect(partners).toMatch(/Нет данных о\s+посещениях/);
    expect(partners).not.toContain("нет данных API");
    expect(detail).toContain("Нет данных о посещениях");
    expect(detail).not.toContain("нет данных API");
  });

  it("A17c pins frozen R1 card note + role legend helper (no invented closed count)", () => {
    const client = readFileSync(CLIENT, "utf8");
    const api = readFileSync(API, "utf8");
    expect(client).toContain("TEAM_R1_CARD_ROLE_NOTE");
    expect(client).toContain("teamRoleLegend");
    expect(api).toContain("Роль задаётся приглашением, без привязки к направлению");
    expect(client).toContain("Нет в ответе GET /api/admin/team");
    expect(client).not.toMatch(/Права сотрудника зависят от его роли/);
  });

  it("A17d pins fail-closed list parse and recoverable error copy", () => {
    const client = readFileSync(CLIENT, "utf8");
    const api = readFileSync(API, "utf8");
    expect(client).toContain('data-admin-team="a17d"');
    expect(client).toContain("TEAM_LOAD_FAILED_MESSAGE");
    expect(api).toContain("AdminTeamResponseError");
    expect(api).toContain("throw new AdminTeamResponseError");
    expect(api).not.toMatch(/return \{ members: \[\] \};\s*\n\s*\}/);
  });
});
