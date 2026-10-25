"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { createAgentClient, fetchAgentClients } from "@/lib/agent-r03/api";
import { patchStoreOrderReceivingClient } from "@/lib/history-receiving-client-api";
import type { PurchaseRow, ReceivingClientLinkSnapshot } from "@/lib/history-types";
import { AgentClientFormDialog } from "@/components/agent-r03/AgentClientFormDialog";
import { Button } from "@/components/ui/Button";
import styles from "./history.module.css";

type PendingAction =
  | { kind: "unlink"; expectedVersion: number }
  | { kind: "link"; agentClientId: string; label: string; expectedVersion: number };

type PurchaseReceivingClientPanelProps = {
  purchase: PurchaseRow;
  onLinked: (patch: {
    orderId: string;
    receivingClient: ReceivingClientLinkSnapshot | null;
    receivingLinkRevision: number;
  }) => void;
  onReload: () => void;
};

function currentRevision(purchase: PurchaseRow): number {
  return purchase.receivingLinkRevision ?? purchase.receivingClient?.version ?? 0;
}

export function PurchaseReceivingClientPanel({
  purchase,
  onLinked,
  onReload,
}: PurchaseReceivingClientPanelProps) {
  const orderId = purchase.orderId ?? purchase.id;
  const scopeKey = orderId;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const searchGeneration = useRef(0);
  const panelGeneration = useRef(0);

  const linked = purchase.receivingClient ?? null;
  const revision = currentRevision(purchase);

  const loadClients = useCallback(
    async (q: string, generation: number) => {
      setSearching(true);
      setSearchError("");
      try {
        const data = await fetchAgentClients({ q: q.trim() || undefined, limit: 20 });
        if (generation !== searchGeneration.current) return;
        setClients(data.clients.map((c) => ({ id: c.id, displayName: c.displayName })));
      } catch (caught) {
        if (generation !== searchGeneration.current) return;
        setSearchError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить клиентов",
        );
        setClients([]);
      } finally {
        if (generation === searchGeneration.current) {
          setSearching(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    panelGeneration.current += 1;
    setQuery("");
    setClients([]);
    setSelectedId(null);
    setPending(null);
    setActionError("");
    setSearchError("");
    setSaving(false);
    setCreateOpen(false);
    searchGeneration.current += 1;
    if (purchase.canManageReceivingClient) {
      const generation = searchGeneration.current;
      void loadClients("", generation);
    }
  }, [scopeKey, loadClients, purchase.canManageReceivingClient]);

  useEffect(() => {
    if (!purchase.canManageReceivingClient) return;
    const generation = ++searchGeneration.current;
    const handle = window.setTimeout(() => void loadClients(query, generation), 300);
    return () => window.clearTimeout(handle);
  }, [loadClients, purchase.canManageReceivingClient, query, scopeKey]);

  const selectedLabel = useMemo(() => {
    if (!selectedId) return null;
    return clients.find((c) => c.id === selectedId)?.displayName ?? null;
  }, [clients, selectedId]);

  async function executePending() {
    if (!pending) return;
    const capturedOrderId = orderId;
    const capturedPanelGen = panelGeneration.current;
    setSaving(true);
    setActionError("");
    try {
      const res = await patchStoreOrderReceivingClient(
        capturedOrderId,
        pending.kind === "unlink"
          ? { action: "unlink", expectedVersion: pending.expectedVersion }
          : {
              action: "link",
              agentClientId: pending.agentClientId,
              expectedVersion: pending.expectedVersion,
            },
      );
      if (capturedPanelGen !== panelGeneration.current) return;
      onLinked({
        orderId: capturedOrderId,
        receivingClient: res.receivingClient,
        receivingLinkRevision: res.receivingLinkRevision,
      });
      setPending(null);
      setSelectedId(null);
    } catch (caught) {
      if (capturedPanelGen !== panelGeneration.current) return;
      if (caught instanceof RemcardApiError && caught.status === 409) {
        setActionError("Привязка уже изменилась. Обновляем карточку…");
        setPending(null);
        onReload();
        return;
      }
      setActionError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие",
      );
    } finally {
      setSaving(false);
    }
  }

  function requestUnlink() {
    setPending({ kind: "unlink", expectedVersion: revision });
  }

  function requestLink() {
    if (!selectedId) return;
    const label = selectedLabel ?? "клиента";
    if (linked && linked.agentClientId === selectedId) return;
    setPending({
      kind: "link",
      agentClientId: selectedId,
      label,
      expectedVersion: revision,
    });
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
          <Button type="button" variant="secondary" disabled={saving} onClick={requestUnlink}>
            Снять привязку
          </Button>
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
          <button
            type="button"
            onClick={() => {
              const generation = ++searchGeneration.current;
              void loadClients(query, generation);
            }}
          >
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
                  setPending(null);
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
        <Button
          type="button"
          disabled={!selectedId || saving || Boolean(linked && linked.agentClientId === selectedId)}
          onClick={requestLink}
        >
          {linked ? "Сменить клиента" : "Сохранить привязку"}
        </Button>
      </div>

      {pending ? (
        <div className={styles.confirmBox} data-testid="receiving-client-pending">
          <p className={styles.meta}>
            {pending.kind === "unlink"
              ? "Снять привязку покупки к текущему клиенту?"
              : `Привязать покупку к «${pending.label}»?`}
          </p>
          <div className={styles.rowHeader}>
            <Button type="button" disabled={saving} onClick={() => void executePending()}>
              Подтвердить
            </Button>
            <Button type="button" variant="text" onClick={() => setPending(null)}>
              Отмена
            </Button>
          </div>
        </div>
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
          const capturedPanelGen = panelGeneration.current;
          const created = await createAgentClient(values);
          if (capturedPanelGen !== panelGeneration.current) return;
          setClients((prev) => [
            { id: created.client.id, displayName: created.client.displayName },
            ...prev,
          ]);
          setSelectedId(created.client.id);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
