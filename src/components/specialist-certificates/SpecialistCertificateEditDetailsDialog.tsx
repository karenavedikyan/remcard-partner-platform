"use client";

import { useEffect, useState } from "react";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { RemcardApiError } from "@/lib/api-client";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import agentStyles from "@/components/agent-r03/agent-r03.module.css";
import styles from "@/components/recommendations/recommendations.module.css";

type Props = {
  open: boolean;
  cert: AgentCertificateRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function SpecialistCertificateEditDetailsDialog({ open, cert, onClose, onSaved }: Props) {
  const [alias, setAlias] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const partnerLabel =
    cert?.partnerOffers?.map((o) => o.storeName).filter(Boolean).join(", ") ||
    cert?.partnerStoreName ||
    "—";
  const categoryLabel =
    cert?.categorySummary ||
    cert?.partnerOffers
      ?.flatMap((o) => o.categories?.map((c) => c.categoryLabel) ?? [])
      .join(", ") ||
    "—";

  useEffect(() => {
    if (!open || !cert) return;
    setAlias(cert.userAlias ?? "");
    setError("");
  }, [open, cert]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  if (!open || !cert) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!cert) return;
    const trimmed = alias.trim();
    if (!trimmed) {
      setError("Укажите название");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await patchSpecialistIssuerCertificate(cert.id, { userAlias: trimmed });
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={agentStyles.dialogBackdrop}
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <form
        className={`${agentStyles.r03Root} ${agentStyles.dialogPanel} ${styles.specialistCreatePanel}`}
        role="dialog"
        aria-labelledby="specialist-cert-edit-details-title"
        data-testid="specialist-certificate-edit-details-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className={agentStyles.dialogTitleRow}>
          <h2 id="specialist-cert-edit-details-title">Редактировать детали</h2>
          <button
            type="button"
            className={agentStyles.dialogCloseBtn}
            aria-label="Закрыть"
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <TextField
          label="Название для себя"
          value={alias}
          disabled={saving}
          maxLength={100}
          onChange={(event) => setAlias(event.target.value)}
        />
        <p className={styles.meta}>Название видно только вам и не меняет условия ссылки.</p>
        <label className={styles.partnerSearchField}>
          Партнёр
          <input value={partnerLabel} readOnly disabled />
        </label>
        <label className={styles.partnerSearchField}>
          Что предлагаете / рекомендуете
          <input value={categoryLabel} readOnly disabled />
        </label>
        <p className={styles.notice}>
          Условия созданного сертификата не меняем задним числом. Для других условий создайте новый
          сертификат.
        </p>
        {error ? (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.createFormFooter}>
          <span />
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
