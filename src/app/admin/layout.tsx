import Link from "next/link";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireProfPlatformAdmin("/admin/test-users");
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
      <header style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
        <strong>RemCard · администрирование PROF</strong>
        <Link href="/admin/test-users">Тестовые пользователи</Link>
        <Link href="/profile">Кабинет</Link>
      </header>
      {children}
    </div>
  );
}
