"use client";

import { useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import { buildPartnerShareText } from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";
import { RecordRowActions } from "@/components/agent-r03/RecordRowActions";
import { Button } from "@/components/ui/Button";
import styles from "./AgentPartnerRecordActions.module.css";

type Props = {
  partnership: Partnership;
  meId: string;
  onUpdated: () => void;
};

export function AgentPartnerRecordActions({ partnership, meId, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const archived = Boolean(partnership.listPreference?.archivedAt);

  async function run(action: () => Promise<void>, onRetry?: () => void) {
    setBusy(true);
    setError("");
    setRetry(null);
    try {
      await action();
      onUpdated();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
      if (onRetry) setRetry(() => onRetry);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {error ? (
        <div className={styles.errorRow} role="alert">
          <span>{error}</span>
          {retry ? (
            <Button variant="primary" disabled={busy} onClick={() => retry()}>
              Повторить
            </Button>
          ) : null}
          <Button variant="secondary" disabled={busy} onClick={() => setError("")}>
            Закрыть
          </Button>
        </div>
      ) : null}
      <RecordRowActions
        variant="cardToolbar"
        ariaLabel="Действия с партнёром"
        actions={[
          {
            id: "share",
            label: "Поделиться",
            disabled: busy,
            onClick: () => {
              const text = buildPartnerShareText(partnership, meId);
              void navigator.clipboard.writeText(text).catch(() => {
                window.prompt("Скопируйте текст", text);
              });
            },
          },
          {
            id: "rename",
            label: "Переименовать для себя",
            disabled: busy,
            onClick: () => {
              const doRename = async () => {
                const current = partnership.listPreference?.personalAlias ?? "";
                const next = window.prompt("Название для себя", current);
                if (next == null) return;
                const trimmed = next.trim();
                await patchPartnershipListPreference(partnership.id, {
                  personalAlias: trimmed.length ? trimmed : null,
                });
              };
              void run(doRename, () => void run(doRename));
            },
          },
          {
            id: archived ? "restore" : "archive",
            label: archived ? "Вернуть из архива" : "В архив",
            disabled: busy,
            onClick: () => {
              const doArchive = async () => {
                await patchPartnershipListPreference(partnership.id, { archived: !archived });
              };
              void run(doArchive, () => void run(doArchive));
            },
          },
        ]}
      />
    </div>
  );
}
