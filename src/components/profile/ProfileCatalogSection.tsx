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
  persistProfileDraft,
  submitProfileForModerationReview,
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

export function ProfileCatalogSection({
  profile,
  draft,
  onProfileUpdated,
}: ProfileCatalogSectionProps) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);
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

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await persistProfileDraft(profile, draft);
      onProfileUpdated(next);
      setSuccess("Черновик публикации сохранён");
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

  return (
    <Panel title="Публикация в каталоге">
      <div className={styles.statusRow}>
        <StatusBadge label={statusLabel} tone={catalogStatusTone(catalogStatus)} />
      </div>

      {!expanded ? (
        <div className={styles.bannerWarn}>
          <strong>Привлекайте клиентов из каталога RemCard</strong>
          <p>
            Расскажите о своих услугах или товарах, покажите примеры работ и помогите клиентам
            выбрать вас. Размещение в каталоге необязательно: вы можете работать с партнёрами в
            PROF без публичного профиля.
          </p>
          <Button type="button" onClick={() => setExpanded(true)} disabled={preparing}>
            Подготовить профиль к публикации
          </Button>
        </div>
      ) : (
        <>
          <p className={styles.hint}>
            Поля ниже относятся к публичной карточке на remcard.ru. Имя представителя из основных
            данных автоматически не публикуется.
          </p>
          {profile.user.rejectionReason ? (
            <p className={styles.error}>{profile.user.rejectionReason}</p>
          ) : null}
          <form onSubmit={(e) => void saveDraft(e)}>
            <p className={styles.hint}>
              Заполните обязательные для публикации поля в основном блоке (специализации или
              категории, адрес филиала для организаций) и сохраните черновик перед отправкой.
            </p>
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
            </div>
          </form>
        </>
      )}
    </Panel>
  );
}
