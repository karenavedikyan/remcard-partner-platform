"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import { describePendingTermChange } from "@/lib/term-change-labels";
import type { Partnership, PartnershipTerm, TermChangeRequest } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { isPartnershipParticipant } from "@/components/partners/partner-cooperation-c1";
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
  /** Increments when host should scroll into view and focus (open / Keep). */
  revealSignal?: number;
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

export function termContextKey(partnership: Partnership, meId: string): string {
  const terms = activeTerms(partnership.terms)
    .map((term) => `${term.category}:${term.storePercent}`)
    .join(",");
  return `${meId}|${partnership.id}|${partnership.status}|${terms}`;
}

/** Leave room for fixed/sticky bottom chrome (e.g. AppShell mobile nav) without editing AppShell. */
const BOTTOM_CHROME_CLEARANCE_PX = 96;

function clearFixedChromeOverlap(el: HTMLElement) {
  if (typeof window === "undefined" || typeof window.scrollBy !== "function") return;
  // jsdom exposes scrollBy but throws Not implemented — skip stub, keep real-browser nudge.
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return;
  const rect = el.getBoundingClientRect();
  const limit = window.innerHeight - BOTTOM_CHROME_CLEARANCE_PX;
  if (rect.bottom > limit) {
    window.scrollBy({ top: rect.bottom - limit + 12, left: 0, behavior: "auto" });
  }
  const top = el.getBoundingClientRect().top;
  if (top < 8) {
    window.scrollBy({ top: top - 16, left: 0, behavior: "auto" });
  }
}

function focusDraftField(panel: HTMLElement | null, category: string | null) {
  if (!panel) return;
  const preferred = category
    ? panel.querySelector<HTMLElement>(`[data-testid="term-draft-${category}"]`)
    : null;
  const fallback = panel.querySelector<HTMLElement>(
    'input[data-testid^="term-draft-"]:not([disabled])',
  );
  const target = preferred && !preferred.hasAttribute("disabled") ? preferred : fallback;
  if (target) {
    target.focus({ preventScroll: true });
    if (typeof target.scrollIntoView === "function") {
      // Center first, then nudge above fixed bottom chrome so hit-tests reach the input.
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }
    clearFixedChromeOverlap(target);
    return;
  }
  const closeBtn = panel.querySelector<HTMLElement>('[data-testid="term-change-close"]');
  closeBtn?.focus({ preventScroll: true });
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
  revealSignal = 0,
}: TermChangePanelProps) {
  const [draftPercents, setDraftPercents] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const respondLockRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const meIdRef = useRef(meId);
  const partnershipRef = useRef(partnership);
  const contextKey = termContextKey(partnership, meId);
  const contextKeyRef = useRef(contextKey);
  /** Bumped on context invalidate and each mutation start — stale Promise must not apply. */
  const mutationGenRef = useRef(0);
  const lastEditedCategoryRef = useRef<string | null>(null);

  meIdRef.current = meId;
  partnershipRef.current = partnership;

  const terms = activeTerms(partnership.terms);
  const pendingRequest = requests?.find(
    (request) => request.status === "PENDING" && new Date(request.expiresAt) > new Date(),
  );
  const dirty = useMemo(() => isDraftDirty(terms, draftPercents), [terms, draftPercents]);
  const requestsReady = loadState === "loaded";
  const busy = submitting || respondingId !== null;
  const isParticipant = isPartnershipParticipant(partnership, meId);
  const canPropose =
    isParticipant &&
    partnership.status === "ACTIVE" &&
    requestsReady &&
    !pendingRequest &&
    !busy;

  useEffect(() => {
    if (contextKeyRef.current === contextKey) return;
    contextKeyRef.current = contextKey;
    mutationGenRef.current += 1;
    setDraftPercents({});
    setSubmitError("");
    setSubmitting(false);
    setRespondingId(null);
    submitLockRef.current = false;
    respondLockRef.current = false;
    lastEditedCategoryRef.current = null;
    onDirtyChange?.(false);
  }, [contextKey, onDirtyChange]);

  // Invalidate in-flight propose/respond when the panel unmounts — stale resolve must not
  // call onChanged / clear drafts / setState on a dead or replaced workflow.
  useEffect(() => {
    return () => {
      mutationGenRef.current += 1;
      submitLockRef.current = false;
      respondLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!revealSignal) return;
    const panel = panelRef.current;
    if (!panel) return;
    if (typeof panel.scrollIntoView === "function") {
      // Prefer center so the workflow is inside the viewport after list open (host may sit below fold).
      panel.scrollIntoView({ block: "center", inline: "nearest" });
    }
    // Re-run when requests become ready so we focus an enabled draft, not only the trigger.
    const frame = window.requestAnimationFrame(() => {
      focusDraftField(panelRef.current, lastEditedCategoryRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealSignal, partnership.status, requestsReady, loadState]);

  useEffect(() => {
    if (!onCloseRequest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRequest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCloseRequest]);

  function isMutationCurrent(gen: number, submittedKey: string): boolean {
    return mutationGenRef.current === gen && contextKeyRef.current === submittedKey;
  }

  function guardMutationContext(kind: "propose" | "respond"): string | null {
    const current = partnershipRef.current;
    const currentMe = meIdRef.current;
    if (!isPartnershipParticipant(current, currentMe)) {
      return "Действие недоступно: вы больше не участник этого партнёрства";
    }
    if (kind === "propose" && current.status !== "ACTIVE") {
      return "Новое предложение доступно только при действующем сотрудничестве";
    }
    return null;
  }

  async function submitProposal() {
    if (submitLockRef.current || busy) return;
    setSubmitError("");

    const guardError = guardMutationContext("propose");
    if (guardError) {
      setSubmitError(guardError);
      return;
    }
    if (!requestsReady) {
      setSubmitError("Дождитесь загрузки актуальных запросов");
      return;
    }
    if (pendingRequest) {
      setSubmitError("Уже есть активный запрос на изменение условий");
      return;
    }

    const snapshot = partnershipRef.current;
    const snapshotTerms = activeTerms(snapshot.terms);

    const changes = snapshotTerms
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

    const preflight = guardMutationContext("propose");
    if (preflight) {
      setSubmitError(preflight);
      return;
    }

    const submittedKey = contextKeyRef.current;
    const gen = ++mutationGenRef.current;
    submitLockRef.current = true;
    setSubmitting(true);
    const submittedId = snapshot.id;
    try {
      await remcardFetch(`/api/partnerships/${submittedId}/term-change`, {
        method: "POST",
        body: { changes: payload },
      });
      if (!isMutationCurrent(gen, submittedKey)) {
        return;
      }
      setDraftPercents({});
      lastEditedCategoryRef.current = null;
      onDirtyChange?.(false);
      onChanged();
    } catch (caught) {
      if (!isMutationCurrent(gen, submittedKey)) {
        return;
      }
      setSubmitError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось отправить запрос",
      );
    } finally {
      if (isMutationCurrent(gen, submittedKey)) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  }

  async function respond(requestId: string, action: "approve" | "reject") {
    if (respondLockRef.current || busy) return;
    setSubmitError("");

    const guardError = guardMutationContext("respond");
    if (guardError) {
      setSubmitError(guardError);
      return;
    }

    const submittedId = partnershipRef.current.id;
    const submittedKey = contextKeyRef.current;
    const gen = ++mutationGenRef.current;

    respondLockRef.current = true;
    setRespondingId(requestId);
    try {
      await remcardFetch(
        `/api/partnerships/${submittedId}/term-change/${requestId}/respond`,
        { method: "POST", body: { action } },
      );
      if (!isMutationCurrent(gen, submittedKey)) {
        return;
      }
      onChanged();
    } catch (caught) {
      if (!isMutationCurrent(gen, submittedKey)) {
        return;
      }
      setSubmitError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось обработать запрос",
      );
    } finally {
      if (isMutationCurrent(gen, submittedKey)) {
        respondLockRef.current = false;
        setRespondingId(null);
      }
    }
  }

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      data-testid="partner-term-change-panel"
      data-dirty={dirty ? "true" : "false"}
      data-participant={isParticipant ? "true" : "false"}
      data-context-key={contextKey}
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
          <Button variant="secondary" data-testid="term-change-retry" onClick={onReload}>
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
                      disabled={busy || !isParticipant}
                      data-testid={`term-change-approve-${request.id}`}
                      onClick={() => void respond(request.id, "approve")}
                    >
                      {respondingId === request.id ? "Отправка…" : "Согласовать"}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || !isParticipant}
                      data-testid={`term-change-reject-${request.id}`}
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

      {submitError ? (
        <p className={styles.errorText} role="alert" data-testid="term-change-error">
          {submitError}
        </p>
      ) : null}

      {partnership.status === "ACTIVE" ? (
        <div className={styles.proposal}>
          <h5 className={styles.subheading}>Предложить новое изменение</h5>
          <p className={styles.meta}>
            Укажите предлагаемый процент рядом с текущим. Пустые поля не отправляются; 0 —
            допустимое значение.
          </p>
          {terms.map((term) => (
            <div
              key={term.id}
              className={styles.termCompare}
              data-testid={`term-compare-${term.category}`}
            >
              <div className={styles.currentBox}>
                <span className={styles.currentLabel}>{categoryLabel(term.category)}</span>
                <span className={styles.currentValue}>
                  Сейчас <strong>{term.storePercent}%</strong>
                </span>
              </div>
              <TextField
                label={`Предлагаете, %`}
                id={`term-draft-${partnership.id}-${term.category}`}
                type="number"
                min={0}
                max={100}
                placeholder={String(term.storePercent)}
                value={draftPercents[term.category] ?? ""}
                data-testid={`term-draft-${term.category}`}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  lastEditedCategoryRef.current = term.category;
                  setDraftPercents((prev) => {
                    const next = { ...prev, [term.category]: nextValue };
                    onDirtyChange?.(isDraftDirty(terms, next));
                    return next;
                  });
                }}
                disabled={Boolean(pendingRequest) || busy || !requestsReady || !isParticipant}
              />
            </div>
          ))}
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
