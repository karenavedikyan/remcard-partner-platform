import Link from "next/link";
import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import styles from "./Admin.module.css";

export function AdminHeader({ identity }: { identity: AdminAccountIdentity | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.brand}><strong>remcard<span>.</span></strong><small>Администрирование PROF</small></div>
        <AdminAccountControls identity={identity} />
      </div>
      <nav className={styles.nav} aria-label="Администрирование">
        <Link href="/admin/moderation">Модерация</Link>
        <Link href="/admin/partners">Партнёры</Link>
        <Link href="/admin/test-users">Тестовые пользователи</Link>
        <Link href="/admin/password">Пароль</Link>
        <Link href="/profile">Кабинет</Link>
        <a href="https://remcard.ru" target="_blank" rel="noopener noreferrer">Сайт RemCard</a>
      </nav>
    </header>
  );
}
