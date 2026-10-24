import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
      <header style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <strong>RemCard · администрирование PROF</strong>
        <Link href="/admin/moderation">Модерация</Link>
        <Link href="/admin/test-users">Тестовые пользователи</Link>
        <Link href="/admin/password">Пароль</Link>
        <Link href="/profile">Кабинет</Link>
      </header>
      {children}
    </div>
  );
}
