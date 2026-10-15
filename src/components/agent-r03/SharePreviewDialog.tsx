"use client";

import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

type Props = {
  open: boolean;
  title: string;
  lines: string[];
  url: string;
  onClose: () => void;
};

export function SharePreviewDialog({ open, title, lines, url, onClose }: Props) {
  if (!open) return null;

  const preview = lines.filter(Boolean).join("\n");

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
        <pre className={styles.sharePreview}>{preview}</pre>
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
