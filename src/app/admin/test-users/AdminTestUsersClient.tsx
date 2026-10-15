"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

type TestUser = {
  id: string;
  publicId: string;
  displayName: string;
  partnerType: string | null;
  partnerActivities: string[];
  profTestDisabledAt: string | null;
  profTestCreatedAt: string | null;
};

export function AdminTestUsersClient() {
  const router = useRouter();
  const [items, setItems] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    displayName: "Тест · Агент 1",
    kind: "agent" as "agent" | "master" | "store" | "company",
    city: "Краснодар",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await remcardFetch<{ items: TestUser[] }>("/api/pro/admin/test-users");
      setItems(res.items ?? []);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      await remcardFetch("/api/pro/admin/test-users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Тестовые пользователи</h1>
      <p>Создайте партнёра для изучения ЛК на prof.remcard.ru. Тестовые аккаунты не входят по паролю и не привязаны к мессенджерам.</p>
      {error ? <p role="alert">{error}</p> : null}
      <section style={{ display: "grid", gap: "0.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Создать</h2>
        <label>
          Имя
          <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
        </label>
        <label>
          Тип
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as typeof form.kind }))}>
            <option value="agent">Агент</option>
            <option value="master">Специалист</option>
            <option value="store">Магазин</option>
            <option value="company">Компания</option>
          </select>
        </label>
        <label>
          Город
          <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </label>
        <Button type="button" disabled={creating} onClick={() => void create()}>
          {creating ? "Создание…" : "Создать"}
        </Button>
      </section>
      {loading ? <p>Загрузка…</p> : null}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
        {items.map((item) => (
          <li key={item.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem" }}>
            <strong>{item.displayName}</strong>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>
              {item.publicId} · {item.partnerActivities?.join(", ") || item.partnerType}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Button
                type="button"
                disabled={Boolean(item.profTestDisabledAt)}
                onClick={async () => {
                  await remcardFetch(`/api/pro/admin/test-users/${item.id}/enter`, { method: "POST" });
                  router.push("/profile?section=basics");
                  router.refresh();
                }}
              >
                Открыть ЛК
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!window.confirm("Сбросить профиль и черновик агента? Реквизиты не удаляются.")) return;
                  await remcardFetch(`/api/pro/admin/test-users/${item.id}/reset`, { method: "POST" });
                  await reload();
                }}
              >
                Сбросить профиль
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(item.profTestDisabledAt)}
                onClick={async () => {
                  if (!window.confirm("Отключить тестовый аккаунт?")) return;
                  await remcardFetch(`/api/pro/admin/test-users/${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ action: "disable" }),
                  });
                  await reload();
                }}
              >
                Отключить
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
