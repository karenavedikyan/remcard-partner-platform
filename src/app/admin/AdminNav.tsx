"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./Admin.module.css";

/** Keep in sync with Admin.module.css desktop nav breakpoint. */
export const ADMIN_DESKTOP_NAV_MEDIA = "(min-width: 721px)";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
  group: "primary" | "control" | "service";
};

/** Existing destinations only — no fake badges, no unimplemented R1 pages. */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin/overview", label: "Обзор", icon: "overview", group: "primary" },
  { href: "/admin/moderation", label: "Модерация", icon: "moderation", group: "primary" },
  { href: "/admin/partners", label: "Партнёры", icon: "partners", group: "primary" },
  { href: "/admin/team", label: "Команда", icon: "team", group: "primary" },
  { href: "/admin/notifications", label: "Уведомления", icon: "notifications", group: "control" },
  { href: "/admin/test-users", label: "Тестовые пользователи", icon: "test", group: "service" },
  { href: "/admin/password", label: "Пароль", icon: "password", group: "service" },
  { href: "/profile", label: "Кабинет", icon: "cabinet", group: "service" },
  {
    href: "https://remcard.ru",
    label: "Сайт RemCard",
    icon: "site",
    external: true,
    group: "service",
  },
] as const;

export function adminSectionLabel(pathname: string): string {
  const hit = ADMIN_NAV_ITEMS.find(
    (item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  if (hit) return hit.label;
  if (pathname.startsWith("/admin/access")) return "Доступ";
  return "Администрирование";
}

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
    case "team":
      return (
        <svg {...common}>
          <path
            d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-7.5 8a5.5 5.5 0 0 1 11 0M17 8.5a2.5 2.5 0 1 0-1-4.8M20.5 20a4.5 4.5 0 0 0-4-4.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
          <path
            d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "password":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 11V8a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
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
  items,
}: {
  pathname: string;
  linkClass: (active: boolean) => string;
  onNavigate?: () => void;
  items: readonly NavItem[];
}) {
  return (
    <>
      {items.map((item) => {
        const active = navActive(pathname, item.href);
        const className = linkClass(active);
        const content = (
          <>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </>
        );
        if (item.external) {
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

function GroupedNav({
  pathname,
  linkClass,
  onNavigate,
}: {
  pathname: string;
  linkClass: (active: boolean) => string;
  onNavigate?: () => void;
}) {
  const primary = ADMIN_NAV_ITEMS.filter((i) => i.group === "primary");
  const control = ADMIN_NAV_ITEMS.filter((i) => i.group === "control");
  const service = ADMIN_NAV_ITEMS.filter((i) => i.group === "service");
  return (
    <>
      <NavLinks pathname={pathname} linkClass={linkClass} onNavigate={onNavigate} items={primary} />
      <span className={styles.navCaption}>Контроль и развитие</span>
      <NavLinks pathname={pathname} linkClass={linkClass} onNavigate={onNavigate} items={control} />
      <div className={styles.navServiceBlock}>
        <NavLinks pathname={pathname} linkClass={linkClass} onNavigate={onNavigate} items={service} />
      </div>
    </>
  );
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogWasOpenRef = useRef(false);
  const titleId = useId();
  const currentLabel = adminSectionLabel(pathname);

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

  function onDrawerKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = getFocusable(dialog);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <nav className={styles.navDesktop} aria-label="Администрирование">
        <GroupedNav
          pathname={pathname}
          linkClass={(active) => (active ? styles.navLinkActive : styles.navLink)}
        />
      </nav>

      <div className={styles.navMobileBar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.navMenuIconButton}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-dialog"
          aria-label="Открыть меню"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
        <span className={styles.mobileWordmark} aria-hidden="true">
          remcard<span>.</span>
        </span>
        <span className={styles.navMobileCurrent} aria-current="page">
          {currentLabel}
        </span>
      </div>

      <dialog
        ref={dialogRef}
        id="admin-nav-dialog"
        className={styles.navDrawer}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          closeMenu();
        }}
        onClose={() => setMenuOpen(false)}
        onKeyDown={onDrawerKeyDown}
      >
        <div className={styles.navDrawerInner}>
          <header className={styles.navDialogHeader}>
            <h2 id={titleId} className={styles.navDialogTitle}>
              Меню
            </h2>
            <button type="button" className={styles.navDialogClose} onClick={closeMenu}>
              Закрыть
            </button>
          </header>
          <nav className={styles.navDialogLinks} aria-label="Администрирование">
            <GroupedNav
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
