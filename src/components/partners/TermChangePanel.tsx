"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import type { Partnership, PartnershipTerm, TermChangeRequest } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./TermChangePanel.module.css";

type TermChangePanelProps = {
  partnership: Partnership;
  meId: string;
  requests: TermChangeRequest[] | null;
  loadState: "idle" | "loading" | "loaded" | "error";
  loadError: string;
  onReload: () => void;
  onChanged: () => void;
};

function activeTerms(terms: PartnershipTerm[]): PartnershipTerm[] {
  return terms.filter((term) => !term.isExcluded);
}

export function TermChangePanel({
  partnership,
  meId,
  requests,
  loadState,
  loadError,
  onReload,
  onChanged,
}: TermChangePanelProps) {
  const [draftPercents, setDraftPercents] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const terms = activeTerms(partnership.terms);
  const pendingRequest = requests?.find(
    (request) => request.status === "PENDING" && new Date(request.expiresAt) > new Date(),
  );

  async function submitProposal() {
    setSubmitError("");
    const changes = terms
      .map((term) => {
        const raw = draftPercents[term.category]?.trim();
        if (!raw) {
          return null;
        }
        const newPercent = Number(raw);
        if (!Number.isFinite(newPercent) || newPercent < 0 || newPercent > 100) {
          return { error: `Некорректный процент для ${categoryLabel(term.category)}` };
        }
        if (newPercent === term.storePercent) {
          return null;
        }
        return { category: term.category, newPercent };
      })
      .filter(Boolean);

    if (changes.some((item) => item && "error" in item)) {
      const invalid = changes.find((item) => item && "error" in item) as { error: string };
      setSubmitError(invalid.error);
      return;
    }

    const payload = changes.filter(
      (item): item is { category: string; newPercent: number } =>
        Boolean(item && !("error" in item)),
    );

    if (payload.length === 0) {
      setSubmitError("Укажите новый процент хотя бы для одной категории");
      return;
    }

    if (pendingRequest) {
      setSubmitError("Уже есть активный запрос на изменение условий");
      return;
    }

    setSubmitting(true);
    try {
      await remcardFetch(`/api/partnerships/${partnership.id}/term-change`, {
        method: "POST",
        body: { changes: payload },
      });
      setDraftPercents({});
      onChanged();
    } catch (caught) {
      setSubmitError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось отправить запрос",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(requestId: string, action: "approve" | "reject") {
    setRespondingId(requestId);
    setSubmitError("");
    try {
      await remcardFetch(
        `/api/partnerships/${partnership.id}/term-change/${requestId}/respond`,
        { method: "POST", body: { action } },
      );
      onChanged();
    } catch (caught) {
      setSubmitError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось обработать запрос",
      );
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className={styles.panel}>
      <h4>Изменение условий</h4>

      {loadState === "loading" ? <p className={styles.meta}>Загрузка запросов…</p> : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{loadError || "Не удалось загрузить запросы"}</p>
          <Button variant="secondary" onClick={onReload}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" && requests && requests.length === 0 ? (
        <p className={styles.meta}>Активных запросов на изменение пока нет.</p>
      ) : null}

      {loadState === "loaded" && requests && requests.length > 0 ? (
        <div className={styles.requests}>
          {requests.map((request) => (
            <div key={request.id} className={styles.requestRow}>
              <p>
                Статус:{" "}
                {request.status === "PENDING"
                  ? "На согласовании"
                  : request.status === "APPROVED"
                    ? "Принято"
                    : request.status === "REJECTED"
                      ? "Отклонено"
                      : request.status}
              </p>
              <ul>
                {(Array.isArray(request.changes) ? request.changes : []).map((change) => {
                  const category = String((change as { category?: unknown }).category ?? "");
                  const newPercent = Number((change as { newPercent?: unknown }).newPercent);
                  if (!category || !Number.isFinite(newPercent)) {
                    return null;
                  }
                  return (
                    <li key={`${request.id}-${category}`}>
                      {categoryLabel(category)} → {newPercent}%
                    </li>
                  );
                })}
              </ul>
              {request.status === "PENDING" && request.requestedBy !== meId ? (
                <div className={styles.actions}>
                  <Button
                    disabled={respondingId === request.id}
                    onClick={() => void respond(request.id, "approve")}
                  >
                    Согласовать
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={respondingId === request.id}
                    onClick={() => void respond(request.id, "reject")}
                  >
                    Отклонить
                  </Button>
                </div>
              ) : null}
              {request.status === "PENDING" && request.requestedBy === meId ? (
                <p className={styles.meta}>Ожидаем ответа партнёра</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {partnership.status === "ACTIVE" ? (
        <div className={styles.proposal}>
          <p className={styles.meta}>Предложить изменение процентов по активным категориям:</p>
          {terms.map((term) => (
            <TextField
              key={term.id}
              label={`${categoryLabel(term.category)} (сейчас ${term.storePercent}%)`}
              type="number"
              min={0}
              max={100}
              placeholder={String(term.storePercent)}
              value={draftPercents[term.category] ?? ""}
              onChange={(event) =>
                setDraftPercents((prev) => ({ ...prev, [term.category]: event.target.value }))
              }
              disabled={Boolean(pendingRequest) || submitting}
            />
          ))}
          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}
          <Button disabled={submitting || Boolean(pendingRequest)} onClick={() => void submitProposal()}>
            {submitting ? "Отправка…" : "Предложить изменение условий"}
          </Button>
          {pendingRequest ? (
            <p className={styles.meta}>Нельзя создать новый запрос, пока предыдущий на согласовании.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
