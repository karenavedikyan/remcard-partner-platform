"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import styles from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Главная", icon: "⌂" },
  { href: "/partners", label: "Партнёры", icon: "🤝", badgeKey: "partners" as const },
  { href: "/recommendations", label: "Рекомендации", icon: "📄" },
  { href: "/scanner", label: "Сканер", icon: "▣" },
  { href: "/history", label: "История", icon: "☰" },
  { href: "/profile", label: "Профиль", icon: "◎" },
] as const;

type AppShellProps = {
  user: AuthUser;
  incomingCount?: number;
  children: React.ReactNode;
};

function NavLinks({
  pathname,
  incomingCount,
  className,
}: {
  pathname: string;
  incomingCount: number;
  className?: string;
}) {
  return (
    <>
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge =
          "badgeKey" in item && item.badgeKey === "partners" && incomingCount > 0
            ? incomingCount
            : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""} ${className ?? ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
            {badge ? <span className={styles.navBadge}>{badge}</span> : null}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ user, incomingCount = 0, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Основная навигация">
        <div className={styles.brand}>
          Rem<span>Card</span>
        </div>
        <nav className={styles.nav}>
          <NavLinks pathname={pathname} incomingCount={incomingCount} />
        </nav>
        <div className={styles.sidebarFooter}>
          <LogoutButton />
        </div>
      </aside>

      <div className={styles.main}>
        <nav className={styles.mobileNav} aria-label="Мобильная навигация">
          <NavLinks pathname={pathname} incomingCount={incomingCount} />
        </nav>
        <header className={styles.topbar}>
          <div className={styles.account}>{user.displayName ?? "Партнёр PROF"}</div>
          <LogoutButton />
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
