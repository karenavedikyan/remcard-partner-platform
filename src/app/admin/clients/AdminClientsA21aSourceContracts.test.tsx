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
const DRAWER = join(ROOT, "AdminClientDetailDrawer.tsx");
const PAGE = join(ROOT, "page.tsx");
const CSS = join(ROOT, "AdminClients.r1.module.css");
const API = join(process.cwd(), "src/lib/prof-admin-clients-api.ts");
const PROXY = join(process.cwd(), "src/lib/remcard-proxy.ts");
const NAV = join(process.cwd(), "src/app/admin/AdminNav.tsx");

describe("A21a/A21f clients source contracts", () => {
  it("pins OWNER/ADMIN guard, role=CLIENT helper, and no write UI", () => {
    const page = readFileSync(PAGE, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const api = readFileSync(API, "utf8");
    expect(page).toContain('requireProfPlatformAdmin("/admin/clients")');
    expect(page).toContain("styles.adminPageWide");
    expect(api).toContain('params.set("role", "CLIENT")');
    expect(api).toContain("getAdminClientTotal");
    expect(api).toContain('params.set("page", "1")');
    expect(api).toContain('params.set("limit", "1")');
    expect(api).toContain("all-time");
    expect(api).not.toMatch(/role=PRO|role=STAFF|\/api\/admin\/users\/\$/);
    expect(client).not.toMatch(/создать клиента|удалить клиента|редактировать/i);
    expect(client).not.toContain("clientBonus");
    expect(client).toContain("только для просмотра");
    expect(client).toContain("Найдите клиента по имени");
    expect(client).toContain("Источник рекомендации");
    expect(client).toContain('data-admin-clients="a21j"');
    expect(client).not.toContain("GET /api/admin/users");
    expect(client).not.toContain("<code>search</code>");
    expect(client).toContain("AdminClientDetailDrawer");
    expect(client).toContain('data-testid="open-client"');
    expect(api).toContain('params.set("funnelRole", "CLIENT")');
    expect(api).toContain("getAdminUserFunnel");
    expect(api).toContain("ADMIN_CLIENTS_FROZEN_MAPPING");
  });

  it("adds Клиенты to AdminNav without inventing unimplemented R1 links", () => {
    const nav = readFileSync(NAV, "utf8");
    expect(nav).toContain('{ href: "/admin/clients", label: "Клиенты"');
    // Root7 publishes analytics/password; still no invented tasks/settings.
    expect(nav).toContain('{ href: "/admin/analytics", label: "Аналитика"');
    expect(nav).not.toContain("/admin/tasks");
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

  it("keeps frozen Clients scope without product-only funnel panel or fake 7/30/90", () => {
    const css = readFileSync(CSS, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    expect(css).toContain(".cards");
    expect(css).toContain(".table");
    expect(css).toContain(".pagination");
    expect(css).toContain(".kpis");
    expect(css).not.toContain(".funnelPanel");
    expect(css).toMatch(/overflow-x:\s*hidden/);
    expect(css).toContain("table-layout: fixed");
    expect(css).toContain(".clientPublicId");
    expect(css).toContain(".clientCity");
    expect(client).toContain('data-testid="client-search"');
    expect(client).toContain("Период регистрации");
    expect(client).toContain("clients-period-gap");
    expect(client).toContain("7 / 30 / 90");
    expect(client).toContain("дату регистрации клиента");
    expect(client).toContain("московскому времени");
    expect(client).not.toContain("Candidate BE");
    expect(client).not.toContain("721708c4");
    expect(client).not.toContain("90 дней пока недоступно");
    expect(client).toContain('value="7d"');
    expect(client).toContain('value="90d"');
    expect(client).toContain("resolveAdminClientsRegistrationRange");
    expect(client).not.toContain("clients-funnel");
    expect(client).not.toContain("Этапы регистрации клиентов");
    expect(client).not.toContain("funnelFilter");
    expect(client).not.toContain("ADMIN_CLIENT_FUNNEL_LABELS");
    // Must not send legacy period=7d|30d|90 to the API — rolling uses createdFrom/To.
    expect(client).not.toMatch(/period:\s*["']7d|period:\s*["']30d|period:\s*["']90d/);
    expect(client).toContain('placeholder="Имя клиента"');
    // Deal-stage titles appear only as explicit GAP tiles — never as live counts.
    expect(client).toContain("clients-kpi-orders-gap");
    expect(client).toContain("clients-kpi-deals-gap");
    expect(client).toContain("clients-source-gap");
    expect(client).toContain("clients-stage-gap");
    expect(client).not.toMatch(/stage==='order'|clientStage/);
    expect(client).not.toMatch(/consent visits|сделок завершен/i);
    expect(client).toMatch(/<th[^>]*>\s*Источник\s*<\/th>/);
    expect(client).toMatch(/<th[^>]*>\s*Этап\s*<\/th>/);
    expect(client).toMatch(/<th[^>]*>\s*Регистрация\s*<\/th>/);
    expect(client).toContain('label="Источник рекомендации"');
    expect(client).toContain('label="Этап сделки"');
    const drawer = readFileSync(DRAWER, "utf8");
    expect(css).toContain(".detailDrawer");
    expect(drawer).toContain("Карточка клиента");
    expect(drawer).toContain("client-detail-source-gap");
    expect(drawer).toContain("client-detail-consent-gap");
    expect(drawer).toContain("formatClientRegisteredAt");
    expect(drawer).not.toMatch(/fetch\(|remcardFetch|getAdminUserFunnel/);
    expect(drawer).not.toMatch(/сохранить|удалить клиента|создать сделку/i);
  });
});
