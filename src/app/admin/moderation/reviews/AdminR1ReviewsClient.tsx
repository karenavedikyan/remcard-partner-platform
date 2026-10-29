"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1Reviews,
  formatAdminR1Date,
  type AdminR1ReviewItem,
} from "@/lib/admin-r1/api";

/**
 * Reviews moderation UI for R1.
 * Approve/reject endpoints exist but are NOT auto-invoked during LOCAL QA.
 */
export function AdminR1ReviewsClient() {
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AdminR1ReviewItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, published: 0, rejected: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminR1Reviews(
          new URLSearchParams({ status, page: "1", pageSize: "40" }),
        );
        if (cancelled) return;
        setReviews(data.reviews);
        setCounts(data.counts);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Очередь недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div data-testid="admin-r1-reviews">
      <div className="r1Kpis">
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Ожидают</span>
          <strong className="r1KpiValue">{counts.pending}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Опубликовано</span>
          <strong className="r1KpiValue">{counts.published}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Отклонено</span>
          <strong className="r1KpiValue">{counts.rejected}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Действия QA</span>
          <strong className="r1KpiValue" style={{ fontSize: "1rem" }}>
            только просмотр
          </strong>
          <span className="r1KpiBottom">без approve/reject в LOCAL QA</span>
        </div>
      </div>
      <div className="r1Toolbar r1Panel">
        <select
          aria-label="Статус отзывов"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="PENDING">На модерации</option>
          <option value="PUBLISHED">Опубликованы</option>
          <option value="REJECTED">Отклонены</option>
          <option value="ALL">Все</option>
        </select>
        <Link className="r1Btn small" href="/admin/moderation">
          Профили / каталог
        </Link>
      </div>
      {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
      {error ? <div className="r1StateErr">{error}</div> : null}
      <section className="r1Panel">
        {!loading && !error && reviews.length === 0 ? (
          <div className="r1Empty">
            <h2>Очередь пуста</h2>
            <p>Нет отзывов с выбранным статусом.</p>
          </div>
        ) : null}
        {reviews.map((r) => (
          <article key={r.id} style={{ padding: "16px 24px", borderBottom: "1px solid var(--r1-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>
                {"★".repeat(r.rating)}
                <span className="r1Muted">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
              </span>
              <span className="r1Pill warn">{r.status}</span>
            </div>
            <p style={{ margin: "8px 0" }}>{r.text}</p>
            <small className="r1Muted">
              {r.author.displayName || "Клиент"} ·{" "}
              <Link href={`/admin/partners/${r.partner.id}`}>
                {r.partner.displayName || "Партнёр"}
              </Link>{" "}
              · {formatAdminR1Date(r.createdAt)}
            </small>
            <p className="r1Help">
              Серверные команды POST …/approve|reject доступны staff; UI R1 не вызывает их в
              автоматическом QA.
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
