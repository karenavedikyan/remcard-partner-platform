"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  canSubmitProfileForModeration,
  effectiveCatalogStatus,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import {
  persistCatalogDraftOnly,
  refreshProfile,
  submitProfileForModerationReview,
  unpublishFromCatalog,
  type ProfileDraft,
} from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { CATALOG_STATUS_LABELS, catalogStatusTone } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./ProfileEditor.module.css";

type ProfileCatalogSectionProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  onProfileUpdated: (next: ProProfileResponse) => void;
};

function isPubliclyVisible(profile: ProProfileResponse): boolean {
  const pub = profile.catalogPublication;
  if (pub?.isLivePublic) return true;
  return profile.user.isPublic && effectiveCatalogStatus(profile) === "APPROVED";
}

export function ProfileCatalogSection({
  profile,
  draft,
  onProfileUpdated,
}: ProfileCatalogSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(
    () => effectiveCatalogStatus(profile) !== "DRAFT" || showRevisionBanner(profile),
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const catalogStatus = effectiveCatalogStatus(profile);
  const statusLabel = CATALOG_STATUS_LABELS[catalogStatus] ?? catalogStatus;
  const canSubmit = canSubmitProfileForModeration(profile);
  const published = profile.catalogPublication?.published;
  const draftPending = profile.catalogPublication?.draftPending || profile.user.catalogDraftPending;

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await persistCatalogDraftOnly(profile, draft);
      onProfileUpdated(next);
      setSuccess("Черновик публикации сохранён (не отправлен на модерацию)");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function submitPublication() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const next = await submitProfileForModerationReview(profile, draft);
      onProfileUpdated(next);
      setSuccess("Отправлено на проверку для публикации в каталоге");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  }

  async function unpublish() {
    setSubmitting(true);
    setError("");
    try {
      await unpublishFromCatalog();
      const refreshed = await refreshProfile();
      onProfileUpdated(refreshed);
      setSuccess("Карточка снята с публикации. Кабинет и партнёрства продолжают работать.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось снять с публикации");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Публикация в каталоге">
      <div className={styles.statusRow}>
        <StatusBadge label={statusLabel} tone={catalogStatusTone(catalogStatus)} />
        {isPubliclyVisible(profile) ? (
          <StatusBadge label="Видна в каталоге" tone="active" />
        ) : (
          <StatusBadge label="Не видна посетителям" tone="pending" />
        )}
        {draftPending ? <StatusBadge label="Черновик правок" tone="pending" /> : null}
      </div>

      {!expanded ? (
        <div className={styles.bannerWarn}>
          <strong>Привлекайте клиентов из каталога RemCard</strong>
          <p>
            Расскажите о своих услугах или товарах и помогите клиентам выбрать вас. Размещение
            необязательно: можно работать с партнёрами в PROF без публичного профиля.
          </p>
          <Button type="button" onClick={() => setExpanded(true)}>
            Подготовить профиль к публикации
          </Button>
        </div>
      ) : (
        <>
          <p className={styles.hint}>
            Имя представителя в каталоге показывается только при включённой опции «показывать полное
            имя» в карточке; иначе на remcard.ru используется коммерческое имя или название организации.
          </p>
          {published && isPubliclyVisible(profile) ? (
            <div className={styles.bannerWarn}>
              <strong>Предпросмотр опубликованной версии</strong>
              <p>{published.description || "— без описания —"}</p>
              <p className={styles.hint}>
                Правки ниже сохраняются как черновик и не подменяют опубликованный текст до проверки.
              </p>
            </div>
          ) : null}
          {profile.user.rejectionReason ? (
            <p className={styles.error}>{profile.user.rejectionReason}</p>
          ) : null}
          <form onSubmit={(e) => void saveDraft(e)}>
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
                {saving ? "Сохранение…" : "Сохранить черновик"}
              </Button>
              {canSubmit ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || saving}
                  onClick={() => void submitPublication()}
                >
                  {submitting ? "Отправка…" : "Отправить на публикацию"}
                </Button>
              ) : null}
              {isPubliclyVisible(profile) ? (
                <Button type="button" variant="secondary" disabled={submitting} onClick={() => void unpublish()}>
                  Снять с публикации
                </Button>
              ) : null}
            </div>
          </form>
        </>
      )}
    </Panel>
  );
}
