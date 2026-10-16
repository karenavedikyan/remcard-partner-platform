"use client";

import { useState } from "react";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import { buildPartnerShareText } from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";
import styles from "./AgentPartnerRecordActions.module.css";

type Props = {
  partnership: Partnership;
  meId: string;
  onUpdated: () => void;
};

export function AgentPartnerRecordActions({ partnership, meId, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const archived = Boolean(partnership.listPreference?.archivedAt);

  async function setArchived(next: boolean) {
    setBusy(true);
    try {
      await patchPartnershipListPreference(partnership.id, { archived: next });
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const current = partnership.listPreference?.personalAlias ?? "";
    const next = window.prompt("Название для себя", current);
    if (next == null) return;
    const trimmed = next.trim();
    setBusy(true);
    try {
      await patchPartnershipListPreference(partnership.id, {
        personalAlias: trimmed.length ? trimmed : null,
      });
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  function share() {
    const text = buildPartnerShareText(partnership, meId);
    void navigator.clipboard.writeText(text).catch(() => {
      window.prompt("Скопируйте текст", text);
    });
  }

  return (
    <div className={styles.toolbar} role="group" aria-label="Действия с партнёром">
      <button
        type="button"
        className={styles.iconBtn}
        title="Поделиться"
        aria-label="Поделиться"
        disabled={busy}
        onClick={share}
      >
        ⎘
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        title="Переименовать для себя"
        aria-label="Переименовать для себя"
        disabled={busy}
        onClick={() => void rename()}
      >
        ✎
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        title={archived ? "Вернуть из архива" : "В архив"}
        aria-label={archived ? "Вернуть из архива" : "В архив"}
        disabled={busy}
        onClick={() => void setArchived(!archived)}
      >
        {archived ? "↩" : "▣"}
      </button>
    </div>
  );
}
