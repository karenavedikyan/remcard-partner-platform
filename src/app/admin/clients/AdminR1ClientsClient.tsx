"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1Clients,
  formatAdminR1Date,
  type AdminR1ClientItem,
} from "@/lib/admin-r1/api";

export function AdminR1ClientsClient() {
  const [q, setQ] = useState("");
  const [periodDays, setPeriodDays] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<AdminR1ClientItem[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "25");
        if (q.trim()) params.set("q", q.trim());
        if (periodDays) params.set("periodDays", String(periodDays));
        const data = await fetchAdminR1Clients(params);
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setNote(data.definitions.note);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не удалось загрузить клиентов");
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, q, periodDays]);

  return (
    <section className="r1Panel" data-testid="admin-r1-clients">
      <div className="r1Toolbar">
        <input
          aria-label="Поиск клиентов"
          placeholder="Имя, город, ID"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select
          aria-label="Период регистрации"
          value={periodDays === "" ? "all" : String(periodDays)}
          onChange={(e) => {
            setPage(1);
            setPeriodDays(e.target.value === "all" ? "" : Number(e.target.value));
          }}
        >
          <option value="all">Все периоды</option>
          <option value="7">7 дней</option>
          <option value="30">30 дней</option>
          <option value="90">90 дней</option>
        </select>
        <span className="r1Muted">Всего: {loading ? "…" : total}</span>
      </div>
      {note ? <p className="r1Help" style={{ padding: "0 16px 8px" }}>{note}</p> : null}
      {loading ? <div className="r1StateLoading">Загрузка клиентов…</div> : null}
      {error ? <div className="r1StateErr" role="alert">{error}</div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="r1Empty">
          <h2>Ничего не найдено</h2>
          <p>Попробуйте изменить условия поиска.</p>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="r1TableWrap">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Город</th>
                <th>Источник (партнёр)</th>
                <th>Согласие ПДн</th>
                <th>Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.displayName || "—"}</strong>
                    <br />
                    <span className="r1Muted">{c.publicId || c.id}</span>
                  </td>
                  <td>{c.city || "—"}</td>
                  <td>
                    {c.referredByPartner ? (
                      <>
                        <Link href={`/admin/partners/${c.referredByPartner.id}`}>
                          {c.referredByPartner.displayName || "Партнёр"}
                        </Link>
                        <br />
                        <span className="r1Muted">
                          {c.referredByPartner.partnerKindLabel || "—"}
                        </span>
                      </>
                    ) : (
                      <span className="r1Muted">Без партнёра-реферера</span>
                    )}
                  </td>
                  <td>
                    <span className={`r1Pill ${c.consentPersonalData ? "good" : "warn"}`}>
                      {c.consentPersonalData ? "Есть" : "Нет"}
                    </span>
                  </td>
                  <td>{formatAdminR1Date(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="r1Toolbar" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="r1Btn small"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Назад
        </button>
        <span className="r1Muted">Стр. {page}</span>
        <button
          type="button"
          className="r1Btn small"
          disabled={loading || items.length < 25}
          onClick={() => setPage((p) => p + 1)}
        >
          Далее
        </button>
      </div>
    </section>
  );
}
