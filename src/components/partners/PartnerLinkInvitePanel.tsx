"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
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
import { buildInviteShareMessage } from "@/lib/invite-presentation";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  DEFAULT_GENERAL_PERCENT,
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  profileUserToPartnerSide,
  resolveLinkInviteCreateCategories,
  validateInviteRows,
} from "@/lib/partnership-rules";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";
import wizardStyles from "./PartnerLinkInviteWizard.module.css";

type LinkInviteRow = {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  intendedPartnerType: string | null;
  note: string | null;
  partnershipId: string | null;
  terms: { category: string; categoryLabel: string; storePercent: number; isExcluded: boolean }[];
};

type PartnerLinkInvitePanelProps = {
  meProfile: ProProfileResponse;
  /** When the hub modal already shows the title, omit the inner section heading. */
  showSectionTitle?: boolean;
  wizard?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
  onAnotherWay?: () => void;
};

type IntendedType = "" | "AGENT" | "MASTER" | "STORE" | "COMPANY";

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

const INTENDED_OPTIONS: { value: IntendedType; label: string }[] = [
  { value: "AGENT", label: "Агент" },
  { value: "MASTER", label: "Специалист" },
  { value: "STORE", label: "Магазин" },
  { value: "COMPANY", label: "Компания" },
];

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PartnerLinkInvitePanel({
  meProfile,
  showSectionTitle = true,
  wizard = false,
  onDirtyChange,
  onReadyChange,
  onAnotherWay,
}: PartnerLinkInvitePanelProps) {
  const [step, setStep] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [tone, setTone] = useState("short");
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const [intendedType, setIntendedType] = useState<IntendedType>("");
  const resolved = useMemo(
    () => resolveLinkInviteCreateCategories(inviterSide, intendedType),
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
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdExpires, setCreatedExpires] = useState<string | null>(null);
  const [invites, setInvites] = useState<LinkInviteRow[]>([]);
  const [listError, setListError] = useState("");
  const [shareHint, setShareHint] = useState("");
  useEffect(() => {
    onDirtyChange?.(!createdUrl && Boolean(recipientName.trim() || intendedType || form.note.trim()));
    onReadyChange?.(Boolean(createdUrl));
  }, [createdUrl, recipientName, intendedType, form.note, onDirtyChange, onReadyChange]);
  useEffect(() => () => { onDirtyChange?.(false); onReadyChange?.(false); }, [onDirtyChange, onReadyChange]);

  function template(kind: string) {
    const name = recipientName.trim();
    if (kind === "business") return `Здравствуйте, ${name}! Предлагаем сотрудничество в RemCard: рекомендовать наши товары и услуги клиентам и развивать партнёрство. Посмотрите предложение по ссылке и обсудим детали.`;
    if (kind === "friendly") return `Привет, ${name}! Давайте помогать друг другу находить новых клиентов. Приглашаю в RemCard: по ссылке можно посмотреть предложение и обсудить сотрудничество.`;
    return `Здравствуйте, ${name}! Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов. Приглашаю к сотрудничеству в RemCard.`;
  }

  useEffect(() => {
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, formTargetKey),
      blockedReason: resolved.error,
    });
  }, [resetKey, resolved.error, formTargetKey]);

  const loadInvites = useCallback(async () => {
    setListError("");
    try {
      const data = await remcardFetch<{ invites: LinkInviteRow[] }>("/api/partnership/link-invite");
      setInvites(data.invites ?? []);
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить ссылки");
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function createLink() {
    if (creating) return;
    if (wizard && (step !== 3 || !recipientName.trim() || !form.note.trim())) return;
    dispatch({ type: "set_error", error: "" });
    setShareHint("");

    if (!intendedType) {
      dispatch({ type: "set_error", error: "Укажите предполагаемый тип партнёра" });
      return;
    }
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

    setCreating(true);
    try {
      const result = await remcardFetch<{
        token: string;
        expiresAt: string;
        previewPath: string;
      }>("/api/partnership/link-invite", {
        method: "POST",
        body: {
          intendedPartnerType: intendedType,
          note: form.note.trim() || null,
          terms: inviteRowsToTerms(activeRows).map((term) => ({
            ...term,
            categoryLabel: categoryLabel(term.category),
          })),
        },
      });
      const url = `${getAppUrl()}${result.previewPath}`;
      setCreatedUrl(url);
      setCreatedExpires(result.expiresAt);
      await loadInvites();
    } catch (caught) {
      dispatch({
        type: "set_error",
        error: caught instanceof RemcardApiError ? caught.message : "Не удалось создать ссылку",
      });
    } finally {
      setCreating(false);
    }
  }

  function inviterShareName() {
    return (
      meProfile.organization?.name?.trim() ||
      meProfile.user.displayName?.trim() ||
      "RemCard PROF"
    );
  }

  function inviteShareText(url: string) {
    if (wizard && form.note.trim()) return `${form.note.trim()}\n\n${url}`;
    return buildInviteShareMessage({
      inviterName: inviterShareName(),
      url,
      inviterType: meProfile.user.partnerType,
      intendedType: intendedType || null,
    });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("Ссылка скопирована");
    } catch {
      setShareHint("Скопируйте ссылку вручную из поля ниже");
    }
  }

  async function copyInviteMessage(url: string) {
    try {
      await navigator.clipboard.writeText(inviteShareText(url));
      setShareHint("Текст приглашения скопирован");
    } catch {
      setShareHint("Скопируйте текст приглашения вручную из поля ниже");
    }
  }

  async function shareUrl(url: string) {
    const text = inviteShareText(url);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Приглашение RemCard PROF", text, url });
        setShareHint("Готово");
        return;
      } catch {
        // fallback to copy
      }
    }
    await copyInviteMessage(url);
  }

  async function revokeInvite(id: string) {
    try {
      await remcardFetch(`/api/partnership/link-invite/${id}`, { method: "DELETE" });
      await loadInvites();
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать");
    }
  }

  const previewTerms = activeInviteRows(form);

  return (
    <div className={`${styles.linkPanel} ${wizard ? wizardStyles.wizard : ""}`} data-testid={wizard ? "partner-link-invite-wizard" : undefined}>
      <Panel
        title={showSectionTitle ? "Пригласить партнёра" : undefined}
        className={wizard ? wizardStyles.paper : undefined}
        hint={wizard ? undefined : "Для знакомого, которого ещё нет на платформе. Он пройдёт обычную регистрацию и увидит ваше предложение сотрудничества."}
      >
        {wizard && !createdUrl ? <>
          <ol className={wizardStyles.steps} aria-label={`Шаг ${step} из 3`}>
            {["Партнёр", "Сообщение", "Проверка"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-complete={step > index + 1}><span>{index + 1}</span>{label}</li>)}
          </ol>
          <p className={wizardStyles.eyebrow}>Шаг {step} из 3</p>
          <h3 className={wizardStyles.title}>{step === 1 ? "Кого хотите пригласить?" : step === 2 ? "Что напишем партнёру?" : "Проверьте приглашение"}</h3>
          {step === 1 ? <><p className={styles.hint}>Укажите, кому отправите ссылку на сотрудничество. Контакты пока не нужны.</p>
            <TextField label="Имя или название партнёра" value={recipientName} maxLength={80} required
              onChange={event => setRecipientName(event.target.value)} /></> : null}
          {step === 3 ? <>
            <div className={wizardStyles.review}>
              <div><span>Кого приглашаете</span><strong>{recipientName}</strong><small>{INTENDED_OPTIONS.find(option => option.value === intendedType)?.label}</small></div>
              <Button variant="secondary" onClick={() => setStep(1)}>Изменить имя партнёра</Button>
            </div>
            <div className={wizardStyles.review}>
              <div><span>Пригласительное сообщение</span><p>{form.note}</p></div>
              <Button variant="secondary" onClick={() => setStep(2)}>Изменить сообщение</Button>
            </div>
          </> : null}
        </> : null}
        {(!wizard || (step === 3 && !createdUrl)) ? (
        <p className={styles.hint}>
          Создание ссылки не подключает партнёрскую программу и не согласует условия автоматически — это
          приглашение к обсуждению. Ссылка действует 14 дней; условия фиксируются при создании.
        </p>
        ) : null}
        {(!wizard || (step === 1 && !createdUrl)) ? (
          <label className={styles.roleField}>
            <span>Предполагаемый тип партнёра</span>
            <select
              value={intendedType}
              disabled={creating}
              onChange={(event) => {
                setIntendedType(event.target.value as IntendedType);
                setCreatedUrl(null);
                setCreatedExpires(null);
                setShareHint("");
              }}
            >
              <option value="">Выберите тип</option>
              {INTENDED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {(!wizard || (step === 2 && !createdUrl)) ? <>
        {wizard ? <div className={wizardStyles.templates} role="group" aria-label="Варианты приглашения">
          {[["short", "Коротко"], ["business", "По-деловому"], ["friendly", "По-дружески"]].map(([kind, label]) =>
            <button type="button" key={kind} aria-pressed={tone === kind} onClick={() => {
              setTone(kind); dispatch({ type: "set_note", note: template(kind) });
            }}>{label}</button>)}
        </div> : null}
        {wizard ? <TextAreaField label="Текст приглашения" maxLength={400} required value={form.note}
          onChange={event => dispatch({ type: "set_note", note: event.target.value })} /> : null}
        </> : null}
        {(!wizard || (step === 3 && !createdUrl)) ? <>
        <details open className={wizardStyles.terms}>
          <summary>Условия сотрудничества · {resolved.categories.length || 1} {resolved.categories.length === 1 ? "направление" : "направления"}</summary>
        <p className={styles.hint}>
          Общий процент по категории — это условие между вами и партнёром. При рекомендации клиенту
          часть идёт на скидку, остальное — ваше вознаграждение PROF.
        </p>

        {!resolved.error && resolved.categories.length === 0 && !form.useGeneralFallback ? (
          <p className={styles.hint}>Выберите тип партнёра, чтобы указать категории.</p>
        ) : null}

        {!resolved.error && form.useGeneralFallback ? (
          <div className={styles.notice}>
            <p>
              Категории не заполнены. Можно создать ссылку с «{categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}»
              — {DEFAULT_GENERAL_PERCENT}%.
            </p>
            <label className={styles.confirmRow}>
              <input
                type="checkbox"
                checked={form.generalConfirmed}
                onChange={(event) =>
                  dispatch({ type: "set_general_confirmed", generalConfirmed: event.target.checked })
                }
              />
              <span>Подтверждаю общие условия {DEFAULT_GENERAL_PERCENT}%</span>
            </label>
          </div>
        ) : null}

        {!resolved.error && form.rows.length > 0 ? (
          <div className={styles.termsList}>
            {form.rows.map((row, index) => (
              <div key={row.category} className={styles.termRow} data-testid={`link-invite-category-${row.category}`}>
                <div className={styles.termHeader}>
                  <strong>{categoryLabel(row.category)}</strong>
                  <label className={styles.exclude}>
                    <input
                      type="checkbox"
                      checked={row.excluded}
                      onChange={(event) =>
                        dispatch({
                          type: "set_excluded",
                          index,
                          excluded: event.target.checked,
                        })
                      }
                    />
                    Исключить
                  </label>
                </div>
                {!row.excluded ? (
                  <TextField
                    label="Общий процент по категории"
                    type="number"
                    min={0}
                    max={100}
                    value={row.percent}
                    onChange={(event) =>
                      dispatch({ type: "set_percent", index, percent: event.target.value })
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        </details>
        {!wizard ? <TextAreaField
          label="Комментарий или исключения"
          value={form.note}
          onChange={(event) => dispatch({ type: "set_note", note: event.target.value })}
          hint="Необязательно. Получатель увидит этот текст на странице приглашения."
        /> : null}
        </> : null}

        {previewTerms.length > 0 && (!wizard || (step === 3 && !createdUrl)) ? (
          <div className={styles.notice}>
            <p><strong>Предпросмотр для получателя</strong></p>
            <ul>
              {previewTerms.map((row) => (
                <li key={row.category}>
                  {categoryLabel(row.category)}: {row.excluded ? "исключено" : `${row.percent}%`}
                </li>
              ))}
            </ul>
            {!wizard && form.note.trim() ? <p>Комментарий: {form.note.trim()}</p> : null}
            <p>Срок действия ссылки: 14 дней после создания.</p>
          </div>
        ) : null}

        {form.error ? (
          <p className={styles.error} role="alert">
            {form.error}
          </p>
        ) : null}

        {!createdUrl || !wizard ? <div className={styles.actions}>
          {wizard && step > 1 ? <Button variant="secondary" disabled={creating} onClick={() => setStep(step - 1)}>Назад</Button> : null}
          {wizard && step === 1 && onAnotherWay ? <Button variant="secondary" onClick={onAnotherWay}>Другой способ</Button> : null}
          {wizard && step < 3 ? <Button disabled={step === 1 ? !recipientName.trim() || !intendedType : !form.note.trim()}
            onClick={() => {
              if (step === 1 && !form.note.trim()) dispatch({ type: "set_note", note: template(tone) });
              setStep(step + 1);
            }}>{step === 1 ? "Далее: сообщение" : "Далее: проверить"}</Button> : (
          <Button disabled={creating || Boolean(resolved.error)} onClick={() => void createLink()}>
            {creating ? "Создаём…" : wizard ? "Создать приглашение" : "Создать ссылку"}
          </Button>
          )}
        </div> : null}

        {createdUrl ? (
          <div className={styles.notice} data-testid="link-invite-created">
            <p><strong>{wizard ? "Приглашение готово" : "Ссылка создана"}</strong></p>
            <p>Действует до {createdExpires ? formatExpiry(createdExpires) : "—"}</p>
            <TextField
              label="Ссылка"
              value={createdUrl}
              readOnly
              data-testid="link-invite-created-url"
            />
            {wizard ? <TextAreaField label="Текст для отправки" value={inviteShareText(createdUrl)} readOnly /> : null}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void copyUrl(createdUrl)}>
                Скопировать ссылку
              </Button>
              <Button variant="secondary" onClick={() => void copyInviteMessage(createdUrl)}>
                Скопировать приглашение
              </Button>
              <Button variant="secondary" onClick={() => void shareUrl(createdUrl)}>
                Поделиться
              </Button>
            </div>
            {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
            {wizard ? <Button variant="secondary" onClick={() => {
              setCreatedUrl(null); setCreatedExpires(null); setRecipientName(""); setIntendedType("");
              dispatch({ type: "set_note", note: "" }); setStep(1); setShareHint("");
            }}>Создать другое приглашение</Button> : null}
          </div>
        ) : null}
      </Panel>

      {wizard ? <button type="button" className={wizardStyles.historyToggle} aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>Ваши ссылки-приглашения</button> : null}
      {!wizard || showHistory ? <Panel title="Ваши ссылки-приглашения" hint="Отозванные и использованные ссылки нельзя восстановить.">
        {listError ? (
          <p className={styles.error} role="alert">
            {listError}
          </p>
        ) : null}
        {invites.length === 0 ? (
          <p className={styles.hint}>Активных ссылок пока нет.</p>
        ) : (
          <ul className={styles.linkList}>
            {invites.map((invite) => (
              <li key={invite.id} className={styles.linkListItem}>
                <div>
                  <strong>{invite.status}</strong>
                  <span className={styles.hint}>
                    {" "}
                    · до {formatExpiry(invite.expiresAt)}
                    {invite.intendedPartnerType
                      ? ` · ${INTENDED_OPTIONS.find((option) => option.value === invite.intendedPartnerType)?.label ?? invite.intendedPartnerType}`
                      : ""}
                  </span>
                </div>
                {invite.status === "PENDING" ? (
                  <Button variant="secondary" onClick={() => void revokeInvite(invite.id)}>
                    Отозвать
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel> : null}
    </div>
  );
}
