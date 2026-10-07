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
};

type IntendedType = "" | "MASTER" | "STORE" | "COMPANY";

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

export function PartnerLinkInvitePanel({ meProfile }: PartnerLinkInvitePanelProps) {
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const needsIntendedType =
    inviterSide.partnerType === "MASTER" || inviterSide.partnerType === "COMPANY";
  const [intendedType, setIntendedType] = useState<IntendedType>("");
  const resolved = useMemo(
    () => resolveLinkInviteCreateCategories(inviterSide, intendedType),
    [inviterSide, intendedType],
  );
  const resetKey = buildInviteFormResetKey(`link:${intendedType}`, resolved.categories);

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
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, `link:${intendedType}`),
      blockedReason: resolved.error,
    });
  }, [resetKey, resolved.error, intendedType]);

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
    dispatch({ type: "set_error", error: "" });
    setShareHint("");

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
          intendedPartnerType: needsIntendedType ? intendedType || null : null,
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

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setShareHint("Ссылка скопирована");
  }

  async function shareUrl(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Приглашение RemCard PROF", url });
        setShareHint("Готово");
        return;
      } catch {
        // fallback to copy
      }
    }
    await copyUrl(url);
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
    <div className={styles.linkPanel}>
      <Panel
        title="Пригласить по ссылке"
        hint="Ссылка действует 14 дней и рассчитана на одного будущего партнёра. Условия фиксируются при создании."
      >
        {needsIntendedType ? (
          <label className={styles.roleField}>
            <span>Предполагаемый тип партнёра</span>
            <select
              value={intendedType}
              onChange={(event) => setIntendedType(event.target.value as IntendedType)}
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
              <div key={row.category} className={styles.termRow}>
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

        <TextAreaField
          label="Комментарий или исключения"
          value={form.note}
          onChange={(event) => dispatch({ type: "set_note", note: event.target.value })}
          hint="Необязательно. Получатель увидит этот текст на странице приглашения."
        />

        {previewTerms.length > 0 ? (
          <div className={styles.notice}>
            <p><strong>Предпросмотр для получателя</strong></p>
            <ul>
              {previewTerms.map((row) => (
                <li key={row.category}>
                  {categoryLabel(row.category)}: {row.excluded ? "исключено" : `${row.percent}%`}
                </li>
              ))}
            </ul>
            {form.note.trim() ? <p>Комментарий: {form.note.trim()}</p> : null}
            <p>Срок действия ссылки: 14 дней после создания.</p>
          </div>
        ) : null}

        {form.error ? (
          <p className={styles.error} role="alert">
            {form.error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button disabled={creating || Boolean(resolved.error)} onClick={() => void createLink()}>
            {creating ? "Создаём…" : "Создать ссылку"}
          </Button>
        </div>

        {createdUrl ? (
          <div className={styles.notice}>
            <p><strong>Ссылка создана</strong></p>
            <p>Действует до {createdExpires ? formatExpiry(createdExpires) : "—"}</p>
            <TextField label="Ссылка" value={createdUrl} readOnly />
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void copyUrl(createdUrl)}>
                Скопировать ссылку
              </Button>
              <Button variant="secondary" onClick={() => void shareUrl(createdUrl)}>
                Поделиться
              </Button>
            </div>
            {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
          </div>
        ) : null}
      </Panel>

      <Panel title="Ваши ссылки-приглашения" hint="Отозванные и использованные ссылки нельзя восстановить.">
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
                    {invite.intendedPartnerType ? ` · ${invite.intendedPartnerType}` : ""}
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
      </Panel>
    </div>
  );
}
