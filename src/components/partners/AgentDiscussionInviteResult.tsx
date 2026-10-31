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
  /** Discussion-invite list id when resolved after create — used for «Открыть карточку». */
  inviteId?: string;
};

export type AgentDiscussionInviteResultProps = {
  snapshot: AgentDiscussionInviteCreatedSnapshot;
  shareOpen: boolean;
  status: string;
  /**
   * Optional proposed-terms copy from a supported API field.
   * Discussion-invite create has no proposedTerms — omit (matches frozen R1 when empty).
   */
  proposedTerms?: string | null;
  onToggleShare: () => void;
  onCopyUrl: () => void;
  onCopyMessageAndUrl: () => void;
  onCreateAnother: () => void;
  onOpenInviteCard: () => void;
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
  proposedTerms = null,
  onToggleShare,
  onCopyUrl,
  onCopyMessageAndUrl,
  onCreateAnother,
  onOpenInviteCard,
  formatExpiry,
}: AgentDiscussionInviteResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shareTextId = useId();
  const shareText = buildDiscussionInviteShareText(snapshot);
  const terms = proposedTerms?.trim() || "";

  useEffect(() => {
    const reveal = () => {
      const heading = headingRef.current;
      heading?.focus({ preventScroll: true });
      // Wizard create leaves the hub modal body mid-scroll; without a reset the
      // ready hero stays clipped above the scrollport.
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
    };
    reveal();
    // Hub readyMode chrome can commit in the same turn; re-assert focus/scroll.
    const t = window.setTimeout(reveal, 0);
    return () => window.clearTimeout(t);
  }, [snapshot.url]);

  return (
    <section
      className={styles.result}
      data-testid="agent-discussion-invite-ready"
      data-ready-composition="r1"
      aria-labelledby="agent-discussion-invite-ready-title"
    >
      <div className={styles.icon} aria-hidden="true">
        ✓
      </div>
      <div className={styles.head}>
        <h2
          id="agent-discussion-invite-ready-title"
          ref={headingRef}
          className={styles.title}
          tabIndex={-1}
        >
          Теперь передайте приглашение
        </h2>
        <p className={styles.intro}>
          Для «{snapshot.recipientLabel}» всё подготовлено. Нажмите «Поделиться», скопируйте текст и
          передайте знакомому.
        </p>
      </div>

      <div className={styles.messageBlock}>
        <span className={styles.eyebrow}>Пригласительное сообщение</span>
        <p className={styles.message} data-testid="agent-discussion-invite-ready-message">
          {snapshot.cooperationSubject}
        </p>
      </div>

      {terms ? (
        <div className={styles.messageBlock} data-testid="agent-discussion-invite-ready-terms">
          <span className={styles.eyebrow}>Предлагаемые условия</span>
          <p className={styles.message}>{terms}</p>
        </div>
      ) : null}

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
          onClick={onOpenInviteCard}
          data-testid="agent-discussion-invite-open-card"
        >
          Открыть карточку приглашения
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
          <TextField
            label="Ссылка"
            value={snapshot.url}
            readOnly
            data-testid="discussion-invite-created-url"
          />
          <p className={styles.expiry}>Действует до {formatExpiry(snapshot.expiresAt)}</p>
          <div className={styles.shareActions}>
            <Button
              type="button"
              onClick={onCopyMessageAndUrl}
              data-testid="agent-discussion-invite-copy-message"
            >
              Скопировать текст
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCopyUrl}
              data-testid="agent-discussion-invite-copy-url"
            >
              Скопировать ссылку
            </Button>
          </div>
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
            <strong>Партнёр зарегистрируется</strong>
            <p>После обычного входа или регистрации он вернётся к вашему приглашению.</p>
          </li>
          <li>
            <strong>Вы согласуете условия</strong>
            <p>
              Само приглашение не активирует сотрудничество и не устанавливает проценты.
            </p>
          </li>
        </ol>
      </details>

      <div className={styles.secondaryRow}>
        <Button
          type="button"
          variant="text"
          onClick={onCreateAnother}
          data-testid="agent-discussion-invite-create-another"
        >
          Создать ещё
        </Button>
      </div>

      {status ? (
        <p className={styles.status} role="status" data-testid="agent-discussion-invite-share-status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
