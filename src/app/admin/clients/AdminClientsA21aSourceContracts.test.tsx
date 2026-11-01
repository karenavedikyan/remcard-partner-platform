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
const CLIENT = join(ROOT, "AdminClientsClient.tsx");
const PAGE = join(ROOT, "page.tsx");
const CSS = join(ROOT, "AdminClients.r1.module.css");
const API = join(process.cwd(), "src/lib/prof-admin-clients-api.ts");
const PROXY = join(process.cwd(), "src/lib/remcard-proxy.ts");
const NAV = join(process.cwd(), "src/app/admin/AdminNav.tsx");

describe("A21a clients source contracts", () => {
  it("pins OWNER/ADMIN guard, role=CLIENT helper, and no write UI", () => {
    const page = readFileSync(PAGE, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const api = readFileSync(API, "utf8");
    expect(page).toContain('requireProfPlatformAdmin("/admin/clients")');
    expect(page).toContain("styles.adminPageWide");
    expect(api).toContain('params.set("role", "CLIENT")');
    expect(api).toContain("getAdminClientTotal");
    expect(api).toContain('params.set("role", "CLIENT")');
    expect(api).toContain('params.set("page", "1")');
    expect(api).toContain('params.set("limit", "1")');
    expect(api).toContain("all-time");
    expect(api).not.toMatch(/role=PRO|role=STAFF|\/api\/admin\/users\/\$/);
    expect(client).not.toMatch(/создать клиента|удалить клиента|редактировать/i);
    expect(client).not.toContain("clientBonus");
    expect(client).toContain("только для просмотра");
    expect(client).toContain("BE total");
  });

  it("adds Клиенты to AdminNav without inventing unimplemented R1 links", () => {
    const nav = readFileSync(NAV, "utf8");
    expect(nav).toContain('{ href: "/admin/clients", label: "Клиенты"');
    expect(nav).not.toContain("/admin/tasks");
    expect(nav).not.toContain("/admin/analytics");
    expect(nav).not.toContain("/admin/settings");
    expect(nav).not.toContain("Главное меню");
  });

  it("allows exact GET /api/admin/users only in proxy", () => {
    const proxy = readFileSync(PROXY, "utf8");
    expect(proxy).toMatch(/pattern:\s*\/\^\\\/api\\\/admin\\\/users\$\//);
    expect(proxy).toMatch(/A21a:[\s\S]*\/\^\\\/api\\\/admin\\\/users\$\//);
    expect(proxy).not.toMatch(/\/api\\\/admin\\\/\*/);
    expect(proxy).not.toContain("/api/admin/users/[");
  });

  it("keeps R1 clients chrome markers without fake stage KPIs", () => {
    const css = readFileSync(CSS, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    expect(css).toContain(".cards");
    expect(css).toContain(".table");
    expect(css).toContain(".pagination");
    expect(css).toMatch(/overflow-x:\s*hidden/);
    expect(css).toMatch(/line-clamp:\s*2/);
    expect(css).toContain("table-layout: fixed");
    expect(client).toContain('data-testid="client-search"');
    expect(client).toContain("Период регистрации");
    expect(client).not.toContain("Завершённые сделки");
    expect(client).not.toContain("С заявками");
  });
});
