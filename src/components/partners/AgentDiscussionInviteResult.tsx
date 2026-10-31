"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./AgentDiscussionInviteResult.module.css";

export type AgentDiscussionInviteCreatedSnapshot = {
  recipientLabel: string;
  cooperationSubject: string;
  url: string;
  expiresAt: string;
};

export type AgentDiscussionInviteResultProps = {
  snapshot: AgentDiscussionInviteCreatedSnapshot;
  shareOpen: boolean;
  status: string;
  onToggleShare: () => void;
  onCopyUrl: () => void;
  onCopyMessageAndUrl: () => void;
  onCreateAnother: () => void;
  formatExpiry: (iso: string) => string;
};

export function buildDiscussionInviteShareText(snapshot: AgentDiscussionInviteCreatedSnapshot): string {
  const message = snapshot.cooperationSubject.trim();
  const url = snapshot.url.trim();
  return `${message}\n\n${url}`;
}

export function AgentDiscussionInviteResult({
  snapshot,
  shareOpen,
  status,
  onToggleShare,
  onCopyUrl,
  onCopyMessageAndUrl,
  onCreateAnother,
  formatExpiry,
}: AgentDiscussionInviteResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shareTextId = useId();
  const shareText = buildDiscussionInviteShareText(snapshot);

  useEffect(() => {
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    // Wizard create leaves the hub modal body mid-scroll; without a reset the
    // ready hero (check + «Теперь передайте приглашение») stays clipped above
    // the scrollport while share/history fill the visible area — R1 ready is a
    // top-anchored success composition.
    const root = heading?.closest(
      '[data-testid="agent-discussion-invite-ready"]',
    ) as HTMLElement | null;
    if (!root?.isConnected) return;
    let port: HTMLElement | null = root.parentElement;
    while (port && port !== document.body) {
      const style = window.getComputedStyle(port);
      if (
        /(auto|scroll|overlay)/.test(style.overflowY) &&
        port.scrollHeight > port.clientHeight + 1
      ) {
        const rootOffset =
          root.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = Math.max(0, rootOffset - 8);
        break;
      }
      port = port.parentElement;
    }
  }, [snapshot.url]);

  return (
    <section
      className={styles.result}
      data-testid="agent-discussion-invite-ready"
      aria-labelledby="agent-discussion-invite-ready-title"
    >
      <div className={styles.icon} aria-hidden="true">
        ✓
      </div>
      <div className={styles.head}>
        <p className={styles.eyebrow}>Приглашение создано</p>
        <h2
          id="agent-discussion-invite-ready-title"
          ref={headingRef}
          className={styles.title}
          tabIndex={-1}
        >
          Теперь передайте приглашение
        </h2>
        <p className={styles.intro}>
          Для «{snapshot.recipientLabel}» всё подготовлено. Нажмите «Поделиться», скопируйте текст со
          ссылкой и передайте знакомому. Автоматической отправки нет.
        </p>
        <p className={styles.expiry}>Действует до {formatExpiry(snapshot.expiresAt)}</p>
      </div>

      <div className={styles.messageBlock}>
        <span className={styles.eyebrow}>Пригласительное сообщение</span>
        <p className={styles.message} data-testid="agent-discussion-invite-ready-message">
          {snapshot.cooperationSubject}
        </p>
      </div>

      <TextField
        label="Ссылка"
        value={snapshot.url}
        readOnly
        data-testid="discussion-invite-created-url"
      />

      <div className={styles.actions}>
        <Button
          type="button"
          onClick={onToggleShare}
          data-testid="agent-discussion-invite-share"
          aria-expanded={shareOpen}
          aria-controls={shareOpen ? shareTextId : undefined}
        >
          {shareOpen ? "Скрыть текст для передачи" : "Поделиться приглашением"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCopyUrl}
          data-testid="agent-discussion-invite-copy-url"
        >
          Скопировать ссылку
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={onCreateAnother}
          data-testid="agent-discussion-invite-create-another"
        >
          Создать ещё
        </Button>
      </div>

      {shareOpen ? (
        <div
          className={styles.sharePanel}
          data-testid="agent-discussion-invite-share-panel"
          id={shareTextId}
        >
          <label className={styles.shareLabel} htmlFor={`${shareTextId}-textarea`}>
            Готовый текст
          </label>
          <textarea
            id={`${shareTextId}-textarea`}
            className={styles.shareTextarea}
            readOnly
            rows={8}
            value={shareText}
            data-testid="agent-discussion-invite-share-text"
          />
          <Button
            type="button"
            onClick={onCopyMessageAndUrl}
            data-testid="agent-discussion-invite-copy-message"
          >
            Скопировать текст
          </Button>
          <p className={styles.shareNote}>
            Скопируйте текст со ссылкой и передайте партнёру удобным способом. Сообщение само не
            отправляется.
          </p>
        </div>
      ) : null}

      <details className={styles.after}>
        <summary>Что будет после передачи приглашения</summary>
        <ol className={styles.afterList}>
          <li>
            <strong>Партнёр откроет ссылку</strong>
            <p>После входа или регистрации он вернётся к вашему приглашению к обсуждению.</p>
          </li>
          <li>
            <strong>Вы согласуете условия отдельно</strong>
            <p>
              Само приглашение не активирует сотрудничество и не устанавливает проценты — только
              обсуждение.
            </p>
          </li>
        </ol>
      </details>

      {status ? (
        <p className={styles.status} role="status" data-testid="agent-discussion-invite-share-status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
