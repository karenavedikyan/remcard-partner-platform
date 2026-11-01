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
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src/app/admin");

describe("A17b admin shell source contracts", () => {
  it("groups nav with control caption, no fake counts or unimplemented links", () => {
    const nav = readFileSync(join(ROOT, "AdminNav.tsx"), "utf8");
    expect(nav).toContain('group: "primary"');
    expect(nav).toContain('group: "control"');
    expect(nav).toContain('group: "service"');
    expect(nav).toContain("Контроль и развитие");
    expect(nav).toContain('{ href: "/admin/team", label: "Команда"');
    expect(nav).toContain('{ href: "/admin/notifications", label: "Уведомления"');
    expect(nav).not.toContain("Главное меню");
    expect(nav).not.toContain("partnersChrome");
    expect(nav).not.toMatch(/\bnavCount\b|\bcountBadge\b|\bfakeCount\b/);
    // A21a adds real /admin/clients; unimplemented R1 pages stay absent.
    expect(nav).not.toContain("/admin/tasks");
    expect(nav).not.toContain("/admin/analytics");
    expect(nav).not.toContain("/admin/settings");
    expect((nav.match(/aria-label="Администрирование"/g) || []).length).toBe(2);
    expect(nav).toMatch(/navDialogTitle[\s\S]*Меню/);
    expect(nav).toContain('aria-label="Открыть меню"');
    expect(nav).toContain("onDrawerKeyDown");
    expect(nav).toContain("styles.navDrawer");
  });

  it("pins R1 brand-sub, always-on topbar breadcrumb, and local shell tokens", () => {
    const header = readFileSync(join(ROOT, "AdminHeader.tsx"), "utf8");
    const css = readFileSync(join(ROOT, "Admin.module.css"), "utf8");
    expect(header).toContain("Управление проектом");
    expect(header).toContain("adminSectionLabel");
    expect(header).toContain("Кабинет администратора");
    expect(header).toContain("<AdminNav />");
    expect(header).not.toContain("partnersChrome");
    expect(header).not.toMatch(/aria-hidden:\s*true\s+as\s+const/);
    expect(header).toContain("data-partners-shell");
    expect(header).toContain("data-moderation-partner-detail-shell");
    expect(header).toContain("data-moderation-org-detail-shell");
    expect(css).toContain("--admin-brand-soft: #fbeeee");
    expect(css).toContain("--admin-brand-soft: #372b2c");
    expect(css).toContain("--admin-sidebar: 232px");
    expect(css).toContain("--admin-topbar: 76px");
    expect(css).toContain("--admin-main-max: 1730px");
    expect(css).toContain("letter-spacing: 0.06em");
    expect(css).toContain(".navCaption");
    expect(css).toContain(".navDrawer");
    expect(css).toContain(".adminPageWide");
    expect(css).toMatch(/\.shell main[\s\S]*padding:\s*2rem/);
  });

  it("keeps team page on wide shell wrapper without inventing closed-access KPI", () => {
    const page = readFileSync(join(ROOT, "team/page.tsx"), "utf8");
    const client = readFileSync(join(ROOT, "team/AdminTeamClient.tsx"), "utf8");
    expect(page).toContain("styles.adminPageWide");
    expect(page).toContain('requireProfPlatformAdmin("/admin/team")');
    expect(client).toContain('href="/admin/access/users"');
    expect(client).not.toContain("Доступ закрыт");
  });
});
