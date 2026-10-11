"use client";

import { useState } from "react";
import { buildInviteShareMessage, type InviteShareContext } from "@/lib/invite-share-message";
import { Button } from "@/components/ui/Button";
import formStyles from "./ProfileEditor.module.css";
import styles from "./ProfileTeamSection.module.css";

type Props = {
  ctx: InviteShareContext;
  compact?: boolean;
  onFeedback?: (message: string) => void;
  onManualCopy?: (text: string) => void;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ProfileTeamInviteShare({ ctx, compact, onFeedback, onManualCopy }: Props) {
  const [sharePending, setSharePending] = useState(false);

  async function copyFull() {
    const text = buildInviteShareMessage(ctx);
    const ok = await copyText(text);
    if (ok) {
      onFeedback?.("Приглашение скопировано");
      onManualCopy?.("");
    } else {
      onFeedback?.("");
      onManualCopy?.(text);
    }
  }

  async function copyLinkOnly() {
    const ok = await copyText(ctx.url);
    if (ok) {
      onFeedback?.("Ссылка скопирована");
      onManualCopy?.("");
    } else {
      onFeedback?.("");
      onManualCopy?.(ctx.url);
    }
  }

  async function shareNative() {
    if (typeof navigator.share !== "function") return;
    setSharePending(true);
    const text = buildInviteShareMessage(ctx);
    try {
      await navigator.share({
        title: "Приглашение в RemCard",
        text,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      onFeedback?.("Не удалось открыть «Поделиться». Скопируйте текст вручную.");
      onManualCopy?.(text);
    } finally {
      setSharePending(false);
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={compact ? styles.inviteShareCompact : styles.inviteShareBlock} data-testid="team-invite-share">
      {!compact ? (
        <p className={formStyles.hint}>Отправьте сотруднику текст приглашения или только ссылку.</p>
      ) : null}
      <div className={styles.inviteShareActions}>
        <Button type="button" variant="secondary" data-testid="team-copy-invite-message" onClick={() => void copyFull()}>
          Скопировать приглашение
        </Button>
        <Button type="button" variant="secondary" data-testid="team-copy-invite-link" onClick={() => void copyLinkOnly()}>
          Только ссылка
        </Button>
        {canShare ? (
          <Button
            type="button"
            variant="secondary"
            disabled={sharePending}
            data-testid="team-share-invite"
            onClick={() => void shareNative()}
          >
            Поделиться
          </Button>
        ) : null}
      </div>
    </div>
  );
}
