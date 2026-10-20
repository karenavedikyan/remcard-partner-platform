"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readAgentR03ViewMode, writeAgentR03ViewMode } from "@/lib/agent-r03/viewModeStorage";
import { AgentR03PageIntro } from "./AgentR03PageIntro";
import { RemcardApiError } from "@/lib/api-client";
import {
  batchAgentClients,
  createAgentClient,
  deleteAgentClient,
  fetchAgentClients,
  patchAgentClient,
} from "@/lib/agent-r03/api";
import { CLIENT_SORT_OPTIONS } from "@/lib/agent-r03/listSortOptions";
import type { AgentClientRow, AgentR03ListMeta, AgentR03ListSort } from "@/lib/agent-r03/types";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import type { RecordRowAction } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import { AgentR03ListToolbar } from "./AgentR03ListToolbar";
import { AgentR03Pagination } from "./AgentR03Pagination";
import { AgentR03MobileClientRow } from "./AgentR03MobileClientRow";
import {
  clientPurchaseStatusLabel,
  clientRowCaption,
  clientRowDetail,
} from "@/lib/agent-r03/clientListRow";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import styles from "./agent-r03.module.css";

const emptyMeta: AgentR03ListMeta = {
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 1,
  activeCount: 0,
  archivedCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export function AgentClientsList({ accessMode = "agent" }: { accessMode?: OwnerClientsAccessMode }) {
  const router = useRouter();
  const [items, setItems] = useState<AgentClientRow[]>([]);
  const [meta, setMeta] = useState<AgentR03ListMeta>(emptyMeta);
  const [archived, setArchived] = useState(false);
  const [qDraft, setQDraft] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [searchRevision, setSearchRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<AgentR03ListSort>("updated_desc");
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState<AgentClientRow | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [shareClient, setShareClient] = useState<AgentClientRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await fetchAgentClients({
        archived,
        q: appliedQ || undefined,
        page,
        limit: pageSize,
        sort,
      });
      setItems(data.clients ?? []);
      setMeta({
        page: data.page ?? page,
        pageSize: data.pageSize ?? pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
        activeCount: data.activeCount ?? 0,
        archivedCount: data.archivedCount ?? 0,
        hasNextPage: data.hasNextPage ?? false,
        hasPrevPage: data.hasPrevPage ?? false,
        sort: data.sort,
      });
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить клиентов");
    }
  }, [appliedQ, archived, page, pageSize, sort, searchRevision]);

  useEffect(() => {
    const stored = readAgentR03ViewMode("clients");
    if (stored) setViewMode(stored);
  }, []);

  useEffect(() => {
    setSelected(new Set());
    void load();
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = qDraft.trim();
      setAppliedQ((prev) => {
        if (prev === trimmed) return prev;
        setPage(1);
        setSelected(new Set());
        setSearchRevision((r) => r + 1);
        return trimmed;
      });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qDraft]);

  const visibleIds = useMemo(() => items.map((c) => c.id), [items]);

  function resetFiltersAndPage() {
    setPage(1);
    setSelected(new Set());
  }

  function resetAllFilters() {
    setQDraft("");
    setAppliedQ("");
    setArchived(false);
    setSort("updated_desc");
    resetFiltersAndPage();
    setSearchRevision((r) => r + 1);
  }

  const filtersActive = Boolean(appliedQ || archived || sort !== "updated_desc");

  async function submitClient(values: AgentClientFormValues) {
    const body = {
      displayName: values.displayName,
      phone: values.phone || undefined,
      email: values.email || undefined,
      city: values.city || undefined,
      note: values.note || undefined,
      ...(accessMode === "specialist" ? { need: values.need || undefined } : {}),
    };
    if (editClient) {
      const patch: Parameters<typeof patchAgentClient>[1] = {
        displayName: body.displayName as string,
        phone: values.phone ? values.phone : null,
        email: values.email ? values.email : null,
        city: values.city ? values.city : null,
        note: values.note ? values.note : null,
      };
      if (accessMode === "specialist") {
        patch.need = values.need ? values.need : null;
      }
      await patchAgentClient(editClient.id, patch);
    } else {
      await createAgentClient(body);
    }
    await load();
  }

  function openCreate() {
    setEditClient(null);
    setFormOpen(true);
  }

  function openEdit(client: AgentClientRow) {
    setEditClient(client);
    setFormOpen(true);
  }

  function clientRowActions(client: AgentClientRow, includeOpen = false): RecordRowAction[] {
    const actions: RecordRowAction[] = [];
    if (includeOpen) {
      actions.push({
        id: "open",
        label: "Открыть",
        disabled: busy,
        onClick: () => router.push(`/clients/${client.id}`),
      });
    }
    actions.push(
      {
        id: "share",
        label: "Поделиться контактами",
        disabled: busy,
        onClick: () => setShareClient(client),
      },
      {
        id: "rename",
        label: "Редактировать",
        disabled: busy,
        onClick: () => openEdit(client),
      },
      {
        id: archived ? "restore" : "archive",
        label: archived ? "Восстановить" : "В архив",
        disabled: busy,
        onClick: () =>
          void patchAgentClient(client.id, {
            action: archived ? "restore" : "archive",
          }).then(() => load()),
      },
      {
        id: "delete",
        label: "Удалить",
        disabled: client.certificateCount > 0 || busy,
        disabledReason: "Есть связанные сертификаты",
        onClick: () => {
          if (!window.confirm("Удалить клиента?")) return;
          void deleteAgentClient(client.id)
            .then(() => load())
            .catch((caught) => {
              window.alert(
                caught instanceof RemcardApiError ? caught.message : "Не удалось удалить",
              );
            });
        },
      },
    );
    return actions;
  }

  async function runBatch(action: "archive" | "restore" | "delete") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(`Удалить ${ids.length} клиент(ов)?`)) return;
    setBusy(true);
    try {
      const res = await batchAgentClients({ action, ids });
      if (res.skippedCount > 0) {
        window.alert(
          `Обработано: ${res.processedCount}, пропущено: ${res.skippedCount} (защищённые записи).`,
        );
      }
      setSelected(new Set());
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Ошибка пакетного действия");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const currentPage = meta.page ?? page;
  const totalPages = Math.max(1, meta.totalPages ?? 1);

  return (
    <div className={styles.r03Root}>
      {accessMode === "agent" ? <AgentR03PageIntro variant="clients" /> : null}
      <div className={styles.pageActions}>
        <Button onClick={openCreate}>Добавить клиента</Button>
      </div>
      <div data-testid="agent-r03-capture-body">
      <AgentR03ListToolbar
        searchPlaceholder="Имя, контакт, город или задача"
        q={qDraft}
        onQChange={setQDraft}
        filtersActive={filtersActive}
        onResetFilters={resetAllFilters}
        archived={archived}
        onShowChange={(v) => {
          setArchived(v);
          resetFiltersAndPage();
        }}
        activeCount={meta.activeCount}
        archivedCount={meta.archivedCount}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          writeAgentR03ViewMode("clients", mode);
          setSelected(new Set());
        }}
        foundCount={meta.totalCount}
        selectableIds={visibleIds}
        selectedIds={selected}
        onSelectPage={(checked) => {
          setSelected((prev) => {
            const next = new Set(prev);
            for (const id of visibleIds) {
              if (checked) next.add(id);
              else next.delete(id);
            }
            return next;
          });
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          resetFiltersAndPage();
        }}
        sortOptions={CLIENT_SORT_OPTIONS}
      />

      {loadState === "loading" && items.length === 0 ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" && items.length === 0 ? (
        <p className={styles.empty}>{archived ? "Архив пуст." : "Добавьте первого клиента."}</p>
      ) : null}

      {items.length > 0 && viewMode === "cards" ? (
        <div className={styles.list} data-testid="agent-r03-cards-grid">
          {items.map((client) => (
            <div
              key={client.id}
              className={`${styles.collectionCardShell} ${selected.has(client.id) ? styles.collectionCardShellSelected : ""}`}
            >
              <label className={styles.collectionCardSelect}>
                <input
                  type="checkbox"
                  checked={selected.has(client.id)}
                  onChange={(e) => toggleSelected(client.id, e.target.checked)}
                />
                Выбрать
              </label>
              <article className={styles.clientCard}>
                <span className={styles.purchasePill}>
                  {clientPurchaseStatusLabel(client, archived)}
                </span>
                <Link href={`/clients/${client.id}`} className={styles.clientCardName}>
                  {client.displayName}
                </Link>
                <p className={styles.clientCardDetail}>{clientRowDetail(client, accessMode)}</p>
                {clientRowCaption(client, accessMode) ? (
                  <p className={styles.clientCardTask}>{clientRowCaption(client, accessMode)}</p>
                ) : null}
                <div className={styles.clientCardActions}>
                  <RecordRowActions
                    ariaLabel="Действия с клиентом"
                    actions={clientRowActions(client)}
                    variant="cardToolbar"
                  />
                </div>
              </article>
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 && viewMode === "list" ? (
        <>
          <div className={`${styles.collectionPanel} ${styles.mobileOnly}`}>
            {items.map((client) => (
              <AgentR03MobileClientRow
                key={client.id}
                client={client}
                accessMode={accessMode}
                archived={archived}
                selected={selected.has(client.id)}
                onSelectChange={(checked) => toggleSelected(client.id, checked)}
                actions={clientRowActions(client)}
              />
            ))}
          </div>
          <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
            <table className={styles.collectionTable}>
              <thead>
                <tr>
                  <th />
                  <th>Клиент</th>
                  <th>Подробности</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((client) => (
                  <tr key={client.id} data-parity-client-id={client.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(client.id)}
                        onChange={(e) => toggleSelected(client.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <Link href={`/clients/${client.id}`} className={styles.collectionOpenLink}>
                        {client.displayName}
                      </Link>
                      {clientRowCaption(client, accessMode) ? (
                        <small className={styles.collectionCaption}>
                          {clientRowCaption(client, accessMode)}
                        </small>
                      ) : null}
                    </td>
                    <td className={styles.collectionDetail}>
                      {clientRowDetail(client, accessMode)}
                    </td>
                    <td>
                      <span className={styles.purchasePill}>
                        {clientPurchaseStatusLabel(client, archived)}
                      </span>
                    </td>
                    <td className={styles.collectionRowAction}>
                      <RecordRowActions
                        ariaLabel="Действия"
                        actions={clientRowActions(client, true)}
                        variant="listRow"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {items.length > 0 ? (
        <AgentR03Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
            setSelected(new Set());
          }}
          onPrev={() => {
            setPage((p) => Math.max(1, p - 1));
            setSelected(new Set());
          }}
          onNext={() => {
            setPage((p) => p + 1);
            setSelected(new Set());
          }}
          hasPrev={meta.hasPrevPage}
          hasNext={meta.hasNextPage}
        />
      ) : null}
      </div>

      {selected.size > 0 ? (
        <div className={styles.batchBar}>
          <span>Выбрано: {selected.size}</span>
          {!archived ? (
            <Button variant="secondary" disabled={busy} onClick={() => void runBatch("archive")}>
              В архив
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void runBatch("restore")}>
              Восстановить
            </Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => void runBatch("delete")}>
            Удалить
          </Button>
        </div>
      ) : null}

      <SharePreviewDialog
        open={Boolean(shareClient)}
        onClose={() => setShareClient(null)}
        title="Контакты клиента"
        lines={[]}
        url=""
        clientContacts={shareClient}
      />

      <AgentClientFormDialog
        accessMode={accessMode}
        open={formOpen}
        title={editClient ? "Редактировать клиента" : "Новый клиент"}
        submitLabel={editClient ? "Сохранить" : "Добавить"}
        initial={
          editClient
            ? {
                displayName: editClient.displayName,
                phone: editClient.phone ?? "",
                email: editClient.email ?? "",
                city: editClient.city ?? "",
                need: editClient.need ?? "",
                note: editClient.note ?? "",
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={submitClient}
      />
    </div>
  );
}
