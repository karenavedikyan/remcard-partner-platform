"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  CATALOG_STATUS_LABELS,
  catalogStatusTone,
} from "@/lib/partnership-labels";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./ProfileEditor.module.css";

const PARTNER_TYPES = [
  { value: "MASTER", label: "Специалист" },
  { value: "COMPANY", label: "Компания" },
  { value: "STORE", label: "Магазин" },
] as const;

type ProfileEditorProps = {
  initial: ProProfileResponse;
};

export function ProfileEditor({ initial }: ProfileEditorProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [city, setCity] = useState(initial.user.city ?? "");
  const [description, setDescription] = useState(initial.user.description ?? "");
  const [partnerType, setPartnerType] = useState(initial.user.partnerType ?? "MASTER");
  const [website, setWebsite] = useState(initial.user.website ?? "");
  const [telegram, setTelegram] = useState(initial.user.telegram ?? "");
  const [publicEmail, setPublicEmail] = useState(initial.user.publicEmail ?? "");
  const [publicPhone, setPublicPhone] = useState(initial.user.publicPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [submittingModeration, setSubmittingModeration] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setProfile(initial);
    setCity(initial.user.city ?? "");
    setDescription(initial.user.description ?? "");
    setPartnerType(initial.user.partnerType ?? "MASTER");
    setWebsite(initial.user.website ?? "");
    setTelegram(initial.user.telegram ?? "");
    setPublicEmail(initial.user.publicEmail ?? "");
    setPublicPhone(initial.user.publicPhone ?? "");
  }, [initial]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = await remcardFetch<{ user: ProProfileResponse["user"] }>(
        "/api/pro/profile",
        {
          method: "PATCH",
          body: {
            city: city.trim() || null,
            description: description.trim() || null,
            partnerType,
            website: website.trim() || null,
            telegram: telegram.trim() || null,
            publicEmail: publicEmail.trim() || null,
            publicPhone: publicPhone.trim() || null,
          },
        },
      );
      setProfile((prev) => ({ ...prev, user: payload.user }));
      setSuccess("Профиль сохранён");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  async function submitForModeration() {
    setSubmittingModeration(true);
    setError("");
    setSuccess("");
    try {
      const payload = await remcardFetch<{ user: ProProfileResponse["user"] }>(
        "/api/pro/profile",
        {
          method: "PATCH",
          body: { action: "submitForModeration" },
        },
      );
      setProfile((prev) => ({ ...prev, user: payload.user }));
      setSuccess("Профиль отправлен на проверку");
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

  return (
    <div className={styles.grid}>
      <form className={styles.main} onSubmit={saveProfile}>
        <Panel
          title="Основное"
          hint="Изменения сохраняются через существующий backend RemCard."
        >
          <div className={styles.statusRow}>
            <StatusBadge label={statusLabel} tone={catalogStatusTone(profile.user.catalogStatus)} />
            {profile.user.rejectionReason ? (
              <p className={styles.rejection} role="status">
                {profile.user.rejectionReason}
              </p>
            ) : null}
          </div>

          <div className={styles.fields}>
            <TextField label="Публичное имя" value={profile.user.displayName ?? ""} readOnly />
            <TextField
              label="Город"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
              hint="Город, где вы работаете с клиентами"
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
            <TextAreaField
              label="Описание"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              hint="Кратко опишите, чем вы занимаетесь"
            />
          </div>
        </Panel>

        <Panel title="Контакты для клиентов">
          <div className={styles.fields}>
            <TextField
              label="Сайт"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://"
            />
            <TextField
              label="Telegram"
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder="@username"
            />
            <TextField
              label="Рабочий email"
              value={publicEmail}
              onChange={(event) => setPublicEmail(event.target.value)}
              inputMode="email"
            />
            <TextField
              label="Рабочий телефон"
              value={publicPhone}
              onChange={(event) => setPublicPhone(event.target.value)}
              placeholder="+7XXXXXXXXXX"
            />
          </div>
        </Panel>

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
            {saving ? "Сохранение…" : "Сохранить профиль"}
          </Button>
          {profile.user.catalogStatus === "DRAFT" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={submittingModeration}
              onClick={submitForModeration}
            >
              {submittingModeration ? "Отправка…" : "Отправить на проверку"}
            </Button>
          ) : null}
        </div>
      </form>

      <aside className={styles.aside}>
        <Panel title="Подсказка" compact>
          <p>
            Заполните город и описание, затем сохраните профиль. После проверки карточка появится в
            каталоге RemCard.
          </p>
        </Panel>
        {profile.organization ? (
          <Panel title="Организация" compact>
            <p className={styles.orgName}>{profile.organization.name}</p>
            <p>Филиалов: {profile.organization.branchCount}</p>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
