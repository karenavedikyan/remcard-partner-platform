import Link from "next/link";
import styles from "./Admin.module.css";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}><strong>remcard<span>.</span></strong><small>Администрирование PROF</small></div>
        <nav className={styles.nav} aria-label="Администрирование">
        <Link href="/admin/moderation">Модерация</Link>
        <Link href="/admin/partners">Партнёры</Link>
        <Link href="/admin/test-users">Тестовые пользователи</Link>
        <Link href="/admin/password">Пароль</Link>
        <Link href="/profile">Кабинет</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
