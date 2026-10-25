"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { createAgentClient, fetchAgentClients } from "@/lib/agent-r03/api";
import { patchStoreOrderReceivingClient } from "@/lib/history-receiving-client-api";
import type { PurchaseRow, ReceivingClientLinkSnapshot } from "@/lib/history-types";
import { AgentClientFormDialog } from "@/components/agent-r03/AgentClientFormDialog";
import { Button } from "@/components/ui/Button";
import styles from "./history.module.css";

type PurchaseReceivingClientPanelProps = {
  purchase: PurchaseRow;
  onLinked: (patch: {
    receivingClient: ReceivingClientLinkSnapshot | null;
  }) => void;
};

export function PurchaseReceivingClientPanel({
  purchase,
  onLinked,
}: PurchaseReceivingClientPanelProps) {
  const orderId = purchase.orderId ?? purchase.id;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);

  const linked = purchase.receivingClient ?? null;
  const version = linked?.version;

  const loadClients = useCallback(async (q: string) => {
    setSearching(true);
    setSearchError("");
    try {
      const data = await fetchAgentClients({ q: q.trim() || undefined, limit: 20 });
      setClients(data.clients.map((c) => ({ id: c.id, displayName: c.displayName })));
    } catch (caught) {
      setSearchError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить клиентов",
      );
      setClients([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!purchase.canManageReceivingClient) return;
    const handle = window.setTimeout(() => void loadClients(query), 300);
    return () => window.clearTimeout(handle);
  }, [loadClients, purchase.canManageReceivingClient, query]);

  const selectedLabel = useMemo(() => {
    if (!selectedId) return null;
    return clients.find((c) => c.id === selectedId)?.displayName ?? null;
  }, [clients, selectedId]);

  async function saveLink() {
    if (!selectedId) return;
    if (linked && linked.agentClientId !== selectedId && !confirmChange) {
      setConfirmChange(true);
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      const res = await patchStoreOrderReceivingClient(orderId, {
        action: "link",
        agentClientId: selectedId,
        expectedVersion: version,
      });
      onLinked({ receivingClient: res.receivingClient });
      setConfirmChange(false);
      setSelectedId(null);
    } catch (caught) {
      setActionError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить привязку",
      );
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!linked) return;
    if (!confirmChange) {
      setConfirmChange(true);
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      const res = await patchStoreOrderReceivingClient(orderId, {
        action: "unlink",
        expectedVersion: version,
      });
      onLinked({ receivingClient: res.receivingClient });
      setConfirmChange(false);
    } catch (caught) {
      setActionError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось снять привязку",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!purchase.canManageReceivingClient) {
    return null;
  }

  return (
    <div className={styles.detailGrid} data-testid="purchase-receiving-client-panel">
      <h3 className={styles.rowTitle}>Клиент вашей базы</h3>
      {purchase.recommendationSource ? (
        <p className={styles.meta}>
          Источник рекомендации: {purchase.recommendationSource.recommenderName} ·{" "}
          {purchase.recommendationSource.promoCode}
        </p>
      ) : null}
      {linked ? (
        <>
          <p className={styles.meta}>
            Клиент:{" "}
            <Link href={`/clients/${encodeURIComponent(linked.agentClientId)}`}>
              {linked.displayName}
            </Link>
          </p>
          <div className={styles.rowHeader}>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void unlink()}>
              {confirmChange ? "Подтвердить снятие" : "Снять привязку"}
            </Button>
            {confirmChange ? (
              <Button type="button" variant="text" onClick={() => setConfirmChange(false)}>
                Отмена
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className={styles.meta}>Клиент: не указан</p>
      )}

      <label className={styles.meta}>
        Поиск в вашей CRM
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Имя или контакт"
          data-testid="receiving-client-search"
        />
      </label>
      {searching ? <p className={styles.meta}>Загрузка…</p> : null}
      {searchError ? (
        <p className={styles.error} role="alert">
          {searchError}{" "}
          <button type="button" onClick={() => void loadClients(query)}>
            Повторить
          </button>
        </p>
      ) : null}
      {!searching && clients.length === 0 && !searchError ? (
        <p className={styles.empty}>Клиенты не найдены</p>
      ) : (
        <ul className={styles.clientPickList}>
          {clients.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={selectedId === c.id ? styles.clientPickActive : styles.clientPick}
                onClick={() => {
                  setSelectedId(c.id);
                  setConfirmChange(false);
                }}
              >
                {c.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.rowHeader}>
        <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
          Новый клиент
        </Button>
        <Button type="button" disabled={!selectedId || saving} onClick={() => void saveLink()}>
          {confirmChange && linked
            ? "Подтвердить смену клиента"
            : linked
              ? "Сменить клиента"
              : "Сохранить привязку"}
        </Button>
      </div>
      {selectedLabel && !linked ? (
        <p className={styles.meta}>Выбран: {selectedLabel}</p>
      ) : null}
      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}

      <AgentClientFormDialog
        accessMode="business"
        open={createOpen}
        title="Новый клиент"
        submitLabel="Создать"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          const created = await createAgentClient(values);
          setClients((prev) => [{ id: created.client.id, displayName: created.client.displayName }, ...prev]);
          setSelectedId(created.client.id);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
