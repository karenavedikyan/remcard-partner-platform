"use client";

import { useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import { buildPartnerShareText } from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";
import { RecordRowActions, type RecordRowAction } from "@/components/agent-r03/RecordRowActions";
import { Button } from "@/components/ui/Button";
import { PartnerPersonalAliasDialog } from "@/components/partners/PartnerPersonalAliasDialog";
import { PartnerListHideDialog } from "@/components/partners/PartnerListHideDialog";
import styles from "./AgentPartnerRecordActions.module.css";

type Variant = "listRow" | "cardToolbar" | "mobileFooter";

type Props = {
  partnership: Partnership;
  meId: string;
  onUpdated: () => void;
  variant: Variant;
  ariaLabel: string;
  trailingActions?: RecordRowAction[];
};

export function usePartnerWorkspaceRowActions(
  partnership: Partnership,
  meId: string,
  onUpdated: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const archived = Boolean(partnership.listPreference?.archivedAt);
  const hidden = Boolean(partnership.listPreference?.hiddenAt);

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

  const rowActions: RecordRowAction[] = [
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
      onClick: () => setRenameOpen(true),
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
    ...(!archived && !hidden
      ? [
          {
            id: "hide",
            label: "Убрать из списка",
            disabled: busy,
            onClick: () => setHideOpen(true),
          } satisfies RecordRowAction,
        ]
      : []),
  ];

  const errorBanner =
    error ? (
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
    ) : null;

  const renameDialog = (
    <PartnerPersonalAliasDialog
      open={renameOpen}
      partnershipId={partnership.id}
      initialAlias={partnership.listPreference?.personalAlias ?? ""}
      onClose={() => setRenameOpen(false)}
      onSaved={onUpdated}
    />
  );

  const hideDialog = (
    <PartnerListHideDialog
      open={hideOpen}
      busy={busy}
      onClose={() => setHideOpen(false)}
      onConfirm={() => {
        const doHide = async () => {
          await patchPartnershipListPreference(partnership.id, { hidden: true });
          setHideOpen(false);
        };
        void run(doHide, () => void run(doHide));
      }}
    />
  );

  return { rowActions, errorBanner, busy, renameDialog, hideDialog };
}

export function AgentPartnerWorkspaceActions({
  partnership,
  meId,
  onUpdated,
  variant,
  ariaLabel,
  trailingActions = [],
}: Props) {
  const { rowActions, errorBanner, renameDialog, hideDialog } = usePartnerWorkspaceRowActions(
    partnership,
    meId,
    onUpdated,
  );
  return (
    <div className={styles.wrap}>
      {errorBanner}
      {renameDialog}
      {hideDialog}
      <RecordRowActions
        variant={variant}
        ariaLabel={ariaLabel}
        actions={[...rowActions, ...trailingActions]}
      />
    </div>
  );
}
