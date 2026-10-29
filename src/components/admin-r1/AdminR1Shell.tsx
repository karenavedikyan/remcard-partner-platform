"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ADMIN_R1_HIDDEN_VIEWS,
  ADMIN_R1_NAV,
  ADMIN_R1_RELEASE,
  ADMIN_R1_SUBTITLES,
  ADMIN_R1_TITLES,
  adminR1NavActive,
  adminR1NavForRelease,
  type AdminR1NavId,
} from "@/lib/admin-r1/nav";
import type { AdminAccountIdentity } from "@/app/admin/AdminAccountControls";
import { AdminAccountControls } from "@/app/admin/AdminAccountControls";
import "./admin-r1-shell.css";

function resolveNavId(pathname: string): AdminR1NavId {
  const match = adminR1NavForRelease().find((item) => adminR1NavActive(pathname, item.href));
  return match?.id ?? "overview";
}

export function AdminR1Shell({
  children,
  identity,
}: {
  children: ReactNode;
  identity: AdminAccountIdentity | null;
}) {
  const pathname = usePathname() || "/admin/overview";
  const [navOpen, setNavOpen] = useState(false);

  const navId = resolveNavId(pathname);
  const navItems = useMemo(() => adminR1NavForRelease(ADMIN_R1_RELEASE), []);
  const mainNav = navItems.filter((i) => i.group === "main");
  const controlNav = navItems.filter((i) => i.group === "control");

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Guard: R2 tasks route must not appear in R1 nav.
  if (ADMIN_R1_HIDDEN_VIEWS.some((v) => pathname.includes(`/admin/${v}`))) {
    return (
      <div className="adminR1Root">
        <div className="r1Main">
          <div className="r1Unavailable">Раздел доступен только в релизе 2 и скрыт в R1.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminR1Root">
      <div className={`r1Shell ${navOpen ? "navOpen" : ""}`}>
        <button
          type="button"
          className="r1Backdrop"
          aria-label="Закрыть меню"
          onClick={() => setNavOpen(false)}
        />
        <aside className="r1Sidebar" aria-label="Навигация администратора">
          <Link href="/admin/overview" className="r1Wordmark">
            remcard<span>.</span>
          </Link>
          <p className="r1BrandSub">УПРАВЛЕНИЕ ПРОЕКТОМ</p>
          <nav className="r1Nav" aria-label="Основное меню">
            {mainNav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={adminR1NavActive(pathname, item.href) ? "active" : undefined}
                aria-current={adminR1NavActive(pathname, item.href) ? "page" : undefined}
                onClick={() => setNavOpen(false)}
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <span className="r1NavCaption">КОНТРОЛЬ И РАЗВИТИЕ</span>
            {controlNav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={adminR1NavActive(pathname, item.href) ? "active" : undefined}
                aria-current={adminR1NavActive(pathname, item.href) ? "page" : undefined}
                onClick={() => setNavOpen(false)}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="r1SideBottom">
            <div className="r1ReleaseNote">
              <strong>Релиз 1 · сейчас</strong>
              Базовый кабинет на данных PROF. Задачи, кураторы и R2/R3 скрыты.
              <div className="r1UtilityLinks">
                <Link href="/admin/test-users" onClick={() => setNavOpen(false)}>
                  Тестовые пользователи
                </Link>
                <Link href="/admin/password" onClick={() => setNavOpen(false)}>
                  Пароль администратора
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="r1Workspace">
          <header className="r1Topbar">
            <button
              type="button"
              className="r1IconBtn r1MobileMenu"
              aria-label="Открыть меню"
              onClick={() => setNavOpen(true)}
            >
              ☰
            </button>
            <span className="r1MobileWordmark">
              remcard<span className="r1WordmarkDot">.</span>
            </span>
            <div className="r1Breadcrumb">
              <span>Кабинет администратора</span>
              <span aria-hidden>›</span>
              <strong>{ADMIN_R1_TITLES[navId]}</strong>
            </div>
            <div className="r1TopActions">
              <span className="r1Pill good" title="Объём кабинета зафиксирован на релизе 1">
                Релиз 1
              </span>
              {/* Single shared theme + notifications + session — do not duplicate here. */}
              <AdminAccountControls identity={identity} />
            </div>
          </header>
          <main className="r1Main">
            <div className="r1Scope">
              <span className="r1Pill good">Релиз 1</span>
              <p>
                Кабинет показан в объёме релиза 1: данные уже есть в PROF, нужен экран и действия
                администратора. Блоки следующих релизов скрыты.
              </p>
            </div>
            <div className="r1PageHead">
              <div>
                <h1>{ADMIN_R1_TITLES[navId]}</h1>
                <p>{ADMIN_R1_SUBTITLES[navId]}</p>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
      <span hidden data-testid="admin-r1-nav-ids">
        {ADMIN_R1_NAV.map((i) => i.id).join(",")}
      </span>
      <span hidden data-testid="admin-r1-hidden-views">
        {ADMIN_R1_HIDDEN_VIEWS.join(",")}
      </span>
    </div>
  );
}
