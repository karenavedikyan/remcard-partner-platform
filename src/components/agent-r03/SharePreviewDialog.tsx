"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  buildClientShareLines,
  DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES,
  type ClientContactShareToggles,
} from "./clientContactShare";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import styles from "./agent-r03.module.css";

type ClientContactSource = Pick<AgentClientRow, "displayName" | "phone" | "email" | "city">;

type Props = {
  open: boolean;
  title: string;
  lines: string[];
  url: string;
  onClose: () => void;
  /** When set, contact phone/email/city are opt-in (default off). */
  clientContacts?: ClientContactSource | null;
};

export function SharePreviewDialog({
  open,
  title,
  lines,
  url,
  onClose,
  clientContacts,
}: Props) {
  const [toggles, setToggles] = useState<ClientContactShareToggles>(
    DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES,
  );

  useEffect(() => {
    if (open) {
      setToggles(DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES);
    }
  }, [open, clientContacts?.displayName, clientContacts?.phone, clientContacts?.email, clientContacts?.city]);

  const toggleFields = useMemo(() => {
    if (!clientContacts) return [];
    const fields: { key: keyof ClientContactShareToggles; label: string; has: boolean }[] = [
      { key: "phone", label: "Телефон", has: Boolean(clientContacts.phone) },
      { key: "email", label: "Email", has: Boolean(clientContacts.email) },
      { key: "city", label: "Город", has: Boolean(clientContacts.city) },
    ];
    return fields.filter((f) => f.has);
  }, [clientContacts]);

  if (!open) return null;

  const previewLines = clientContacts
    ? buildClientShareLines(clientContacts, toggles)
    : lines.filter(Boolean);
  const preview = previewLines.join("\n");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(preview);
      window.alert("Текст скопирован.");
    } catch {
      window.prompt("Скопируйте вручную:", preview);
    }
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyText();
      return;
    }
    try {
      await navigator.share({ title, text: preview, url: url || undefined });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      await copyText();
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialogPanel}
        role="dialog"
        aria-labelledby="share-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-preview-title">Предпросмотр для отправки</h2>
        {clientContacts && toggleFields.length > 0 ? (
          <div className={styles.shareToggleRow} data-testid="share-contact-toggles">
            {toggleFields.map((field) => (
              <label key={field.key} className={styles.shareToggleLabel}>
                <input
                  type="checkbox"
                  checked={toggles[field.key]}
                  onChange={(e) =>
                    setToggles((prev) => ({ ...prev, [field.key]: e.target.checked }))
                  }
                />
                {field.label}
              </label>
            ))}
          </div>
        ) : null}
        <pre className={styles.sharePreview} data-testid="share-preview-text">
          {preview}
        </pre>
        <div className={styles.dialogActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button type="button" variant="secondary" onClick={() => void copyText()}>
            Копировать
          </Button>
          <Button type="button" onClick={() => void shareNative()}>
            Поделиться
          </Button>
        </div>
      </div>
    </div>
  );
}
