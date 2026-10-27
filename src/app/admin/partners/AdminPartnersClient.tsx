"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyPartnerLifecycle,
  fetchPartnerRegistry,
  previewPartnerLifecycle,
  type PartnerRegistryItem,
} from "@/lib/prof-admin-partners-api";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

export function AdminPartnersClient() {
  const [items, setItems] = useState<PartnerRegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [registration, setRegistration] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerRegistryItem | null>(null);
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [reason, setReason] = useState("");

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (registration) params.set("registration", registration);
        if (cursor) params.set("cursor", cursor);
        const data = await fetchPartnerRegistry(params);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, registration],
  );

  useEffect(() => {
    setNextCursor(null);
    void loadPage(null, false);
  }, [loadPage]);

  async function requestPreview(action: string) {
    if (!selected) return;
    setError(null);
    if (!reason.trim()) {
      setError("Укажите причину перед получением preview");
      return;
    }
    const preview = await previewPartnerLifecycle(selected.id, action);
    setPendingPreview({
      action,
      effects: preview.preview.effects,
      warnings: preview.preview.warnings,
      confirmToken: preview.preview.confirmToken,
    });
  }

  async function confirmApply() {
    if (!selected || !pendingPreview) return;
    setError(null);
    await applyPartnerLifecycle(
      selected.id,
      pendingPreview.action,
      reason.trim(),
      pendingPreview.confirmToken,
    );
    setPendingPreview(null);
    setReason("");
    setSelected(null);
    await loadPage(null, false);
  }

  function cancelPreview() {
    setPendingPreview(null);
  }

  return (
    <div>
      <h1>Партнёры (реестр)</h1>
      <p>
        Всего по фильтру: {total}. Показано: {items.length}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск партнёров"
        />
        <select
          value={registration}
          onChange={(e) => setRegistration(e.target.value)}
          aria-label="Регистрация"
        >
          <option value="">Все</option>
          <option value="active">Активный</option>
          <option value="demo">Демо</option>
        </select>
        <button type="button" onClick={() => void loadPage(null, false)}>
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
      {nextCursor ? (
        <button
          type="button"
          aria-label="Загрузить ещё"
          disabled={loadingMore}
          onClick={() => void loadPage(nextCursor, true)}
          style={{ marginTop: "1rem" }}
        >
          {loadingMore ? "Загрузка…" : "Загрузить ещё"}
        </button>
      ) : null}
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
          {pendingPreview ? (
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {[...pendingPreview.effects, ...pendingPreview.warnings.map((w) => `⚠ ${w}`)].join("\n")}
            </pre>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!pendingPreview ? (
              <>
                <button type="button" onClick={() => void requestPreview("hide_catalog")}>
                  Preview: скрыть из каталога
                </button>
                <button type="button" onClick={() => void requestPreview("publish_catalog")}>
                  Preview: вернуть в каталог
                </button>
                <button type="button" onClick={() => void requestPreview("archive_project")}>
                  В архив проекта
                </button>
                <button type="button" onClick={() => void requestPreview("restore_project")}>
                  Preview: восстановить
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => void confirmApply()}>
                  Подтвердить
                </button>
                <button type="button" onClick={cancelPreview}>
                  Отмена
                </button>
              </>
            )}
            <button type="button" onClick={() => { setSelected(null); cancelPreview(); }}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
