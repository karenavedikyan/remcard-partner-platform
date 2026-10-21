"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/layout/NavIcons";
import { masterNavMoreItems } from "@/lib/master-nav/sections";
import styles from "./AppShell.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MasterMobileMoreSheet({ open, onClose }: Props) {
  const pathname = usePathname();
  if (!open) return null;

  const items = masterNavMoreItems();

  return (
    <>
      <button type="button" className={styles.sidebarBackdrop} aria-label="Закрыть" onClick={onClose} />
      <div className={styles.mobileMoreSheet} role="dialog" aria-label="Дополнительные разделы">
        <div className={styles.mobileMoreHeader}>
          <strong>Ещё</strong>
          <button type="button" className={styles.mobileMoreClose} onClick={onClose}>
            ×
          </button>
        </div>
        <nav className={styles.mobileMoreNav}>
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileMoreLink} ${active ? styles.mobileMoreLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
