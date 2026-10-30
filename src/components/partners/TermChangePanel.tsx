"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import { describePendingTermChange } from "@/lib/term-change-labels";
import type { Partnership, PartnershipTerm, TermChangeRequest } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./TermChangePanel.module.css";

type TermChangePanelProps = {
  partnership: Partnership;
  meId: string;
  partnerTitle: string;
  requests: TermChangeRequest[] | null;
  loadState: "idle" | "loading" | "loaded" | "error";
  loadError: string;
  onReload: () => void;
  onChanged: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCloseRequest?: () => void;
};

function activeTerms(terms: PartnershipTerm[]): PartnershipTerm[] {
  return terms.filter((term) => !term.isExcluded);
}

function isDraftDirty(
  terms: PartnershipTerm[],
  draftPercents: Record<string, string>,
): boolean {
  return terms.some((term) => {
    const raw = draftPercents[term.category]?.trim() ?? "";
    if (!raw) return false;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return true;
    return parsed !== term.storePercent;
  });
}

export function TermChangePanel({
  partnership,
  meId,
  partnerTitle,
  requests,
  loadState,
  loadError,
  onReload,
  onChanged,
  onDirtyChange,
  onCloseRequest,
}: TermChangePanelProps) {
  const [draftPercents, setDraftPercents] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const respondLockRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const terms = activeTerms(partnership.terms);
  const pendingRequest = requests?.find(
    (request) => request.status === "PENDING" && new Date(request.expiresAt) > new Date(),
  );
  const dirty = useMemo(() => isDraftDirty(terms, draftPercents), [terms, draftPercents]);
  const requestsReady = loadState === "loaded";
  const busy = submitting || respondingId !== null;
  const canPropose =
    partnership.status === "ACTIVE" && requestsReady && !pendingRequest && !busy;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!onCloseRequest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Nested confirm dialogs handle Escape themselves (capture, stopPropagation)
      event.preventDefault();
      onCloseRequest();
    };
    // Bubble only — confirm dialog listens in capture and stops when open
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCloseRequest]);

  async function submitProposal() {
    if (submitLockRef.current || busy) return;
    setSubmitError("");

    if (!requestsReady) {
      setSubmitError("Дождитесь загрузки актуальных запросов");
      return;
    }
    if (partnership.status !== "ACTIVE") {
      setSubmitError("Новое предложение доступно только при действующем сотрудничестве");
      return;
    }
    if (pendingRequest) {
      setSubmitError("Уже есть активный запрос на изменение условий");
      return;
    }

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

    submitLockRef.current = true;
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
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  async function respond(requestId: string, action: "approve" | "reject") {
    if (respondLockRef.current || busy) return;
    respondLockRef.current = true;
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
      respondLockRef.current = false;
      setRespondingId(null);
    }
  }

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      data-testid="partner-term-change-panel"
      data-dirty={dirty ? "true" : "false"}
    >
      <div className={styles.headerRow}>
        <div>
          <h4 className={styles.title}>Изменить условия</h4>
          <p className={styles.partnerName} data-testid="term-change-partner-name">
            Партнёр: <strong>{partnerTitle}</strong>
          </p>
        </div>
        {onCloseRequest ? (
          <Button
            type="button"
            variant="secondary"
            className={styles.closeButton}
            data-testid="term-change-close"
            aria-label="Закрыть"
            disabled={busy}
            onClick={onCloseRequest}
          >
            Закрыть
          </Button>
        ) : null}
      </div>

      <p className={styles.notice}>
        До согласования действуют прежние условия.
      </p>

      {loadState === "loading" || loadState === "idle" ? (
        <p className={styles.meta}>Загрузка запросов…</p>
      ) : null}
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
          {requests.map((request) => {
            const pendingCopy =
              request.status === "PENDING"
                ? describePendingTermChange(request, partnership, meId)
                : null;
            return (
              <div key={request.id} className={styles.requestRow}>
                {pendingCopy ? (
                  <>
                    <p>
                      <strong>{pendingCopy.heading}</strong>
                    </p>
                    <p className={styles.meta}>{pendingCopy.hint}</p>
                  </>
                ) : (
                  <p>
                    Статус:{" "}
                    {request.status === "APPROVED"
                      ? "Принято"
                      : request.status === "REJECTED"
                        ? "Отклонено"
                        : request.status}
                  </p>
                )}
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
                {request.status === "PENDING" && pendingCopy?.canRespond ? (
                  <div className={styles.actions}>
                    <Button
                      disabled={busy}
                      onClick={() => void respond(request.id, "approve")}
                    >
                      {respondingId === request.id ? "Отправка…" : "Согласовать"}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void respond(request.id, "reject")}
                    >
                      Отклонить
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {partnership.status === "ACTIVE" ? (
        <div className={styles.proposal}>
          <h5 className={styles.subheading}>Предложить новое изменение</h5>
          <p className={styles.meta}>
            Укажите предлагаемый процент рядом с текущим. Пустые поля не отправляются; 0 —
            допустимое значение.
          </p>
          {terms.map((term) => (
            <div key={term.id} className={styles.termCompare} data-testid={`term-compare-${term.category}`}>
              <div className={styles.currentBox}>
                <span className={styles.currentLabel}>{categoryLabel(term.category)}</span>
                <span className={styles.currentValue}>
                  Сейчас <strong>{term.storePercent}%</strong>
                </span>
              </div>
              <TextField
                label={`Предлагаете, %`}
                type="number"
                min={0}
                max={100}
                placeholder={String(term.storePercent)}
                value={draftPercents[term.category] ?? ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDraftPercents((prev) => {
                  const next = { ...prev, [term.category]: nextValue };
                  onDirtyChange?.(isDraftDirty(terms, next));
                  return next;
                });
              }}
                disabled={Boolean(pendingRequest) || busy || !requestsReady}
              />
            </div>
          ))}
          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button
              disabled={!canPropose}
              onClick={() => void submitProposal()}
              data-testid="term-change-submit"
            >
              {submitting ? "Отправка…" : "Предложить изменение условий"}
            </Button>
            {onCloseRequest ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                data-testid="term-change-cancel"
                onClick={onCloseRequest}
              >
                Отмена
              </Button>
            ) : null}
          </div>
          {!requestsReady ? (
            <p className={styles.meta}>Отправка станет доступна после загрузки запросов.</p>
          ) : null}
          {pendingRequest ? (
            <p className={styles.meta}>
              Нельзя создать новый запрос, пока предыдущий на согласовании.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
