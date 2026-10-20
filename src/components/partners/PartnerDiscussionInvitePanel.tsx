"use client";

import { useCallback, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type Props = {
  showSectionTitle?: boolean;
};

export function PartnerDiscussionInvitePanel({ showSectionTitle = true }: Props) {
  const [recipientLabel, setRecipientLabel] = useState("");
  const [cooperationSubject, setCooperationSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [createdExpires, setCreatedExpires] = useState("");
  const [shareHint, setShareHint] = useState("");

  const createLink = useCallback(async () => {
    setError("");
    setShareHint("");
    setCreating(true);
    try {
      const result = await remcardFetch<{
        token: string;
        expiresAt: string;
        previewPath: string;
      }>("/api/partnership/discussion-invite", {
        method: "POST",
        body: {
          recipientLabel: recipientLabel.trim(),
          cooperationSubject: cooperationSubject.trim(),
        },
      });
      setCreatedUrl(`${getAppUrl()}${result.previewPath}`);
      setCreatedExpires(result.expiresAt);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать ссылку");
    } finally {
      setCreating(false);
    }
  }, [cooperationSubject, recipientLabel]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("Ссылка скопирована");
    } catch {
      setShareHint("Скопируйте ссылку вручную из поля ниже");
    }
  }

  function formatExpiry(iso: string) {
    try {
      return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  return (
    <div className={styles.linkPanel} data-testid="agent-r04-modal-discussion-link">
      <Panel
        title={showSectionTitle ? "Приглашение к обсуждению" : undefined}
        hint="Для знакомого партнёра. Ссылка не подключает программу и не согласует проценты — только приглашение обсудить сотрудничество."
      >
        <p className={styles.hint}>
          Имя или название — подсказка для вас и получателя, а не поиск пользователя на платформе.
          После входа получатель явно присоединится к обсуждению; условия согласуются отдельно, если
          потребуется.
        </p>
        <TextField
          label="Имя или название партнёра"
          value={recipientLabel}
          onChange={(e) => setRecipientLabel(e.target.value)}
          required
          maxLength={120}
        />
        <TextAreaField
          label="Предмет сотрудничества"
          value={cooperationSubject}
          onChange={(e) => setCooperationSubject(e.target.value)}
          required
          maxLength={500}
          hint="Кратко: о чём хотите договориться. Получатель увидит этот текст на странице ссылки."
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button
            disabled={
              creating || !recipientLabel.trim() || !cooperationSubject.trim()
            }
            onClick={() => void createLink()}
          >
            {creating ? "Создаём…" : "Создать ссылку"}
          </Button>
        </div>
        {createdUrl ? (
          <div className={styles.notice} data-testid="discussion-invite-created">
            <p>
              <strong>Ссылка создана</strong>
            </p>
            <p>Действует до {createdExpires ? formatExpiry(createdExpires) : "—"}</p>
            <TextField label="Ссылка" value={createdUrl} readOnly data-testid="discussion-invite-created-url" />
            {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void copyUrl(createdUrl)}>
                Скопировать ссылку
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
