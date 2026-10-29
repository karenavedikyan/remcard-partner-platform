"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1PartnerCard,
  formatAdminR1Date,
  type AdminR1PartnerCard,
} from "@/lib/admin-r1/api";

export function AdminR1PartnerCardClient({ partnerId }: { partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<AdminR1PartnerCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminR1PartnerCard(partnerId);
        if (!cancelled) setCard(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Карточка недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  if (loading) return <div className="r1StateLoading">Загрузка карточки…</div>;
  if (error) return <div className="r1StateErr" role="alert">{error}</div>;
  if (!card) return <div className="r1Unavailable">Партнёр не найден</div>;

  return (
    <div data-testid="admin-r1-partner-card">
      <section className="r1Panel r1PanelPad">
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <span className="r1Avatar" style={{ width: 60, height: 60, fontSize: 18 }}>
            {(card.displayName || "?").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>{card.displayName || "Партнёр"}</h2>
            <p className="r1Muted">
              {card.partnerKindLabel || "—"} · {card.city || "—"} · {card.publicId || card.id}
            </p>
          </div>
          <span className={`r1Pill ${card.registrationLabel === "ACTIVE" ? "good" : ""}`}>
            {card.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}
          </span>
        </div>

        <div className="r1Kpis" style={{ marginBottom: 0 }}>
          <div className="r1Panel r1Kpi" style={{ background: "var(--r1-surface-2)", border: 0 }}>
            <span className="r1KpiLabel">RemScore</span>
            <strong className="r1KpiValue">
              {card.remScore ? `${card.remScore.score} · ${card.remScore.grade}` : "—"}
            </strong>
          </div>
          <div className="r1Panel r1Kpi" style={{ background: "var(--r1-surface-2)", border: 0 }}>
            <span className="r1KpiLabel">Сертификаты</span>
            <strong className="r1KpiValue">{card.counts.certificatesIssued}</strong>
          </div>
          <div className="r1Panel r1Kpi" style={{ background: "var(--r1-surface-2)", border: 0 }}>
            <span className="r1KpiLabel">Заказы</span>
            <strong className="r1KpiValue">
              {card.counts.ordersAsIssuer + card.counts.ordersAsStore}
            </strong>
            <span className="r1KpiBottom">
              issuer {card.counts.ordersAsIssuer} · store {card.counts.ordersAsStore}
            </span>
          </div>
          <div className="r1Panel r1Kpi" style={{ background: "var(--r1-surface-2)", border: 0 }}>
            <span className="r1KpiLabel">Отзывы</span>
            <strong className="r1KpiValue">{card.counts.reviewsPublished}</strong>
            <span className="r1KpiBottom">{card.counts.reviewsPending} на модерации</span>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3>Статусы (независимые)</h3>
          <p className="r1Help">Регистрация / каталог / сотрудничество / архив не смешиваются.</p>
          <ul className="r1Help">
            <li>Регистрация: {card.registrationLabel}</li>
            <li>
              Каталог: {card.catalogStatus}
              {card.isPublic ? " · публичный" : " · не публичный"}
              {card.lifecycle.catalogHiddenAt
                ? ` · скрыт ${formatAdminR1Date(card.lifecycle.catalogHiddenAt)}`
                : ""}
            </li>
            <li>
              Поиск сотрудничества override:{" "}
              {card.lifecycle.partnerSearchVisibleOverride === null
                ? "AUTO"
                : card.lifecycle.partnerSearchVisibleOverride
                  ? "SHOW"
                  : "HIDE"}
            </li>
            <li>
              Архив проекта:{" "}
              {card.lifecycle.projectArchivedAt
                ? formatAdminR1Date(card.lifecycle.projectArchivedAt)
                : "нет"}
            </li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
          <Link className="r1Btn" href={`/admin/partners/${card.id}/partnerships`}>
            Партнёрства
          </Link>
          {card.availableActions.includes("moderation") ? (
            <Link className="r1Btn" href={`/admin/moderation/partners/${card.id}`}>
              Модерация профиля
            </Link>
          ) : null}
          <Link className="r1Btn ghost" href="/admin/partners">
            К реестру
          </Link>
        </div>
        <p className="r1Help">
          Действия жизненного цикла выполняются только через существующее подтверждение на
          сервере.
        </p>
      </section>
    </div>
  );
}
