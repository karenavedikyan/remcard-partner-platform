"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Admin.module.css";

/** Keep in sync with Admin.module.css desktop nav breakpoint. */
export const ADMIN_DESKTOP_NAV_MEDIA = "(min-width: 721px)";

const NAV_ITEMS = [
  { href: "/admin/overview", label: "Обзор" },
  { href: "/admin/moderation", label: "Модерация" },
  { href: "/admin/partners", label: "Партнёры" },
  { href: "/admin/notifications", label: "Уведомления" },
  { href: "/admin/test-users", label: "Тестовые пользователи" },
  { href: "/admin/password", label: "Пароль" },
  { href: "/profile", label: "Кабинет" },
  { href: "https://remcard.ru", label: "Сайт RemCard", external: true },
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href.startsWith("http")) return false;
  if (href === "/admin/overview") {
    return pathname === "/admin/overview" || pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  linkClass,
  onNavigate,
}: {
  pathname: string;
  linkClass: (active: boolean) => string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = navActive(pathname, item.href);
        const className = linkClass(active);
        if ("external" in item && item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              className={className}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
            >
              {item.label}
            </a>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={className} onClick={onNavigate}>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogWasOpenRef = useRef(false);

  const currentLabel =
    NAV_ITEMS.find((item) => !("external" in item) && navActive(pathname, item.href))?.label ??
    "Администрирование";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(ADMIN_DESKTOP_NAV_MEDIA);
    const syncForViewport = () => {
      if (mq.matches) setMenuOpen(false);
    };
    syncForViewport();
    mq.addEventListener("change", syncForViewport);
    return () => mq.removeEventListener("change", syncForViewport);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) {
      if (window.matchMedia(ADMIN_DESKTOP_NAV_MEDIA).matches) {
        setMenuOpen(false);
        return;
      }
      dialogWasOpenRef.current = true;
      dialog.showModal();
      const first = dialog.querySelector<HTMLElement>("a, button");
      first?.focus();
    }
    if (!menuOpen && dialog.open) {
      dialog.close();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen || !dialogWasOpenRef.current) return;
    dialogWasOpenRef.current = false;
    queueMicrotask(() => menuButtonRef.current?.focus());
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <nav className={styles.navDesktop} aria-label="Администрирование">
        <NavLinks pathname={pathname} linkClass={(active) => (active ? styles.navLinkActive : styles.navLink)} />
      </nav>

      <div className={styles.navMobileBar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.navMenuButton}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-dialog"
          onClick={() => setMenuOpen(true)}
        >
          Разделы
        </button>
        <span className={styles.navMobileCurrent} aria-current="page">
          {currentLabel}
        </span>
      </div>

      <dialog
        ref={dialogRef}
        id="admin-nav-dialog"
        className={styles.navDialog}
        aria-label="Навигация администратора"
        onCancel={(e) => {
          e.preventDefault();
          closeMenu();
        }}
        onClose={() => setMenuOpen(false)}
      >
        <div className={styles.navDialogInner}>
          <header className={styles.navDialogHeader}>
            <h2 className={styles.navDialogTitle}>Разделы PROF</h2>
            <button type="button" className={styles.navDialogClose} onClick={closeMenu}>
              Закрыть
            </button>
          </header>
          <nav className={styles.navDialogLinks} aria-label="Администрирование">
            <NavLinks
              pathname={pathname}
              linkClass={(active) => (active ? styles.navDialogLinkActive : styles.navDialogLink)}
              onNavigate={closeMenu}
            />
          </nav>
        </div>
      </dialog>
    </>
  );
}
