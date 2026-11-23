"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  activeInviteRows,
  buildInviteFormResetKey,
  categoriesFromResetKey,
  createInitialInviteFormState,
  setInviteFormError,
  syncInviteFormState,
  updateInviteGeneralConfirmed,
  updateInviteNote,
  updateInviteRowExcluded,
  updateInviteRowPercent,
  type InviteFormSnapshot,
} from "@/lib/invite-form-state";
import {
  DEFAULT_GENERAL_PERCENT,
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  validateInviteRows,
} from "@/lib/partnership-rules";
import {
  miniAppCreateDiscussionInvite,
  miniAppCreateLinkInvite,
  miniAppFetchInviteContext,
  type MiniAppInviteContextResponse,
} from "@/lib/mini-app/api";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import type { MiniAppPlatform } from "@/lib/mini-app/types";
import {
  buildInviteShareText,
  DISCUSSION_MESSAGE_TEMPLATES,
  armMiniInviteRecoveryGuard,
  clearMiniInviteDraft,
  clearMiniInviteRecoveryGuard,
  draftIsDirty,
  formatInviteExpiry,
  INTENDED_PARTNER_OPTIONS,
  isInviteCreateUnknownOutcome,
  MINI_INVITE_UNKNOWN_OUTCOME_HINT,
  miniInviteDraftKey,
  miniInviteRecoveryKey,
  readMiniInviteDraft,
  readMiniInviteRecoveryPending,
  stepFieldErrors,
  termsTemplateText,
  writeMiniInviteDraft,
  type IntendedPartnerType,
  type MiniInviteCreateResult,
} from "@/lib/mini-app/invite-wizard";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  platform: MiniAppPlatform;
  branchId: string | null;
  embeddedContext: MiniAppEmbeddedContext;
  partnersSearchUrl: string;
  onBack: () => void;
  /** Dev fixture: skip network and open ready screen */
  fixtureInviteLink?: string | null;
};

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Партнёр", "Сообщение", "Проверка"] as const;

type InviteFormAction =
  | { type: "sync"; resetKey: string; categories: readonly string[]; blockedReason?: string }
  | { type: "set_percent"; index: number; percent: string }
  | { type: "set_excluded"; index: number; excluded: boolean }
  | { type: "set_note"; note: string }
  | { type: "set_general_confirmed"; generalConfirmed: boolean }
  | { type: "set_error"; error: string };

function inviteFormReducer(state: InviteFormSnapshot, action: InviteFormAction): InviteFormSnapshot {
  switch (action.type) {
    case "sync":
      return syncInviteFormState(state, action.resetKey, action.categories, action.blockedReason);
    case "set_percent":
      return updateInviteRowPercent(state, action.index, action.percent);
    case "set_excluded":
      return updateInviteRowExcluded(state, action.index, action.excluded);
    case "set_note":
      return updateInviteNote(state, action.note);
    case "set_general_confirmed":
      return updateInviteGeneralConfirmed(state, action.generalConfirmed);
    case "set_error":
      return setInviteFormError(state, action.error);
    default:
      return state;
  }
}

function transportErrorMessage(err: unknown, fallback: string): { message: string; unknownOutcome: boolean } {
  const unknownOutcome = isInviteCreateUnknownOutcome(err);
  if (unknownOutcome) {
    return { message: MINI_INVITE_UNKNOWN_OUTCOME_HINT, unknownOutcome: true };
  }
  if (err instanceof RemcardApiError) {
    return { message: err.message || fallback, unknownOutcome: false };
  }
  return { message: fallback, unknownOutcome: false };
}

export function MiniAppInvitePartner({
  platform,
  branchId,
  embeddedContext,
  partnersSearchUrl,
  onBack,
  fixtureInviteLink,
}: Props) {
  const apiOpts = useMemo(
    () => ({ embeddedContext, branchId: branchId ?? undefined }),
    [embeddedContext, branchId],
  );

  const [contextLoading, setContextLoading] = useState(!fixtureInviteLink);
  const [contextError, setContextError] = useState("");
  const [contextBlocked, setContextBlocked] = useState("");
  const [inviteContext, setInviteContext] = useState<MiniAppInviteContextResponse | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [partnerName, setPartnerName] = useState("");
  const [intendedType, setIntendedType] = useState<IntendedPartnerType>("");
  const [templateId, setTemplateId] = useState("short");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState("");
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const [created, setCreated] = useState<MiniInviteCreateResult | null>(null);
  const [statusText, setStatusText] = useState("");
  const [statusBad, setStatusBad] = useState(false);
  const [manualShare, setManualShare] = useState(false);

  const kind = inviteContext?.kind ?? "terms";
  const nameMax = inviteContext?.nameMaxLength ?? 120;
  const noteMax = inviteContext?.noteMaxLength ?? 400;

  const serverPlan = inviteContext?.categoryPlan;
  const draftKey = miniInviteDraftKey(platform, branchId);
  const recoveryKey = useMemo(
    () =>
      miniInviteRecoveryKey({
        embeddedContext,
        platform,
        branchId,
        kind,
      }),
    [embeddedContext, platform, branchId, kind],
  );
  const [createRecoveryBlocked, setCreateRecoveryBlocked] = useState(() =>
    readMiniInviteRecoveryPending(recoveryKey),
  );

  const formTargetKey = `mini:link:${intendedType || "none"}:${(serverPlan?.categories ?? []).join("\0")}`;
  const resetKey = buildInviteFormResetKey(
    formTargetKey,
    serverPlan?.categories ?? [],
  );

  const [form, dispatch] = useReducer(
    inviteFormReducer,
    {
      resetKey,
      categories: serverPlan?.categories ?? [],
      blockedReason: serverPlan?.error,
    },
    (initial) =>
      createInitialInviteFormState(initial.resetKey, initial.categories, initial.blockedReason),
  );

  useEffect(() => {
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, formTargetKey),
      blockedReason: serverPlan?.error,
    });
  }, [resetKey, serverPlan?.error, formTargetKey]);

  useEffect(() => {
    const pending = readMiniInviteRecoveryPending(recoveryKey);
    setCreateRecoveryBlocked(pending);
    if (pending) {
      setUnknownOutcome(true);
      setCreateError(MINI_INVITE_UNKNOWN_OUTCOME_HINT);
    }
  }, [recoveryKey]);

  useEffect(() => {
    if (fixtureInviteLink) {
      setCreated({
        url: fixtureInviteLink,
        previewPath: new URL(fixtureInviteLink, getAppUrl()).pathname,
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        recipientLabel: "Партнёр (fixture)",
        note: "Текст приглашения из фикстуры",
        kind: "discussion",
        intendedType: "",
        termsSummary: [],
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      setContextLoading(true);
      setContextError("");
      setContextBlocked("");
      try {
        const ctx = await miniAppFetchInviteContext(platform, apiOpts);
        if (cancelled) return;
        if (
          ctx.categoryPlan.error &&
          ctx.kind === "terms" &&
          !ctx.categoryPlan.requiresIntendedType
        ) {
          setContextBlocked(ctx.categoryPlan.error);
        }
        setInviteContext(ctx);
        const stored = readMiniInviteDraft(draftKey);
        if (stored) {
          setStep(Math.min(3, Math.max(1, stored.step)) as Step);
          setPartnerName(stored.partnerName);
          setIntendedType(stored.intendedType);
          setTemplateId(stored.templateId);
          dispatch({ type: "set_note", note: stored.note });
          if (stored.generalConfirmed) {
            dispatch({ type: "set_general_confirmed", generalConfirmed: true });
          }
          for (let i = 0; i < stored.rows.length; i += 1) {
            const row = stored.rows[i]!;
            dispatch({ type: "set_percent", index: i, percent: row.percent });
            dispatch({ type: "set_excluded", index: i, excluded: row.excluded });
          }
        }
      } catch (caught) {
        if (!cancelled) {
          const err = transportErrorMessage(caught, "Не удалось открыть мастер приглашения");
          if (caught instanceof RemcardApiError && (caught.status === 401 || caught.status === 403)) {
            setContextBlocked(err.message);
          } else {
            setContextError(err.message);
          }
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOpts, draftKey, fixtureInviteLink, platform]);

  useEffect(() => {
    if (fixtureInviteLink || kind !== "terms" || !intendedType) return;
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await miniAppFetchInviteContext(platform, {
          ...apiOpts,
          intendedPartnerType: intendedType,
        });
        if (!cancelled) setInviteContext(ctx);
      } catch {
        // keep previous server plan on refetch failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOpts, fixtureInviteLink, intendedType, kind, platform]);

  useEffect(() => {
    if (fixtureInviteLink || created || !inviteContext) return;
    if (!draftIsDirty({ ready: false, step, name: partnerName, note: form.note, intendedType })) {
      return;
    }
    writeMiniInviteDraft(draftKey, {
      v: 1,
      step,
      partnerName,
      intendedType,
      templateId,
      note: form.note,
      generalConfirmed: form.generalConfirmed,
      rows: form.rows.map((row) => ({
        category: row.category,
        percent: row.percent,
        excluded: row.excluded,
      })),
    });
  }, [
    created,
    draftKey,
    fixtureInviteLink,
    form.generalConfirmed,
    form.note,
    form.rows,
    intendedType,
    inviteContext,
    partnerName,
    step,
    templateId,
  ]);

  const dirty = draftIsDirty({
    ready: Boolean(created),
    step,
    name: partnerName,
    note: form.note,
    intendedType,
  });

  const requestBack = useCallback(() => {
    if (creating) return;
    if (dirty) {
      const ok = window.confirm(
        "Выйти из мастера? Черновик сохранится в этом сеансе, пока вкладка мини-кабинета открыта.",
      );
      if (!ok) return;
    }
    onBack();
  }, [creating, dirty, onBack]);

  function applyTemplate(nextId: string) {
    setTemplateId(nextId);
    if (kind === "discussion") {
      const tpl = DISCUSSION_MESSAGE_TEMPLATES.find((t) => t.id === nextId);
      if (tpl) dispatch({ type: "set_note", note: tpl.text });
      return;
    }
    dispatch({ type: "set_note", note: termsTemplateText(nextId, partnerName) });
  }

  function gotoStep(next: Step) {
    if (creating) return;
    setFieldErrors({});
    if (!unknownOutcome && !createRecoveryBlocked) setCreateError("");
    setStep(next);
  }

  function validateCurrentStep(target: Step): boolean {
    const errors = stepFieldErrors({
      step: target,
      kind,
      name: partnerName,
      note: form.note,
      intendedType,
      requiresIntendedType: Boolean(inviteContext?.categoryPlan.requiresIntendedType),
      nameMax,
      noteMax,
    });
    if (target === 3 && kind === "terms") {
      if (serverPlan?.error) {
        errors.terms = serverPlan.error;
      } else {
        const active = activeInviteRows(form);
        const validation = validateInviteRows(active);
        if (validation) errors.terms = validation;
        if (form.useGeneralFallback && !form.generalConfirmed) {
          errors.terms = `Подтвердите общие условия: «${categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» — ${DEFAULT_GENERAL_PERCENT}%`;
        }
        if (!intendedType) errors.type = "Выберите предполагаемый тип партнёра";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitInvite() {
    if (createInFlight.current || creating) return;
    if (createRecoveryBlocked || readMiniInviteRecoveryPending(recoveryKey)) return;
    if (!validateCurrentStep(3)) return;
    setCreateError("");
    setUnknownOutcome(false);
    setStatusText("");
    setStatusBad(false);
    armMiniInviteRecoveryGuard(recoveryKey);
    setCreateRecoveryBlocked(true);
    createInFlight.current = true;
    setCreating(true);
    const trimmedName = partnerName.trim();
    const trimmedNote = form.note.trim();

    try {
      if (kind === "discussion") {
        const result = await miniAppCreateDiscussionInvite(
          platform,
          { recipientLabel: trimmedName, cooperationSubject: trimmedNote },
          apiOpts,
        );
        const url = `${getAppUrl()}${result.previewPath}`;
        clearMiniInviteDraft(draftKey);
        clearMiniInviteRecoveryGuard(recoveryKey);
        setCreateRecoveryBlocked(false);
        setCreated({
          url,
          previewPath: result.previewPath,
          expiresAt: result.expiresAt,
          recipientLabel: trimmedName,
          note: trimmedNote,
          kind: "discussion",
          intendedType: "",
          termsSummary: [],
        });
      } else {
        const activeRows = activeInviteRows(form);
        const terms = inviteRowsToTerms(activeRows).map((term) => ({
          ...term,
          categoryLabel: categoryLabel(term.category),
        }));
        const result = await miniAppCreateLinkInvite(
          platform,
          {
            intendedPartnerType: intendedType,
            note: trimmedNote || null,
            terms,
            recipientLabel: trimmedName || null,
          },
          apiOpts,
        );
        const url = `${getAppUrl()}${result.previewPath}`;
        clearMiniInviteDraft(draftKey);
        clearMiniInviteRecoveryGuard(recoveryKey);
        setCreateRecoveryBlocked(false);
        setCreated({
          url,
          previewPath: result.previewPath,
          expiresAt: result.expiresAt,
          recipientLabel: trimmedName,
          note: trimmedNote,
          kind: "terms",
          intendedType,
          termsSummary: terms.map((t) => ({
            category: t.category,
            excluded: Boolean(t.isExcluded),
            percent: t.isExcluded ? null : t.storePercent,
          })),
        });
      }
    } catch (caught) {
      const err = transportErrorMessage(caught, "Не удалось создать приглашение");
      setCreateError(err.message);
      setUnknownOutcome(err.unknownOutcome);
      if (!err.unknownOutcome) {
        clearMiniInviteRecoveryGuard(recoveryKey);
        setCreateRecoveryBlocked(false);
      }
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }

  async function copyInvitation() {
    if (!created) return;
    const text = buildInviteShareText(created);
    try {
      await navigator.clipboard.writeText(text);
      setManualShare(false);
      setStatusBad(false);
      setStatusText("Текст приглашения скопирован");
    } catch {
      setManualShare(true);
      setStatusBad(true);
      setStatusText("Не удалось скопировать. Выделите текст вручную.");
    }
  }

  if (contextLoading) {
    return (
      <MiniAppSubpage title="Пригласить партнёра" onBack={requestBack} backDisabled={creating}>
        <p>Загрузка…</p>
      </MiniAppSubpage>
    );
  }

  if (contextError) {
    return (
      <MiniAppSubpage title="Пригласить партнёра" onBack={requestBack}>
        <p className={styles.scanBad} role="alert">
          {contextError}
        </p>
        <button type="button" className={styles.secondaryBtn} onClick={() => window.location.reload()}>
          Повторить
        </button>
      </MiniAppSubpage>
    );
  }

  if (contextBlocked && !inviteContext) {
    return (
      <MiniAppSubpage
        title="Пригласить партнёра"
        lead="Создание приглашения сейчас недоступно для этого аккаунта."
        onBack={requestBack}
      >
        <p className={styles.scanBad} role="alert" data-testid="mini-invite-blocked">
          {contextBlocked}
        </p>
      </MiniAppSubpage>
    );
  }

  if (created) {
    const shareText = buildInviteShareText(created);
  return (
      <MiniAppSubpage
        title="Теперь передайте приглашение"
        lead={`Для «${created.recipientLabel}» всё подготовлено. Скопируйте текст и передайте знакомому.`}
        onBack={requestBack}
      >
        <div data-testid="invite-ready">
          <MotionlessInfoCard
            testId="invite-ready-message"
            title="Пригласительное сообщение"
            body={created.note}
          />
          {created.kind === "terms" && created.termsSummary.length > 0 ? (
            <details className={`${styles.infoCard} ${styles.inviteDetails}`}>
              <summary>Посмотреть условия приглашения</summary>
              <ul className={styles.invitePlainList}>
                {created.termsSummary.map((row) => (
                  <li key={row.category}>
                    {categoryLabel(row.category)}:{" "}
                    {row.excluded ? "не участвует" : `${row.percent}%`}
                  </li>
                ))}
              </ul>
              <p className={styles.footnote}>Условия зафиксированы на момент создания ссылки.</p>
            </details>
          ) : null}
          <label className={styles.fieldLabel} htmlFor="mini-invite-url">
            Ссылка
          </label>
          <input
            id="mini-invite-url"
            className={styles.readOnlyField}
            readOnly
            value={created.url}
            data-testid="invite-url"
          />
          <p className={styles.footnote}>
            {created.kind === "terms"
              ? "Активна до принятия или отзыва"
              : `Действует до ${formatInviteExpiry(created.expiresAt)}`}
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            data-testid="invite-copy-btn"
            onClick={() => void copyInvitation()}
          >
            <MiniIconCopy />
            Скопировать приглашение
          </button>
          <p
            className={`${styles.inviteStatus} ${statusBad ? styles.inviteStatusBad : ""}`}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </p>
          {manualShare ? (
            <label className={styles.fieldLabel} htmlFor="mini-invite-share-text">
              Готовый текст
            </label>
          ) : null}
          {manualShare ? (
            <textarea
              id="mini-invite-share-text"
              className={styles.readOnlyField}
              readOnly
              rows={7}
              value={shareText}
              data-testid="invite-share-manual"
            />
          ) : null}
          <p className={styles.footnote}>
            Сообщение автоматически не отправляется — передайте его сами.
          </p>
        </div>
      </MiniAppSubpage>
    );
  }

  return (
      <MiniAppSubpage
        title="Пригласить партнёра"
        lead={kind === "terms" ? "Ссылка на сотрудничество с условиями" : "Ссылка к обсуждению сотрудничества"}
        onBack={requestBack}
        backDisabled={creating}
      >
      <div data-testid="mini-invite-wizard" data-step={step}>
        <ol className={styles.inviteSteps} aria-label="Шаги">
          {STEP_LABELS.map((label, index) => {
            const n = index + 1;
            return (
              <li key={label} aria-current={step === n ? "step" : undefined} data-done={step > n}>
                <span>{n}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className={styles.inviteEyebrow}>Шаг {step} из 3</p>

        {step === 1 ? (
          <>
            <h2 className={styles.inviteH2}>Кого хотите пригласить?</h2>
            <p className={styles.infoCardText}>
              {kind === "terms"
                ? "Укажите, кому отправите ссылку на сотрудничество. Контакты пока не нужны."
                : "Укажите, кому отправите ссылку к обсуждению сотрудничества."}
            </p>
            <label className={styles.fieldLabel} htmlFor="mini-invite-name">
              Имя или название партнёра
            </label>
            <input
              id="mini-invite-name"
              className={styles.readOnlyField}
              maxLength={nameMax}
              value={partnerName}
              placeholder="Например, «Дом материалов»"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.name)}
              data-testid="mini-invite-name"
              onChange={(e) => setPartnerName(e.target.value)}
            />
            {kind === "discussion" ? (
              <p className={styles.footnote}>Название магазина, компании или имя. Контакты пока не нужны.</p>
            ) : null}
            {fieldErrors.name ? (
              <p className={styles.scanBad} role="alert">
                {fieldErrors.name}
              </p>
            ) : null}
            {kind === "terms" ? (
              <>
                <label className={styles.fieldLabel} htmlFor="mini-invite-type">
                  Предполагаемый тип партнёра
                </label>
                <select
                  id="mini-invite-type"
                  className={styles.miniSelect}
                  value={intendedType}
                  data-testid="mini-invite-type"
                  onChange={(e) => setIntendedType(e.target.value as IntendedPartnerType)}
                >
                  <option value="">Выберите тип</option>
                  {INTENDED_PARTNER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.type ? (
                  <p className={styles.scanBad} role="alert">
                    {fieldErrors.type}
                  </p>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid="mini-invite-next-1"
              onClick={() => {
                if (validateCurrentStep(1)) gotoStep(2);
              }}
            >
              Далее: сообщение
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className={styles.inviteH2}>
              {kind === "terms" ? "Что напишем партнёру?" : "Подготовьте приглашение"}
            </h2>
            {kind === "discussion" ? (
              <p className={styles.infoCardText}>
                Выберите, как пригласить «{partnerName.trim()}», или напишите по-своему. Ссылку создадите на
                следующем шаге.
              </p>
            ) : null}
            <div className={styles.inviteChips} role="group" aria-label="Шаблоны">
              {(kind === "terms"
                ? [
                    { id: "short", label: "Коротко" },
                    { id: "business", label: "По-деловому" },
                    { id: "friendly", label: "По-дружески" },
                  ]
                : DISCUSSION_MESSAGE_TEMPLATES
              ).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={styles.inviteChip}
                  aria-pressed={templateId === tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
            <label className={styles.fieldLabel} htmlFor="mini-invite-note">
              Текст приглашения
            </label>
            <textarea
              id="mini-invite-note"
              className={styles.readOnlyField}
              rows={6}
              maxLength={noteMax}
              value={form.note}
              data-testid="mini-invite-note"
              aria-invalid={Boolean(fieldErrors.note)}
              onChange={(e) => dispatch({ type: "set_note", note: e.target.value })}
            />
            <p className={`${styles.footnote} ${styles.inviteCounter}`}>
              <span>
                {kind === "discussion"
                  ? "Любой шаблон можно изменить. Условия сотрудничества согласуете отдельно."
                  : ""}
              </span>
              <span data-testid="mini-invite-counter">
                {form.note.length} / {noteMax}
              </span>
            </p>
            {fieldErrors.note ? (
              <p className={styles.scanBad} role="alert">
                {fieldErrors.note}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => gotoStep(1)}
            >
              ← Назад
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid="mini-invite-next-2"
              onClick={() => {
                if (validateCurrentStep(2)) gotoStep(3);
              }}
            >
              Далее: проверить
            </button>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className={styles.inviteH2}>Проверьте приглашение</h2>
            <MotionlessInfoCard
              testId="invite-review-partner"
              title="Кого приглашаете"
              body={partnerName.trim()}
              extra={
                kind === "terms"
                  ? INTENDED_PARTNER_OPTIONS.find((o) => o.value === intendedType)?.label
                  : undefined
              }
              editLabel="Изменить имя партнёра"
              onEdit={() => gotoStep(1)}
            />
            <MotionlessInfoCard
              testId="invite-review-message"
              title="Пригласительное сообщение"
              body={form.note.trim()}
              editLabel="Изменить сообщение"
              onEdit={() => gotoStep(2)}
            />
            {kind === "terms" ? (
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Условия сотрудничества</p>
                {serverPlan?.error || contextBlocked ? (
                  <p className={styles.scanBad} role="alert" data-testid="mini-invite-terms-blocked">
                    {serverPlan?.error || contextBlocked}
                  </p>
                ) : form.useGeneralFallback ? (
                  <label className={styles.inviteTermRow}>
                    <input
                      type="checkbox"
                      checked={form.generalConfirmed}
                      onChange={(e) =>
                        dispatch({ type: "set_general_confirmed", generalConfirmed: e.target.checked })
                      }
                    />
                    Подтверждаю общие условия ({DEFAULT_GENERAL_PERCENT}%)
                  </label>
                ) : (
                  form.rows.map((row, index) => (
                    <div key={row.category} className={styles.inviteTermRow}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!row.excluded}
                          onChange={(e) =>
                            dispatch({ type: "set_excluded", index, excluded: !e.target.checked })
                          }
                        />
                        {categoryLabel(row.category)}
                      </label>
                      {!row.excluded ? (
                        <input
                          className={`${styles.readOnlyField} ${styles.inviteTermPercent}`}
                          inputMode="decimal"
                          value={row.percent}
                          aria-label={`Процент ${categoryLabel(row.category)}`}
                          onChange={(e) =>
                            dispatch({ type: "set_percent", index, percent: e.target.value })
                          }
                        />
                      ) : (
                        <span className={styles.footnote}>не участвует</span>
                      )}
                    </div>
                  ))
                )}
                {fieldErrors.terms ? (
                  <p className={styles.scanBad} role="alert">
                    {fieldErrors.terms}
                  </p>
                ) : null}
              </div>
            ) : null}
            {createError ? (
              <p className={styles.scanBad} role="alert" data-testid="mini-invite-create-error">
                {createError}
              </p>
            ) : null}
            {createRecoveryBlocked ? (
              <p className={styles.footnote} data-testid="mini-invite-recovery-blocked">
                Создание из мини-кабинета заблокировано до проверки в полном кабинете.
              </p>
            ) : null}
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={creating}
              onClick={() => gotoStep(2)}
            >
              ← Назад
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={
                creating ||
                createRecoveryBlocked ||
                Boolean(kind === "terms" && (serverPlan?.error || contextBlocked))
              }
              data-testid="mini-invite-create"
              onClick={() => void submitInvite()}
            >
              {creating
                ? "Создаём…"
                : createRecoveryBlocked
                  ? "Создание заблокировано"
                  : "Создать приглашение"}
            </button>
          </>
        ) : null}
      </div>
      <p className={styles.footnote}>Ссылку отправляете вы сами — мини-приложение не рассылает сообщения.</p>
    </MiniAppSubpage>
  );
}

function MotionlessInfoCard(props: {
  testId?: string;
  title: string;
  body: string;
  extra?: string;
  editLabel?: string;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`${styles.infoCard} ${styles.inviteReview}`}
      data-testid={props.testId}
    >
      <p className={styles.fieldLabel}>{props.title}</p>
      <strong>{props.body}</strong>
      {props.extra ? <p className={styles.infoCardText}>{props.extra}</p> : null}
      {props.editLabel && props.onEdit ? (
        <button type="button" className={styles.inviteEditLink} onClick={props.onEdit}>
          {props.editLabel}
        </button>
      ) : null}
    </div>
  );
}