"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
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
  formatLinkInviteCopyText,
  inviteRowAllowsPublicCopy,
  linkInviteCardTitle,
  linkInviteIntendedLabel,
  participatingTermCount,
} from "@/lib/link-invite-gallery";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  DEFAULT_GENERAL_PERCENT,
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  profileUserToPartnerSide,
  resolveLinkInviteCreateCategories,
  validateInviteRows,
  type PartnerSideProfile,
} from "@/lib/partnership-rules";
import type { AuthMeResponse } from "@/lib/types";
import {
  formatInviteListDate,
  inviteAbsoluteUrl,
  parseLinkInviteListPayload,
  type LinkInviteListResponse,
  type LinkInviteListRow,
} from "@/lib/link-invite-list";
import {
  inviteWizardTemplate,
  MINI_INTENDED_OPTIONS,
  partnerSideFromInviterBusinessSide,
  type InviterBusinessSideDto,
  type MiniIntendedType,
} from "@/lib/miniAppLinkInvite";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  onBack: () => void;
};

type ListTab = "active" | "archive";
type Screen = "list" | "create" | "share";

type CreatedLinkSnapshot = {
  url: string;
  expiresAt: string;
  recipientLabel: string;
  shareText: string;
};

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

async function fetchLinkInviteList(): Promise<{
  list: LinkInviteListResponse;
  inviterSide: PartnerSideProfile | null;
}> {
  const data = await remcardFetch<
    LinkInviteListResponse & { inviterBusinessSide?: InviterBusinessSideDto }
  >("/api/partnership/link-invite", { searchParams: { listVersion: "2" } });
  const inviterSide = data.inviterBusinessSide?.principalUserId
    ? partnerSideFromInviterBusinessSide(data.inviterBusinessSide)
    : null;
  return { list: parseLinkInviteListPayload(data).list, inviterSide };
}

export function MiniAppLinkInviteFlow({ onBack }: Props) {
  const [screen, setScreen] = useState<Screen>("list");
  const [listTab, setListTab] = useState<ListTab>("active");
  const [list, setList] = useState<LinkInviteListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [authUser, setAuthUser] = useState<AuthMeResponse["user"]>(null);
  const [apiInviterSide, setApiInviterSide] = useState<PartnerSideProfile | null>(null);

  const [step, setStep] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [tone, setTone] = useState("short");
  const [intendedType, setIntendedType] = useState<MiniIntendedType>("");

  const inviterSide = useMemo(() => {
    if (apiInviterSide) return apiInviterSide;
    if (authUser) return profileUserToPartnerSide(authUser as never, null);
    return null;
  }, [apiInviterSide, authUser]);

  const resolved = useMemo(
    () =>
      inviterSide
        ? resolveLinkInviteCreateCategories(inviterSide, intendedType)
        : { categories: [] as string[], error: undefined, requiresManualPick: false },
    [inviterSide, intendedType],
  );

  const formTargetKey = `link:${resolved.error ? "blocked" : "ready"}`;
  const resetKey = buildInviteFormResetKey(formTargetKey, resolved.categories);
  const [form, dispatch] = useReducer(
    inviteFormReducer,
    { resetKey, categories: resolved.categories, blockedReason: resolved.error },
    (initial) =>
      createInitialInviteFormState(initial.resetKey, initial.categories, initial.blockedReason),
  );

  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const [createdSnapshot, setCreatedSnapshot] = useState<CreatedLinkSnapshot | null>(null);
  const [shareHint, setShareHint] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [personalEditId, setPersonalEditId] = useState<string | null>(null);
  const [personalDraft, setPersonalDraft] = useState("");

  const appUrl = useMemo(() => getAppUrl(), []);

  const inviterName = useMemo(
    () => authUser?.displayName?.trim() || "RemCard PROF",
    [authUser],
  );

  const inviterType = authUser?.partnerType ?? null;

  const listCopyContext = useMemo(
    () => ({
      listMode: "v2" as const,
      resurfaceEnabled: list?.resurfaceEnabled ?? false,
    }),
    [list],
  );

  const reloadList = useCallback(async () => {
    setListError("");
    try {
      const payload = await fetchLinkInviteList();
      setList(payload.list);
      if (payload.inviterSide) setApiInviterSide(payload.inviterSide);
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setListLoading(true);
      try {
        const [me, payload] = await Promise.all([
          remcardFetch<AuthMeResponse>("/api/auth/me"),
          fetchLinkInviteList(),
        ]);
        if (cancelled) return;
        setAuthUser(me.user);
        setList(payload.list);
        if (payload.inviterSide) setApiInviterSide(payload.inviterSide);
      } catch (caught) {
        if (!cancelled) {
          setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить данные");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, formTargetKey),
      blockedReason: resolved.error,
    });
  }, [resetKey, resolved.error, formTargetKey]);

  function resetCreateForm() {
    setStep(1);
    setRecipientName("");
    setIntendedType("");
    setTone("short");
    dispatch({ type: "set_note", note: "" });
    dispatch({ type: "set_error", error: "" });
    setCreatedSnapshot(null);
    setShareHint("");
  }

  async function createLink() {
    if (createInFlight.current || creating || !inviterSide) return;
    if (!recipientName.trim() || !form.note.trim() || !intendedType) return;
    if (resolved.error) {
      dispatch({ type: "set_error", error: resolved.error });
      return;
    }
    const activeRows = activeInviteRows(form);
    const validationError = validateInviteRows(activeRows);
    if (validationError) {
      dispatch({ type: "set_error", error: validationError });
      return;
    }
    if (form.useGeneralFallback && !form.generalConfirmed) {
      dispatch({
        type: "set_error",
        error: `Подтвердите общие условия: «${categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» — ${DEFAULT_GENERAL_PERCENT}%`,
      });
      return;
    }

    const submitted = {
      recipientLabel: recipientName.trim(),
      intendedPartnerType: intendedType,
      note: form.note.trim(),
      terms: inviteRowsToTerms(activeRows).map((term) => ({
        ...term,
        categoryLabel: categoryLabel(term.category),
      })),
    };

    createInFlight.current = true;
    setCreating(true);
    dispatch({ type: "set_error", error: "" });
    try {
      const result = await remcardFetch<{ token: string; expiresAt: string; previewPath: string }>(
        "/api/partnership/link-invite",
        {
          method: "POST",
          body: {
            intendedPartnerType: submitted.intendedPartnerType,
            note: submitted.note || null,
            terms: submitted.terms,
            recipientLabel: submitted.recipientLabel || null,
          },
        },
      );
      const url = `${appUrl}${result.previewPath}`;
      setCreatedSnapshot({
        url,
        expiresAt: result.expiresAt,
        recipientLabel: submitted.recipientLabel,
        shareText: `${submitted.note}\n\n${url}`,
      });
      setScreen("share");
      await reloadList();
    } catch (caught) {
      dispatch({
        type: "set_error",
        error: caught instanceof RemcardApiError ? caught.message : "Не удалось создать ссылку",
      });
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }

  async function revokeInvite(id: string) {
    setRevoking(true);
    try {
      await remcardFetch(`/api/partnership/link-invite/${id}`, { method: "DELETE" });
      setRevokeId(null);
      await reloadList();
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать");
    } finally {
      setRevoking(false);
    }
  }

  async function savePersonalLabel(invite: LinkInviteListRow) {
    const trimmed = personalDraft.trim();
    try {
      const result = await remcardFetch<{ ok: boolean; personalLabel: string | null }>(
        `/api/partnership/link-invite/${invite.id}`,
        { method: "PATCH", body: { personalLabel: trimmed || null } },
      );
      setList((prev) => {
        if (!prev) return prev;
        const patchRow = (row: LinkInviteListRow) =>
          row.id === invite.id ? { ...row, personalLabel: result.personalLabel } : row;
        return {
          ...prev,
          active: { ...prev.active, items: prev.active.items.map(patchRow) },
          archive: { ...prev.archive, items: prev.archive.items.map(patchRow) },
        };
      });
      setPersonalEditId(null);
      setPersonalDraft("");
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить название");
    }
  }

  const activeItems = list?.active.items ?? [];
  const archiveItems = list?.archive.items ?? [];
  const visibleItems = listTab === "active" ? activeItems : archiveItems;

  if (screen === "share" && createdSnapshot) {
    return (
      <MiniAppSubpage
        title="Теперь передайте приглашение"
        lead="Сообщение само не отправляется — вы передаёте его сами."
        onBack={() => {
          setScreen("list");
          resetCreateForm();
        }}
      >
        <p className={styles.footnote}>
          {createdSnapshot.expiresAt.startsWith("2099")
            ? "Активна до принятия или отзыва"
            : `Действует до ${formatInviteListDate(createdSnapshot.expiresAt)}`}
        </p>
        <label className={styles.fieldLabel} htmlFor="mini-invite-share-text">
          Готовый текст
        </label>
        <textarea
          id="mini-invite-share-text"
          className={styles.miniTextarea}
          readOnly
          value={createdSnapshot.shareText}
          data-testid="mini-invite-share-text"
        />
        <label className={styles.fieldLabel} htmlFor="mini-invite-created-url">
          Ссылка
        </label>
        <input
          id="mini-invite-created-url"
          className={styles.readOnlyField}
          readOnly
          value={createdSnapshot.url}
          data-testid="mini-invite-created-url"
        />
        <button
          type="button"
          className={styles.primaryBtn}
          data-testid="mini-invite-share-btn"
          onClick={() => {
            const text = createdSnapshot.shareText;
            if (navigator.share) {
              void navigator.share({ title: "Приглашение RemCard PROF", text, url: createdSnapshot.url });
            }
          }}
        >
          Поделиться приглашением
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          data-testid="mini-invite-copy-message"
          onClick={() => void navigator.clipboard.writeText(createdSnapshot.shareText).then(() => setShareHint("Скопировано"))}
        >
          <MiniIconCopy />
          Скопировать текст
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          data-testid="mini-invite-copy-link"
          onClick={() => void navigator.clipboard.writeText(createdSnapshot.url).then(() => setShareHint("Ссылка скопирована"))}
        >
          <MiniIconCopy />
          Скопировать ссылку
        </button>
        {shareHint ? <p className={styles.scanNotice}>{shareHint}</p> : null}
        <button type="button" className={styles.secondaryBtn} onClick={() => setScreen("list")}>
          К списку приглашений
        </button>
      </MiniAppSubpage>
    );
  }

  if (screen === "create") {
    const stepTitle =
      step === 1 ? "Кого хотите пригласить?" : step === 2 ? "Что напишем партнёру?" : "Проверьте приглашение";
    return (
      <MiniAppSubpage
        title="Создать приглашение"
        lead={`Шаг ${step} из 3 · ${stepTitle}`}
        onBack={() => {
          setScreen("list");
          resetCreateForm();
        }}
      >
        <ol className={styles.inviteSteps} aria-label={`Шаг ${step} из 3`}>
          {["Партнёр", "Сообщение", "Проверка"].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-complete={step > index + 1}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 1 ? (
          <>
            <p className={styles.footnote}>Укажите, кому отправите ссылку на сотрудничество. Контакты пока не нужны.</p>
            <label className={styles.fieldLabel} htmlFor="mini-invite-recipient">
              Имя или название партнёра
            </label>
            <input
              id="mini-invite-recipient"
              className={styles.readOnlyField}
              value={recipientName}
              maxLength={80}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <label className={styles.fieldLabel} htmlFor="mini-invite-intended">
              Предполагаемый тип партнёра
            </label>
            <select
              id="mini-invite-intended"
              className={styles.miniSelect}
              value={intendedType}
              disabled={creating}
              onChange={(e) => setIntendedType(e.target.value as MiniIntendedType)}
            >
              <option value="">Выберите тип</option>
              {MINI_INTENDED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className={styles.inviteTemplates} role="group" aria-label="Варианты приглашения">
              {(
                [
                  ["short", "Коротко"],
                  ["business", "По-деловому"],
                  ["friendly", "По-дружески"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  className={tone === kind ? styles.inviteTemplateActive : styles.inviteTemplateBtn}
                  aria-pressed={tone === kind}
                  onClick={() => {
                    setTone(kind);
                    dispatch({ type: "set_note", note: inviteWizardTemplate(kind, recipientName) });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className={styles.fieldLabel} htmlFor="mini-invite-note">
              Текст приглашения
            </label>
            <textarea
              id="mini-invite-note"
              className={styles.miniTextarea}
              maxLength={400}
              value={form.note}
              onChange={(e) => dispatch({ type: "set_note", note: e.target.value })}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className={styles.inviteReview}>
              <span>Кого приглашаете</span>
              <strong>{recipientName}</strong>
              <small>{MINI_INTENDED_OPTIONS.find((o) => o.value === intendedType)?.label}</small>
              <button type="button" className={styles.ghostBtn} onClick={() => setStep(1)}>
                Изменить имя партнёра
              </button>
            </div>
            <div className={styles.inviteReview}>
              <span>Пригласительное сообщение</span>
              <p>{form.note}</p>
              <button type="button" className={styles.ghostBtn} onClick={() => setStep(2)}>
                Изменить сообщение
              </button>
            </div>
            <p className={styles.footnote}>
              Создание ссылки не активирует сотрудничество автоматически. После входа партнёр увидит указанные
              условия и сможет принять их. Новая ссылка активна до первого принятия или отзыва; условия фиксируются при
              создании.
            </p>
            <details open className={styles.inviteTermsBlock}>
              <summary>
                {resolved.categories.length > 0
                  ? `Условия сотрудничества · ${resolved.categories.length} направления`
                  : "Условия сотрудничества"}
              </summary>
              <p className={styles.footnote}>
                Общий процент по категории — это условие между вами и партнёром. При рекомендации клиенту часть идёт на
                скидку, остальное — ваше вознаграждение PROF.
              </p>
              {resolved.error ? (
                <p className={styles.scanBad} role="alert" data-testid="link-invite-terms-blocked">
                  {resolved.error}
                </p>
              ) : null}
              {!resolved.error && form.useGeneralFallback ? (
                <label className={styles.miniCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={form.generalConfirmed}
                    onChange={(e) =>
                      dispatch({ type: "set_general_confirmed", generalConfirmed: e.target.checked })
                    }
                  />
                  <span>
                    Подтверждаю общие условия {DEFAULT_GENERAL_PERCENT}% — «
                    {categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}»
                  </span>
                </label>
              ) : null}
              {!resolved.error && form.rows.length > 0
                ? form.rows.map((row, index) => (
                    <div key={row.category} className={styles.inviteTermRow} data-testid={`link-invite-category-${row.category}`}>
                      <strong>{categoryLabel(row.category)}</strong>
                      <label className={styles.miniCheckboxRow}>
                        <input
                          type="checkbox"
                          checked={row.excluded}
                          onChange={(e) =>
                            dispatch({ type: "set_excluded", index, excluded: e.target.checked })
                          }
                        />
                        Исключить
                      </label>
                      {!row.excluded ? (
                        <label className={styles.fieldLabel}>
                          Общий процент по категории
                          <input
                            className={styles.readOnlyField}
                            type="number"
                            min={0}
                            max={100}
                            value={row.percent}
                            onChange={(e) => dispatch({ type: "set_percent", index, percent: e.target.value })}
                          />
                        </label>
                      ) : null}
                    </div>
                  ))
                : null}
            </details>
          </>
        ) : null}

        {form.error ? (
          <p className={styles.scanBad} role="alert">
            {form.error}
          </p>
        ) : null}

        <div className={styles.inviteWizardActions}>
          {step > 1 ? (
            <button type="button" className={styles.secondaryBtn} disabled={creating} onClick={() => setStep(step - 1)}>
              Назад
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={step === 1 ? !recipientName.trim() || !intendedType : !form.note.trim()}
              onClick={() => {
                if (step === 1 && !form.note.trim()) {
                  dispatch({ type: "set_note", note: inviteWizardTemplate(tone, recipientName) });
                }
                setStep(step + 1);
              }}
            >
              {step === 1 ? "Далее: сообщение" : "Далее: проверить"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={
                creating ||
                Boolean(resolved.error) ||
                (form.rows.length === 0 && !form.useGeneralFallback && Boolean(intendedType))
              }
              data-testid="mini-invite-create-submit"
              onClick={() => void createLink()}
            >
              {creating ? "Создаём…" : "Создать приглашение"}
            </button>
          )}
        </div>
      </MiniAppSubpage>
    );
  }

  return (
    <MiniAppSubpage
      title="Пригласить партнёра"
      lead="Ваши ссылки-приглашения. Ссылку отправляете вы сами — мини-приложение не рассылает сообщения."
      onBack={onBack}
    >
      {listLoading ? <p>Загрузка…</p> : null}
      {listError ? (
        <p className={styles.scanBad} role="alert">
          {listError}
        </p>
      ) : null}

      <div className={styles.inviteTabs} role="tablist" aria-label="Ссылки-приглашения">
        <button
          type="button"
          role="tab"
          aria-selected={listTab === "active"}
          className={listTab === "active" ? styles.inviteTabActive : styles.inviteTab}
          data-testid="mini-invite-tab-active"
          onClick={() => setListTab("active")}
        >
          Активные
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === "archive"}
          className={listTab === "archive" ? styles.inviteTabActive : styles.inviteTab}
          data-testid="mini-invite-tab-archive"
          onClick={() => setListTab("archive")}
        >
          Архив
        </button>
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        data-testid="mini-invite-start-create"
        onClick={() => {
          resetCreateForm();
          setScreen("create");
        }}
      >
        Создать приглашение
      </button>

      <div className={styles.inviteList}>
        {visibleItems.length === 0 && !listLoading ? (
          <p className={styles.footnote}>{listTab === "active" ? "Нет активных ссылок." : "Архив пуст."}</p>
        ) : null}
        {visibleItems.map((invite) => {
          const absoluteUrl = inviteAbsoluteUrl(invite.previewPath, appUrl);
          const canCopy = listTab === "active" && inviteRowAllowsPublicCopy(invite, listCopyContext);
          const copyText =
            canCopy && absoluteUrl
              ? formatLinkInviteCopyText({
                  invite,
                  url: absoluteUrl,
                  inviterName,
                  inviterType: inviterType ?? undefined,
                })
              : "";
          return (
            <article key={invite.id} className={styles.inviteCard} data-testid={`mini-invite-row-${invite.id}`}>
              <h3 className={styles.inviteCardTitle}>{linkInviteCardTitle(invite)}</h3>
              <p className={styles.inviteCardMeta}>
                {invite.statusLabel}
                {linkInviteIntendedLabel(invite.intendedPartnerType)
                  ? ` · ${linkInviteIntendedLabel(invite.intendedPartnerType)}`
                  : ""}
              </p>
              <p className={styles.footnote}>
                Условия: {participatingTermCount(invite)} · {formatInviteListDate(invite.createdAt)}
              </p>
              {listTab === "active" ? (
                <>
                  <details className={styles.inviteTermsBlock}>
                    <summary>Условия</summary>
                    <ul className={styles.inviteTermsList}>
                      {invite.terms.map((t) => (
                        <li key={t.category}>
                          {t.categoryLabel}: {t.isExcluded ? "не участвует" : `${t.storePercent}%`}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {invite.canEditPersonalLabel ? (
                    personalEditId === invite.id ? (
                      <div className={styles.invitePersonalEdit}>
                        <label className={styles.fieldLabel}>Частное название</label>
                        <input
                          className={styles.readOnlyField}
                          value={personalDraft}
                          onChange={(e) => setPersonalDraft(e.target.value)}
                          data-testid="mini-invite-personal-input"
                        />
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => void savePersonalLabel(invite)}
                        >
                          Сохранить
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => {
                          setPersonalEditId(invite.id);
                          setPersonalDraft(invite.personalLabel?.trim() ?? "");
                        }}
                      >
                        Частное название
                      </button>
                    )
                  ) : null}
                  {canCopy ? (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      data-testid="mini-invite-copy-text"
                      onClick={() => void navigator.clipboard.writeText(copyText)}
                    >
                      <MiniIconCopy />
                      Копировать текст со ссылкой
                    </button>
                  ) : null}
                  {invite.status === "PENDING" ? (
                    <>
                      {revokeId === invite.id ? (
                        <div className={styles.inviteRevokeConfirm}>
                          <p>Отозвать приглашение?</p>
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            data-testid="mini-invite-revoke-confirm"
                            disabled={revoking}
                            onClick={() => void revokeInvite(invite.id)}
                          >
                            {revoking ? "Отзываем…" : "Да, отозвать"}
                          </button>
                          <button type="button" className={styles.secondaryBtn} onClick={() => setRevokeId(null)}>
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          data-testid="mini-invite-revoke"
                          onClick={() => setRevokeId(invite.id)}
                        >
                          Отозвать
                        </button>
                      )}
                    </>
                  ) : null}
                </>
              ) : (
                <p className={styles.footnote} data-testid="mini-invite-archive-readonly">
                  История принятия — без копирования и отзыва.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </MiniAppSubpage>
  );
}
