"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Admin.module.css";

/** Keep in sync with Admin.module.css desktop nav breakpoint. */
export const ADMIN_DESKTOP_NAV_MEDIA = "(min-width: 721px)";

const NAV_ITEMS = [
  { href: "/admin/overview", label: "Обзор", icon: "overview" },
  { href: "/admin/moderation", label: "Модерация", icon: "moderation" },
  { href: "/admin/partners", label: "Партнёры", icon: "partners" },
  { href: "/admin/notifications", label: "Уведомления", icon: "notifications" },
  { href: "/admin/test-users", label: "Тестовые пользователи", icon: "test" },
  { href: "/admin/password", label: "Пароль", icon: "password" },
  { href: "/profile", label: "Кабинет", icon: "cabinet" },
  { href: "https://remcard.ru", label: "Сайт RemCard", icon: "site", external: true },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "partners":
      return (
        <svg {...common}>
          <path
            d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 19c.8-2.4 2.8-4 5.5-4s4.7 1.6 5.5 4M14 15c1.8 0 3.4.7 4.5 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "moderation":
      return (
        <svg {...common}>
          <path
            d="M9 11l2 2 4-4M5 5h14v14H5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path
            d="M6 17h12l-1.2-1.8A6 6 0 0 1 15 9V8a3 3 0 1 0-6 0v1a6 6 0 0 1-1.8 6.2L6 17Zm4 2a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "test":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "password":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cabinet":
      return (
        <svg {...common}>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
  showIcons,
}: {
  pathname: string;
  linkClass: (active: boolean) => string;
  onNavigate?: () => void;
  showIcons?: boolean;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = navActive(pathname, item.href);
        const className = linkClass(active);
        const content = (
          <>
            {showIcons ? <NavIcon name={item.icon} /> : null}
            <span>{item.label}</span>
          </>
        );
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
              {content}
            </a>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={className} onClick={onNavigate}>
            {content}
          </Link>
        );
      })}
    </>
  );
}

export function AdminNav({ partnersChrome = false }: { partnersChrome?: boolean }) {
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
        <NavLinks
          pathname={pathname}
          showIcons={partnersChrome}
          linkClass={(active) => (active ? styles.navLinkActive : styles.navLink)}
        />
      </nav>

      <div className={styles.navMobileBar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={partnersChrome ? styles.navMenuIconButton : styles.navMenuButton}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-dialog"
          aria-label={partnersChrome ? "Открыть меню" : undefined}
          onClick={() => setMenuOpen(true)}
        >
          {partnersChrome ? <MenuIcon /> : "Разделы"}
        </button>
        {partnersChrome ? (
          <span className={styles.mobileWordmark} aria-hidden="true">
            remcard<span>.</span>
          </span>
        ) : (
          <span className={styles.navMobileCurrent} aria-current="page">
            {currentLabel}
          </span>
        )}
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
              showIcons={partnersChrome}
              linkClass={(active) => (active ? styles.navDialogLinkActive : styles.navDialogLink)}
              onNavigate={closeMenu}
            />
          </nav>
        </div>
      </dialog>
    </>
  );
}
