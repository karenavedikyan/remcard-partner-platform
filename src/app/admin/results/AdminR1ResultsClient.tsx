"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1Certificates,
  fetchAdminR1Deals,
  fetchAdminR1RemScores,
  fetchAdminR1ResultsSummary,
  fetchAdminR1Reviews,
  formatAdminR1Date,
  formatAdminR1Money,
  type AdminR1DealItem,
  type AdminR1RemScoreRow,
  type AdminR1ResultsSummary,
  type AdminR1ReviewItem,
} from "@/lib/admin-r1/api";

type Tab = "rating" | "certs" | "deals" | "reviews" | "catalog";

export function AdminR1ResultsClient() {
  const [tab, setTab] = useState<Tab>("rating");
  const [periodDays, setPeriodDays] = useState(30);
  const [summary, setSummary] = useState<AdminR1ResultsSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setSummaryError(null);
      try {
        const data = await fetchAdminR1ResultsSummary(periodDays);
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
          setSummaryError(e instanceof Error ? e.message : "Сводка недоступна");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "rating", label: "Рейтинг партнёров" },
    { id: "certs", label: "Сертификаты" },
    { id: "deals", label: "Сделки" },
    { id: "reviews", label: "Отзывы" },
    { id: "catalog", label: "Каталог" },
  ];

  return (
    <div data-testid="admin-r1-results">
      <div className="r1Toolbar" style={{ marginBottom: 16, border: "1px solid var(--r1-line)", borderRadius: 8 }}>
        <select
          aria-label="Период"
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value={90}>90 дней</option>
        </select>
        <span className="r1Pill" title="Рекомендации связок — релиз 2">
          Рекомендации · R2 скрыто
        </span>
      </div>

      {summaryError ? (
        <div className="r1Unavailable" role="alert">
          Сводка результативности недоступна: {summaryError}
        </div>
      ) : null}
      {summary ? (
        <div className="r1Kpis">
          <div className="r1Panel r1Kpi">
            <span className="r1KpiLabel">Сертификатов выпущено</span>
            <strong className="r1KpiValue">{summary.certificatesIssued}</strong>
            <span className="r1KpiBottom">
              {summary.certificatesUsedFully} использовано полностью
            </span>
          </div>
          <div className="r1Panel r1Kpi">
            <span className="r1KpiLabel">Сумма заказов</span>
            <strong className="r1KpiValue">{formatAdminR1Money(summary.ordersSum)}</strong>
            <span className="r1KpiBottom">{summary.ordersCount} заказов по сертификатам</span>
          </div>
          <div className="r1Panel r1Kpi">
            <span className="r1KpiLabel">Средний рейтинг</span>
            <strong className="r1KpiValue">
              {summary.averagePublishedRating == null
                ? "—"
                : `★ ${summary.averagePublishedRating}`}
            </strong>
            <span className="r1KpiBottom">{summary.reviewsPublished} опубликованных отзывов</span>
          </div>
          <div className="r1Panel r1Kpi">
            <span className="r1KpiLabel">Ожидают модерации</span>
            <strong className="r1KpiValue">{summary.reviewsPending}</strong>
            <span className="r1KpiBottom">Отзывы клиентов</span>
          </div>
        </div>
      ) : null}
      {summary ? <p className="r1Help">{summary.definitions.note}</p> : null}

      <div className="r1Subtabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={tab === t.id ? "active" : undefined}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rating" ? <RemScorePanel /> : null}
      {tab === "certs" ? <CertsPanel periodDays={periodDays} /> : null}
      {tab === "deals" ? <DealsPanel periodDays={periodDays} /> : null}
      {tab === "reviews" ? <ReviewsPanel /> : null}
      {tab === "catalog" ? (
        <div className="r1Panel r1PanelPad">
          <h2>Каталог</h2>
          <p className="r1Help">
            Наполнение каталога и модерация профилей — в разделе «Модерация». Качество цен и
            устаревание — релиз 2 (скрыто).
          </p>
          <Link className="r1Btn" href="/admin/moderation">
            Открыть модерацию профилей
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function RemScorePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminR1RemScoreRow[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [buckets, setBuckets] = useState({ A: 0, B: 0, C: 0 });
  const [formula, setFormula] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "40", sort: "score" });
        const data = await fetchAdminR1RemScores(params);
        if (cancelled) return;
        setRows(data.items);
        setAvg(data.averageScore);
        setBuckets(data.gradeBuckets);
        setFormula(data.definitions.formula);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "RemScore недоступен");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="r1Kpis">
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Средний RemScore</span>
          <strong className="r1KpiValue">{avg == null ? "—" : avg}</strong>
          <span className="r1KpiBottom">По UserPartnerScore</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">A+ и A</span>
          <strong className="r1KpiValue">{buckets.A}</strong>
          <span className="r1KpiBottom">Рекомендуем в первую очередь</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">B+ и B</span>
          <strong className="r1KpiValue">{buckets.B}</strong>
          <span className="r1KpiBottom">Стабильно</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Группа C</span>
          <strong className="r1KpiValue">{buckets.C}</strong>
          <span className="r1KpiBottom">Нужна помощь</span>
        </div>
      </div>
      <section className="r1Panel">
        <div className="r1PanelHead">
          <div>
            <h2>Рейтинг RemScore</h2>
            <small className="r1Muted">{formula || "Существующая формула PROF"}</small>
          </div>
        </div>
        {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
        {error ? <div className="r1StateErr">{error}</div> : null}
        {!loading && !error ? (
          <div className="r1TableWrap">
            <table>
              <thead>
                <tr>
                  <th>Партнёр</th>
                  <th>Тип</th>
                  <th>Отзывы</th>
                  <th>RemScore</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/admin/partners/${r.id}`}>{r.displayName || "—"}</Link>
                      <br />
                      <span className="r1Muted">{r.city || "—"}</span>
                    </td>
                    <td>{r.partnerKindLabel || "—"}</td>
                    <td>
                      {r.avgRating == null ? "—" : `★ ${r.avgRating}`}
                      <br />
                      <span className="r1Muted">{r.reviewCount ?? 0} отзывов</span>
                    </td>
                    <td>
                      <strong>{r.score ?? "—"}</strong>{" "}
                      <span className="r1Pill">{r.grade || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CertsPanel({ periodDays }: { periodDays: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      status: string;
      createdAt: string;
      proUser: { displayName: string | null } | null;
      orders: { id: string }[];
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Certificate list API is page/status based; period filter is client-side honesty note.
        const data = await fetchAdminR1Certificates(
          new URLSearchParams({ page: "1", limit: "40" }),
        );
        if (cancelled) return;
        const since = Date.now() - periodDays * 86400000;
        const filtered = data.certificates.filter(
          (c) => new Date(c.createdAt).getTime() >= since,
        );
        setRows(filtered);
        setTotal(data.total);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Сертификаты недоступны");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  return (
    <section className="r1Panel">
      <div className="r1PanelHead">
        <div>
          <h2>Сертификаты</h2>
          <small className="r1Muted">
            Рекомендация исполнителя клиенту. Использование = наличие Order, не равен сделке само
            по себе.
            {total != null ? ` Всего в базе (без периода API): ${total}.` : ""}
          </small>
        </div>
      </div>
      {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
      {error ? <div className="r1StateErr">{error}</div> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="r1Empty">
          <h2>Нет сертификатов за период</h2>
          <p>На текущей странице списка после клиентского фильтра периода записей нет.</p>
        </div>
      ) : null}
      {!loading && !error && rows.length > 0 ? (
        <div className="r1TableWrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Исполнитель</th>
                <th>Статус</th>
                <th>Заказы</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.proUser?.displayName || "—"}</td>
                  <td>
                    <span className="r1Pill">{c.status}</span>
                  </td>
                  <td>
                    {c.orders.length === 0 ? (
                      <span className="r1Muted">нет сделки</span>
                    ) : (
                      `${c.orders.length}`
                    )}
                  </td>
                  <td>{formatAdminR1Date(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function DealsPanel({ periodDays }: { periodDays: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminR1DealItem[]>([]);
  const [sum, setSum] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "40",
          periodDays: String(periodDays),
        });
        const data = await fetchAdminR1Deals(params);
        if (cancelled) return;
        setItems(data.items);
        setSum(data.sumAmount);
        setNote(data.definitions.note);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Сделки недоступны");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  return (
    <section className="r1Panel">
      <div className="r1PanelHead">
        <div>
          <h2>Сделки = заказы по сертификатам</h2>
          <small className="r1Muted">
            {note || "Order.certificateId"} · сумма {formatAdminR1Money(sum)}
          </small>
        </div>
      </div>
      {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
      {error ? <div className="r1StateErr">{error}</div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="r1Empty">
          <h2>Заказов за период нет</h2>
          <p>Это честый empty, не ноль из демо.</p>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="r1TableWrap">
          <table>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Исполнитель</th>
                <th>Магазин</th>
                <th>Сумма</th>
                <th>Флаги</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.id}
                    <br />
                    <span className="r1Muted">{formatAdminR1Date(o.createdAt)}</span>
                  </td>
                  <td>
                    <Link href={`/admin/partners/${o.issuer.id}`}>
                      {o.issuer.displayName || "—"}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/partners/${o.store.id}`}>
                      {o.store.displayName || "—"}
                    </Link>
                  </td>
                  <td>{formatAdminR1Money(o.totalAmount)}</td>
                  <td>
                    {o.isSelfScan ? <span className="r1Pill warn">self-scan</span> : null}{" "}
                    {o.flagged ? <span className="r1Pill red">flagged</span> : null}
                    {!o.isSelfScan && !o.flagged ? <span className="r1Muted">—</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ReviewsPanel() {
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
          new URLSearchParams({ status: "PENDING", page: "1", pageSize: "25" }),
        );
        if (cancelled) return;
        setReviews(data.reviews);
        setCounts(data.counts);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Отзывы недоступны");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="r1Panel">
      <div className="r1PanelHead">
        <div>
          <h2>Очередь модерации отзывов</h2>
          <small className="r1Muted">
            pending {counts.pending} · published {counts.published} · rejected {counts.rejected}.
            Действия approve/reject не вызываются в LOCAL QA автоматически.
          </small>
        </div>
        <Link className="r1Btn small" href="/admin/moderation/reviews">
          Полный экран
        </Link>
      </div>
      {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
      {error ? <div className="r1StateErr">{error}</div> : null}
      {!loading && !error && reviews.length === 0 ? (
        <p className="r1PanelPad r1Muted">Все отзывы проверены.</p>
      ) : null}
      {reviews.map((r) => (
        <article key={r.id} className="r1QueueRow" style={{ display: "block" }}>
          <strong>
            {"★".repeat(r.rating)}
            <span className="r1Muted">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
          </strong>
          <p>{r.text}</p>
          <small className="r1Muted">
            {r.author.displayName || "Клиент"} · {r.partner.displayName || "Партнёр"} ·{" "}
            {formatAdminR1Date(r.createdAt)}
          </small>
        </article>
      ))}
    </section>
  );
}
