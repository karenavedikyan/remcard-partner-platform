"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { fetchModerationPartner, moderationPartnerAction } from "@/lib/prof-admin-moderation-api";
import { setProfTestPublicCatalogShow as setTestShowApi } from "@/lib/prof-admin-api";

type Submitted = {
  displayName?: string | null;
  city?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  specializations?: string[];
  storeCategories?: string[];
  website?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  vk?: string | null;
};

type PartnerPayload = {
  id: string;
  publicId: string;
  catalogStatus: string;
  isPublic: boolean;
  isTestPartner: boolean;
  profTestPublicCatalogAllowed: boolean | null;
  rejectionReason: string | null;
  submitted: Submitted;
  live: { displayName?: string; isPublic?: boolean };
  hasSubmittedDiff: boolean;
  fieldDiffs?: string[];
  portfolioItems: {
    id: string;
    title: string | null;
    description: string | null;
    images: string[];
  }[];
  services: {
    id: string;
    title: string;
    description: string | null;
    itemKind: string;
    city: string;
    images: string[];
  }[];
  moderationNotes: { id: string; comment: string; createdAt: string; resolvedAt: string | null }[];
};

export function PartnerModerationDetailClient({ partnerId }: { partnerId: string }) {
  const searchParams = useSearchParams();
  const [partner, setPartner] = useState<PartnerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviseComment, setReviseComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModerationPartner(partnerId);
      setPartner(res.partner as PartnerPayload);
    } catch (e) {
      setPartner(null);
      setError(e instanceof RemcardApiError ? e.message : "Ошибка загрузки");
    }
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "approve" || hash === "reject" || hash === "revise") {
      setMessage(`Фокус: ${hash} — подтвердите действие кнопкой ниже.`);
    }
  }, []);

  const run = async (action: "approve" | "reject" | "revise") => {
    if (busy) return;
    if (action === "revise" && reviseComment.trim().length < 3) {
      setMessage("Комментарий для доработки обязателен.");
      return;
    }
    if (action === "reject" && rejectReason.trim().length < 3) {
      setMessage("Причина отклонения обязательна.");
      return;
    }
    if (action === "approve" && !window.confirm("Одобрить заявку?")) return;
    if (action === "reject" && !window.confirm("Отклонить заявку?")) return;
    if (action === "revise" && !window.confirm("Вернуть на доработку?")) return;

    setBusy(true);
    setMessage(null);
    const body =
      action === "revise"
        ? { comment: reviseComment.trim() }
        : action === "reject"
          ? { reason: rejectReason.trim() }
          : {};
    try {
      await moderationPartnerAction(partnerId, action, body);
      setMessage("Готово.");
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Ошибка");
    }
    setBusy(false);
  };

  const toggleTestPublic = async (allowed: boolean) => {
    if (!window.confirm(allowed ? "Разрешить публичный показ test?" : "Скрыть test из каталога?")) {
      return;
    }
    setBusy(true);
    try {
      await setTestShowApi(partnerId, allowed);
      await load();
    } catch (e) {
      setMessage(e instanceof RemcardApiError ? e.message : "Не удалось изменить opt-in");
    }
    setBusy(false);
  };

  if (loading) return <p>Загрузка…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!partner) return <p>Не найдено</p>;

  const sub = partner.submitted;
  const backQs = searchParams.toString();

  return (
    <div>
      <p>
        <Link href={`/admin/moderation${backQs ? `?${backQs}` : ""}`}>← Очередь</Link>
      </p>
      <h1>{sub.displayName ?? partner.publicId}</h1>
      <p>
        ID {partner.publicId} · {partner.catalogStatus}
        {partner.isTestPartner ? " · TEST" : ""}
      </p>
      {partner.hasSubmittedDiff ? (
        <p style={{ color: "#b45309" }}>
          Изменённые поля: {(partner.fieldDiffs ?? []).join(", ") || "см. diff"}
        </p>
      ) : null}

      {sub.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sub.photoUrl} alt="" style={{ maxWidth: 240, borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <p>Фото не заполнено</p>
      )}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Поданные данные</h2>
        <p>Город: {sub.city ?? "—"}</p>
        <p>{sub.description ?? "Описание не заполнено"}</p>
        <p>Категории: {(sub.storeCategories ?? []).join(", ") || "—"}</p>
        <p>Специализации: {(sub.specializations ?? []).join(", ") || "—"}</p>
        <p>Сайт: {sub.website ?? "—"}</p>
        <p>Telegram: {sub.telegram ?? "—"}</p>
        <p>WhatsApp: {sub.whatsapp ?? "—"}</p>
      </section>

      {partner.services?.length ? (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1rem" }}>Услуги/товары</h2>
          <ul>
            {partner.services.map((s) => (
              <li key={s.id}>
                {s.title} ({s.itemKind}) · {s.city}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {partner.portfolioItems?.length ? (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1rem" }}>Портфолио</h2>
          <ul>
            {partner.portfolioItems.map((p) => (
              <li key={p.id}>
                {p.title ?? "Без названия"}
                {p.images[0] ? (
                  <>
                    {" "}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.images[0]} alt="" style={{ maxWidth: 80, verticalAlign: "middle" }} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "1rem" }}>Публикация</h2>
        <p>Live публичный: {partner.isPublic ? "да" : "нет"}</p>
        {partner.isTestPartner ? (
          <>
            <p>
              Test opt-in:{" "}
              {partner.profTestPublicCatalogAllowed
                ? "разрешён"
                : "не разрешён — approved test скрыт"}
            </p>
            <button type="button" disabled={busy} onClick={() => void toggleTestPublic(true)}>
              Разрешить test в каталоге
            </button>{" "}
            <button type="button" disabled={busy} onClick={() => void toggleTestPublic(false)}>
              Скрыть test
            </button>
          </>
        ) : null}
      </section>

      {partner.rejectionReason ? <p>Причина: {partner.rejectionReason}</p> : null}

      {partner.moderationNotes?.length ? (
        <section>
          <h2 style={{ fontSize: "1rem" }}>Замечания</h2>
          <ul>
            {partner.moderationNotes.map((n) => (
              <li key={n.id}>
                {n.comment} ({new Date(n.createdAt).toLocaleString("ru-RU")})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480, marginTop: 16 }}>
        <button type="button" disabled={busy} onClick={() => void run("approve")}>
          Одобрить
        </button>
        <textarea
          placeholder="Причина отклонения"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
        />
        <button type="button" disabled={busy} onClick={() => void run("reject")}>
          Отклонить
        </button>
        <textarea
          placeholder="Комментарий для доработки"
          value={reviseComment}
          onChange={(e) => setReviseComment(e.target.value)}
          rows={3}
        />
        <button type="button" disabled={busy} onClick={() => void run("revise")}>
          Вернуть на доработку
        </button>
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
