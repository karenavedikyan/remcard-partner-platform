"use client";

import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import styles from "./registration-public-shell.module.css";

type Props = {
  children: React.ReactNode;
  loginHref?: string;
  /** Prototype welcome: «Войти» before theme toggle */
  loginBeforeTheme?: boolean;
};

export function RegistrationPublicShell({
  children,
  loginHref = "/login",
  loginBeforeTheme = false,
}: Props) {
  const loginLink = (
    <Link href={loginHref} className={styles.loginLink}>
      Войти
    </Link>
  );
  const themeToggle = <ThemeToggle />;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <BrandMark />
        </Link>
        <div className={styles.headerActions}>
          {loginBeforeTheme ? (
            <>
              {loginLink}
              {themeToggle}
            </>
          ) : (
            <>
              {themeToggle}
              {loginLink}
            </>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
