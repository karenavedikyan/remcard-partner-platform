"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  CATALOG_STATUS_LABELS,
  catalogStatusTone,
} from "@/lib/partnership-labels";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import { storeCategoryChips } from "@/lib/store-categories";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";
import styles from "./ProfileEditor.module.css";

const PARTNER_TYPES = [
  { value: "MASTER", label: "Специалист" },
  { value: "COMPANY", label: "Компания" },
  { value: "STORE", label: "Магазин" },
] as const;

const STORE_CATEGORY_CHIPS = storeCategoryChips();

type ModerationNote = {
  id: string;
  comment: string;
  createdAt: string;
  attachments: string[];
  resolvedAt: string | null;
};

type ProfileEditorProps = {
  initial: ProProfileResponse;
  moderationSection?: boolean;
};

type ExtendedUser = ProProfileResponse["user"] & {
  telegramLinked?: boolean;
  maxLinked?: boolean;
  notificationSettings?: unknown;
};

export function ProfileEditor({ initial, moderationSection }: ProfileEditorProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const user = profile.user as ExtendedUser;

  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [description, setDescription] = useState(user.description ?? "");
  const [partnerType, setPartnerType] = useState(user.partnerType ?? "MASTER");
  const [specializations, setSpecializations] = useState<string[]>(user.specializations ?? []);
  const [storeCategories, setStoreCategories] = useState<string[]>(user.storeCategories ?? []);
  const [organizationName, setOrganizationName] = useState(profile.organization?.name ?? "");
  const [website, setWebsite] = useState(user.website ?? "");
  const [telegram, setTelegram] = useState(user.telegram ?? "");
  const [publicEmail, setPublicEmail] = useState(user.publicEmail ?? "");
  const [publicPhone, setPublicPhone] = useState(user.publicPhone ?? "");

  const [saving, setSaving] = useState(false);
  const [submittingModeration, setSubmittingModeration] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notes, setNotes] = useState<ModerationNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const canSubmitModeration =
    profile.user.catalogStatus === "DRAFT" || profile.user.catalogStatus === "NEEDS_REVISION";

  const loadNotes = useCallback(async () => {
    if (profile.user.catalogStatus === "APPROVED" && !moderationSection) return;
    setNotesLoading(true);
    try {
      const data = await remcardFetch<{ notes: ModerationNote[] }>("/api/pro/moderation-notes");
      setNotes(Array.isArray(data.notes) ? data.notes : []);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [moderationSection, profile.user.catalogStatus]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    setProfile(initial);
    const u = initial.user as ExtendedUser;
    setDisplayName(u.displayName ?? "");
    setCity(u.city ?? "");
    setDescription(u.description ?? "");
    setPartnerType(u.partnerType ?? "MASTER");
    setSpecializations(u.specializations ?? []);
    setStoreCategories(u.storeCategories ?? []);
    setOrganizationName(initial.organization?.name ?? "");
    setWebsite(u.website ?? "");
    setTelegram(u.telegram ?? "");
    setPublicEmail(u.publicEmail ?? "");
    setPublicPhone(u.publicPhone ?? "");
  }, [initial]);

  const openNotes = useMemo(
    () => notes.filter((n) => !n.resolvedAt).slice(0, 3),
    [notes],
  );

  function toggleSpec(id: string) {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleCategory(value: string) {
    setStoreCategories((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const trimmedName = displayName.trim();
      const payload = await remcardFetch<{ user: ProProfileResponse["user"] }>(
        "/api/pro/profile",
        {
          method: "PATCH",
          body: {
            city: city.trim() || null,
            description: description.trim() || null,
            partnerType,
            specializations: partnerType === "MASTER" ? specializations : undefined,
            storeCategories:
              partnerType === "STORE" || partnerType === "COMPANY" ? storeCategories : undefined,
            website: website.trim() || null,
            telegram: telegram.trim() || null,
            publicEmail: publicEmail.trim() || null,
            publicPhone: publicPhone.trim() || null,
          },
        },
      );

      if (trimmedName.length >= 2 && trimmedName !== "Пользователь") {
        if (trimmedName !== (profile.user.displayName ?? "").trim()) {
          await saveDisplayNameViaAuthMe(trimmedName);
        }
      }

      if (
        (partnerType === "STORE" || partnerType === "COMPANY") &&
        organizationName.trim().length >= 2
      ) {
        try {
          await remcardFetch("/api/pro/organization", {
            method: profile.organization ? "PATCH" : "POST",
            body: profile.organization
              ? { name: organizationName.trim() }
              : { name: organizationName.trim(), partnerType },
          });
        } catch (orgErr) {
          if (!(orgErr instanceof RemcardApiError && orgErr.status === 409)) {
            throw orgErr;
          }
        }
      }

      setProfile((prev) => ({
        ...prev,
        user: { ...payload.user, displayName: trimmedName || payload.user.displayName },
      }));
      setSuccess("Изменения сохранены");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  async function persistProfileFields(): Promise<void> {
    const trimmedName = displayName.trim();
    if (trimmedName.length >= 2 && trimmedName !== "Пользователь") {
      if (trimmedName !== (profile.user.displayName ?? "").trim()) {
        await saveDisplayNameViaAuthMe(trimmedName);
      }
    }
    await remcardFetch<{ user: ProProfileResponse["user"] }>("/api/pro/profile", {
      method: "PATCH",
      body: {
        city: city.trim() || null,
        description: description.trim() || null,
        partnerType,
        specializations: partnerType === "MASTER" ? specializations : undefined,
        storeCategories:
          partnerType === "STORE" || partnerType === "COMPANY" ? storeCategories : undefined,
        website: website.trim() || null,
        telegram: telegram.trim() || null,
        publicEmail: publicEmail.trim() || null,
        publicPhone: publicPhone.trim() || null,
      },
    });
    if (
      (partnerType === "STORE" || partnerType === "COMPANY") &&
      organizationName.trim().length >= 2
    ) {
      try {
        await remcardFetch("/api/pro/organization", {
          method: profile.organization ? "PATCH" : "POST",
          body: profile.organization
            ? { name: organizationName.trim() }
            : { name: organizationName.trim(), partnerType },
        });
      } catch (orgErr) {
        if (!(orgErr instanceof RemcardApiError && orgErr.status === 409)) {
          throw orgErr;
        }
      }
    }
  }

  async function submitForModeration() {
    setSubmittingModeration(true);
    setError("");
    setSuccess("");
    try {
      await persistProfileFields();
      const payload = await remcardFetch<{ user: ProProfileResponse["user"] }>(
        "/api/pro/profile",
        {
          method: "PATCH",
          body: { action: "submitForModeration" },
        },
      );
      setProfile((prev) => ({ ...prev, user: payload.user }));
      setSuccess(
        profile.user.catalogStatus === "NEEDS_REVISION"
          ? "Профиль сохранён и отправлен на повторную проверку"
          : "Профиль отправлен на проверку",
      );
      void loadNotes();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось отправить профиль на проверку",
      );
    } finally {
      setSubmittingModeration(false);
    }
  }

  const statusLabel =
    CATALOG_STATUS_LABELS[profile.user.catalogStatus] ?? profile.user.catalogStatus;

  const showRevisionBanner = profile.user.catalogStatus === "NEEDS_REVISION";

  return (
    <div className={styles.grid} id={moderationSection ? "moderation-remarks" : undefined}>
      <form className={styles.main} onSubmit={saveProfile}>
        {showRevisionBanner ? (
          <div className={styles.bannerWarn} role="status">
            <strong>Нужно исправить профиль</strong>
            <p>
              Внесите правки по замечаниям модератора, нажмите «Сохранить изменения», затем
              «Сохранить и отправить повторно».
            </p>
            {profile.user.rejectionReason ? <p>{profile.user.rejectionReason}</p> : null}
          </div>
        ) : null}

        <Panel title="Основное" hint="Сохраните изменения отдельно от отправки на проверку.">
          <div className={styles.statusRow}>
            <StatusBadge label={statusLabel} tone={catalogStatusTone(profile.user.catalogStatus)} />
            {profile.user.catalogStatus === "PENDING" ? (
              <p className={styles.hint}>Профиль на проверке — редактирование доступно после решения.</p>
            ) : null}
          </div>

          <div className={styles.fields}>
            <TextField
              label="Имя представителя"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              hint="Отображается в кабинете; не подменяет название организации."
            />
            <TextField
              label="Город"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
            />
            <SelectField
              label="Тип партнёра"
              value={partnerType}
              onChange={(event) => setPartnerType(event.target.value)}
            >
              {PARTNER_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>

            {partnerType === "MASTER" ? (
              <fieldset className={styles.fieldset}>
                <legend>Специализации</legend>
                <div className={styles.chipGrid}>
                  {ONBOARDING_STAGES.map((stage) => (
                    <label key={stage.id} className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={specializations.includes(stage.id)}
                        onChange={() => toggleSpec(stage.id)}
                      />
                      <span>
                        {stage.icon} {stage.title}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <>
                <TextField
                  label="Название организации"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  hint="Коммерческое название магазина или компании."
                />
                <fieldset className={styles.fieldset}>
                  <legend>Категории товаров</legend>
                  <div className={styles.chipGrid}>
                    {STORE_CATEGORY_CHIPS.map((cat) => (
                      <label key={cat.value} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={storeCategories.includes(cat.value)}
                          onChange={() => toggleCategory(cat.value)}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            <TextAreaField
              label="Описание"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </Panel>

        <Panel title="Контакты для клиентов" hint="Эти данные могут быть видны в публичной карточке.">
          <div className={styles.fields}>
            <TextField label="Сайт" value={website} onChange={(e) => setWebsite(e.target.value)} />
            <TextField
              label="Telegram (публичный)"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              hint="Публичный @username — не канал уведомлений бота."
            />
            <TextField
              label="Рабочий email"
              value={publicEmail}
              onChange={(e) => setPublicEmail(e.target.value)}
            />
            <TextField
              label="Рабочий телефон"
              value={publicPhone}
              onChange={(e) => setPublicPhone(e.target.value)}
            />
          </div>
        </Panel>

        {(showRevisionBanner || moderationSection) && (
          <Panel title="Замечания модератора" hint="Только ваши комментарии — без внутренних записей штаба.">
            {notesLoading ? (
              <p className={styles.hint}>Загружаем…</p>
            ) : openNotes.length === 0 ? (
              <p className={styles.hint}>Нет открытых замечаний.</p>
            ) : (
              <ul className={styles.notesList}>
                {openNotes.map((note) => (
                  <li key={note.id}>
                    <p>{note.comment}</p>
                    <time dateTime={note.createdAt}>
                      {new Date(note.createdAt).toLocaleString("ru-RU")}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <NotificationSettingsPanel
          telegramLinked={Boolean(user.telegramLinked)}
          maxLinked={Boolean(user.maxLinked)}
          initialSettings={user.notificationSettings ?? null}
        />

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className={styles.success} role="status">
            {success}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </Button>
          {canSubmitModeration ? (
            <Button
              type="button"
              variant="secondary"
              disabled={submittingModeration || saving}
              onClick={() => void submitForModeration()}
            >
              {submittingModeration
                ? "Отправка…"
                : profile.user.catalogStatus === "NEEDS_REVISION"
                  ? "Сохранить и отправить повторно"
                  : "Отправить на проверку"}
            </Button>
          ) : null}
        </div>
      </form>

      <aside className={styles.aside}>
        <Panel title="Подсказка" compact>
          <p>
            Заполните обязательные поля и сохраните. Отправка на проверку доступна из черновика или
            после замечаний модератора.
          </p>
        </Panel>
        {profile.organization ? (
          <Panel title="Организация" compact>
            <p className={styles.orgName}>{profile.organization.name}</p>
            <p>Статус витрины: {CATALOG_STATUS_LABELS[profile.organization.catalogStatus] ?? profile.organization.catalogStatus}</p>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
