"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  approveAdminR1Review,
  fetchAdminR1Reviews,
  formatAdminR1Date,
  rejectAdminR1Review,
  type AdminR1ReviewItem,
} from "@/lib/admin-r1/api";

type ConfirmAction = {
  type: "approve" | "reject";
  review: AdminR1ReviewItem;
};

type Counts = { pending: number; published: number; rejected: number };

/**
 * Reviews moderation for R1.
 * Buttons call existing server approve/reject routes after confirmation.
 * Automated QA should mock these commands and not hit production.
 */
export function AdminR1ReviewsClient() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AdminR1ReviewItem[]>([]);
  /** Status the current `reviews` rows were loaded for — blocks stale actions. */
  const [listStatus, setListStatus] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestSeq = useRef(0);
  const statusRef = useRef(status);
  const pageRef = useRef(page);

  statusRef.current = status;
  pageRef.current = page;

  const load = useCallback(async (opts?: { pageOverride?: number; statusOverride?: string }) => {
    const reqStatus = opts?.statusOverride ?? statusRef.current;
    const reqPage = opts?.pageOverride ?? pageRef.current;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminR1Reviews(
        new URLSearchParams({
          status: reqStatus,
          page: String(reqPage),
          pageSize: String(pageSize),
        }),
      );
      // Drop stale responses (filter change or overlapping refresh).
      if (seq !== requestSeq.current) return;
      if (reqStatus !== statusRef.current) return;

      const nextTotal = data.total;
      const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));
      if (reqPage > maxPage) {
        setCounts(data.counts);
        setTotal(nextTotal);
        setReviews([]);
        setListStatus(reqStatus);
        setPage(maxPage);
        return;
      }

      setReviews(data.reviews);
      setListStatus(reqStatus);
      setCounts(data.counts);
      setTotal(nextTotal);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      if (reqStatus !== statusRef.current) return;
      setError(e instanceof Error ? e.message : "Очередь недоступна");
      setReviews([]);
      setListStatus(null);
      setTotal(0);
      setCounts(null);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, status, page]);

  // Close an open confirm only when the selected list context (status/page) changes.
  // Do not depend on actionPending — a failed command must keep dialog + error + reason for retry.
  useEffect(() => {
    setConfirm(null);
    setRejectReason("");
    setActionError(null);
  }, [status, page]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirm && !dialog.open) dialog.showModal();
    if (!confirm && dialog.open) dialog.close();
  }, [confirm]);

  function changeStatus(next: string) {
    // Hide previous queue immediately so pending rows are not actionable under a new filter.
    setReviews([]);
    setListStatus(null);
    setCounts(null);
    setTotal(0);
    setError(null);
    setPage(1);
    setStatus(next);
  }

  function openConfirm(type: "approve" | "reject", review: AdminR1ReviewItem) {
    setActionError(null);
    setRejectReason("");
    setConfirm({ type, review });
  }

  function closeConfirm() {
    if (actionPending) return;
    setConfirm(null);
    setRejectReason("");
    setActionError(null);
  }

  async function submitConfirm() {
    if (!confirm) return;
    if (confirm.type === "reject" && !rejectReason.trim()) {
      setActionError("Укажите причину отклонения");
      return;
    }
    setActionPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (confirm.type === "approve") {
        await approveAdminR1Review(confirm.review.id);
        setActionSuccess("Отзыв опубликован");
      } else {
        const result = await rejectAdminR1Review(confirm.review.id, rejectReason.trim());
        if (result.reasonPersisted === true) {
          setActionSuccess(
            "Отзыв отклонён. Причина сохранена в аудите партнёра и доступна в очереди «Отклонены».",
          );
        } else if (result.reasonPersisted === false) {
          setActionSuccess(
            "Отзыв отклонён, но причина не сохранена в аудите. Проверьте ответ сервера.",
          );
        } else {
          setActionSuccess(
            "Отзыв отклонён. Сервер не подтвердил сохранение причины в аудите.",
          );
        }
      }
      setConfirm(null);
      setRejectReason("");
      await load({ pageOverride: pageRef.current });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setActionPending(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const kpiValue = (value: number | undefined) => {
    if (error) return "—";
    if (counts == null) return loading ? "…" : "—";
    return String(value ?? "—");
  };
  const listIsCurrent = listStatus === status && !loading;
  const canActOnPending = (r: AdminR1ReviewItem) =>
    listIsCurrent && r.status === "PENDING" && !actionPending;

  return (
    <div data-testid="admin-r1-reviews">
      <div className="r1Kpis">
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Ожидают</span>
          <strong className="r1KpiValue">{kpiValue(counts?.pending)}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Опубликовано</span>
          <strong className="r1KpiValue">{kpiValue(counts?.published)}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Отклонено</span>
          <strong className="r1KpiValue">{kpiValue(counts?.rejected)}</strong>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">В списке</span>
          <strong className="r1KpiValue">
            {error ? "—" : loading && counts == null ? "…" : total}
          </strong>
          <span className="r1KpiBottom">С учётом фильтра статуса</span>
        </div>
      </div>

      <div className="r1Toolbar r1Panel">
        <select
          aria-label="Статус отзывов"
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
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

      {actionSuccess ? (
        <div className="r1Panel r1PanelPad" role="status" style={{ marginBottom: 12 }}>
          {actionSuccess}
        </div>
      ) : null}
      {loading ? <div className="r1StateLoading">Загрузка…</div> : null}
      {error ? <div className="r1StateErr" role="alert">{error}</div> : null}

      <section className="r1Panel">
        {!loading && !error && reviews.length === 0 ? (
          <div className="r1Empty">
            <h2>Очередь пуста</h2>
            <p>Нет отзывов с выбранным статусом.</p>
          </div>
        ) : null}
        {reviews.map((r) => (
          <article
            key={r.id}
            style={{ padding: "16px 24px", borderBottom: "1px solid var(--r1-line)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>
                {"★".repeat(r.rating)}
                <span className="r1Muted">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
              </span>
              <span className="r1Pill warn">{r.status}</span>
            </div>
            <p style={{ margin: "8px 0" }}>{r.text}</p>
            {r.status === "REJECTED" && r.rejectionReason ? (
              <p className="r1Help" style={{ margin: "0 0 8px" }}>
                Причина отклонения: {r.rejectionReason}
              </p>
            ) : null}
            {r.status === "REJECTED" && !r.rejectionReason ? (
              <p className="r1Help" style={{ margin: "0 0 8px" }}>
                Причина отклонения в аудите не найдена.
              </p>
            ) : null}
            <small className="r1Muted">
              {r.author.displayName || "Клиент"} ·{" "}
              <Link href={`/admin/partners/${r.partner.id}`}>
                {r.partner.displayName || "Партнёр"}
              </Link>{" "}
              · {formatAdminR1Date(r.createdAt)}
            </small>
            {canActOnPending(r) ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  className="r1Btn small primary"
                  onClick={() => openConfirm("approve", r)}
                >
                  Опубликовать
                </button>
                <button
                  type="button"
                  className="r1Btn small"
                  onClick={() => openConfirm("reject", r)}
                >
                  Отклонить
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {!loading && !error && total > 0 ? (
          <div className="r1Pager">
            <span className="r1Muted">
              Стр. {page} из {totalPages} · всего {total}
            </span>
            <button
              type="button"
              className="r1Btn small"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <button
              type="button"
              className="r1Btn small"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </button>
          </div>
        ) : null}
      </section>

      <dialog
        ref={dialogRef}
        className="r1Dialog"
        onClose={closeConfirm}
        aria-labelledby="review-confirm-title"
      >
        {confirm ? (
          <>
            <div className="r1DialogBody">
              <h2 id="review-confirm-title">
                {confirm.type === "approve" ? "Опубликовать отзыв?" : "Отклонить отзыв?"}
              </h2>
              <p className="r1Help" style={{ marginTop: 8 }}>
                {confirm.review.text}
              </p>
              {confirm.type === "approve" ? (
                <p className="r1Help">
                  Публикация начисляет бонус автору, если он ещё не был начислен.
                </p>
              ) : (
                <>
                  <p className="r1Help" role="note">
                    Причина будет сохранена в аудите партнёра (PartnerAdminAuditEvent) и
                    отобразится в очереди «Отклонены». Без причины отклонение невозможно.
                  </p>
                  <label className="r1FormField">
                    Причина отклонения
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                      required
                      aria-required="true"
                      placeholder="Кратко опишите причину"
                    />
                  </label>
                </>
              )}
              {actionError ? (
                <div className="r1StateErr" role="alert" style={{ marginTop: 12 }}>
                  {actionError}
                </div>
              ) : null}
            </div>
            <div className="r1DialogFooter">
              <button
                type="button"
                className="r1Btn small"
                onClick={closeConfirm}
                disabled={actionPending}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`r1Btn small ${confirm.type === "approve" ? "primary" : ""}`}
                onClick={() => void submitConfirm()}
                disabled={actionPending}
              >
                {actionPending
                  ? "Отправка…"
                  : confirm.type === "approve"
                    ? "Опубликовать"
                    : "Отклонить"}
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
