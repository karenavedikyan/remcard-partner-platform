"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import type { RecordRowAction } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import { AgentR03ListToolbar } from "./AgentR03ListToolbar";
import { AgentR03Pagination } from "./AgentR03Pagination";
import { AgentR03MobileClientRow } from "./AgentR03MobileClientRow";
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

export function AgentClientsList() {
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
    setSelected(new Set());
    void load();
  }, [load]);

  const visibleIds = useMemo(() => items.map((c) => c.id), [items]);

  function resetFiltersAndPage() {
    setPage(1);
    setSelected(new Set());
  }

  function runSearch() {
    setAppliedQ(qDraft.trim());
    setPage(1);
    setSelected(new Set());
    setSearchRevision((r) => r + 1);
  }

  async function submitClient(values: AgentClientFormValues) {
    const body = {
      displayName: values.displayName,
      phone: values.phone || undefined,
      email: values.email || undefined,
      city: values.city || undefined,
      note: values.note || undefined,
    };
    if (editClient) {
      await patchAgentClient(editClient.id, {
        displayName: body.displayName,
        phone: values.phone ? values.phone : null,
        email: values.email ? values.email : null,
        city: values.city ? values.city : null,
        note: values.note ? values.note : null,
      });
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

  function clientRowActions(client: AgentClientRow): RecordRowAction[] {
    return [
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
    ];
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
    <>
      <div className={styles.pageActions}>
        <Button onClick={openCreate}>Добавить клиента</Button>
      </div>
      <AgentR03ListToolbar
        searchPlaceholder="Имя, контакт, город"
        q={qDraft}
        onQChange={setQDraft}
        onSearch={runSearch}
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
        <div className={styles.list}>
          {items.map((client) => (
            <article key={client.id} className={styles.card}>
              <div className={styles.cardTop}>
                <label className={styles.selectCol}>
                  <input
                    type="checkbox"
                    checked={selected.has(client.id)}
                    onChange={(e) => toggleSelected(client.id, e.target.checked)}
                  />
                </label>
                <div className={styles.cardMain}>
                  <Link href={`/clients/${client.id}`} className={styles.openLink}>
                    {client.displayName}
                  </Link>
                  <p className={styles.meta}>
                    {client.city ?? "Город не указан"}
                    {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                    {client.certificateCount
                      ? ` · сертификатов: ${client.certificateCount}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className={styles.cardBottom}>
                <span className={styles.meta}>{archived ? "В архиве" : "Активен"}</span>
                <RecordRowActions
                  ariaLabel="Действия с клиентом"
                  actions={clientRowActions(client)}
                />
              </div>
            </article>
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
                archived={archived}
                selected={selected.has(client.id)}
                onSelectChange={(checked) => toggleSelected(client.id, checked)}
                actions={clientRowActions(client)}
              />
            ))}
          </div>
          <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th />
                  <th>Клиент</th>
                  <th>Контакты</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(client.id)}
                        onChange={(e) => toggleSelected(client.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <Link href={`/clients/${client.id}`}>{client.displayName}</Link>
                    </td>
                    <td>
                      {client.city ?? "—"}
                      {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                    </td>
                    <td>{archived ? "Архив" : "Активен"}</td>
                    <td>
                      <RecordRowActions ariaLabel="Действия" actions={clientRowActions(client)} />
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
                note: editClient.note ?? "",
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={submitClient}
      />
    </>
  );
}
