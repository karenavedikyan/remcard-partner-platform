"use client";

import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import styles from "./registration-public-shell.module.css";

type Props = {
  children: React.ReactNode;
  loginHref?: string;
};

export function RegistrationPublicShell({ children, loginHref = "/login" }: Props) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <BrandMark />
          <span className={styles.brandText}>
            <strong>RemCard</strong>
            <span>Для партнёров</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <Link href={loginHref} className={styles.loginLink}>
            Войти
          </Link>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
