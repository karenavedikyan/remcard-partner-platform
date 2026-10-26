"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyPartnerLifecycle,
  fetchPartnerRegistry,
  previewPartnerLifecycle,
  type PartnerRegistryItem,
} from "@/lib/prof-admin-partners-api";

export function AdminPartnersClient() {
  const [items, setItems] = useState<PartnerRegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [registration, setRegistration] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerRegistryItem | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (registration) params.set("registration", registration);
      const data = await fetchPartnerRegistry(params);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [q, registration]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: string) {
    if (!selected) return;
    const preview = await previewPartnerLifecycle(selected.id, action);
    setPreviewText(
      [...preview.preview.effects, ...preview.preview.warnings.map((w) => `⚠ ${w}`)].join("\n"),
    );
    if (!reason.trim()) {
      setError("Укажите причину перед подтверждением");
      return;
    }
    await applyPartnerLifecycle(selected.id, action, reason.trim());
    setPreviewText(null);
    setReason("");
    setSelected(null);
    await load();
  }

  return (
    <div>
      <h1>Партнёры (реестр)</h1>
      <p>Всего по фильтру: {total}</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск партнёров"
        />
        <select value={registration} onChange={(e) => setRegistration(e.target.value)} aria-label="Регистрация">
          <option value="">Все</option>
          <option value="active">Активный</option>
          <option value="demo">Демо</option>
        </select>
        <button type="button" onClick={() => void load()}>
          Обновить
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Тип</th>
            <th>Регистрация</th>
            <th>Архив</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.displayName ?? row.id}</td>
              <td>{row.partnerType ?? "—"}</td>
              <td>{row.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}</td>
              <td>{row.lifecycle?.projectArchivedAt ? "Да" : "Нет"}</td>
              <td>
                <button type="button" onClick={() => setSelected(row)}>
                  Действия
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
          <h2>{selected.displayName}</h2>
          <textarea
            rows={3}
            style={{ width: "100%" }}
            placeholder="Причина"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {previewText ? <pre style={{ whiteSpace: "pre-wrap" }}>{previewText}</pre> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void runAction("hide_catalog")}>
              Скрыть из каталога
            </button>
            <button type="button" onClick={() => void runAction("publish_catalog")}>
              Вернуть в каталог
            </button>
            <button type="button" onClick={() => void runAction("archive_project")}>
              В архив проекта
            </button>
            <button type="button" onClick={() => void runAction("restore_project")}>
              Восстановить
            </button>
            <button type="button" onClick={() => setSelected(null)}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
