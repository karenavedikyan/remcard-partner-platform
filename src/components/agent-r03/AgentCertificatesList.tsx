"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  batchAgentCertificates,
  deleteAgentCertificate,
  fetchAgentCertificates,
  patchAgentCertificate,
} from "@/lib/agent-r03/api";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import { resolveCertificatePageUrl } from "@/lib/certificate-url";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import styles from "./agent-r03.module.css";

export function AgentCertificatesList() {
  const [items, setItems] = useState<AgentCertificateRow[]>([]);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [sharePreview, setSharePreview] = useState<{
    lines: string[];
    url: string;
  } | null>(null);

  const load = useCallback(
    async (opts?: { cursor?: string; append?: boolean }) => {
    setLoadState("loading");
    setError("");
    try {
      const data = await fetchAgentCertificates({
        archived,
        q: q.trim() || undefined,
        cursor: opts?.cursor,
      });
      const rows = data.certificates ?? [];
      setItems((prev) => {
        const merged = opts?.append ? [...prev, ...rows] : rows;
        const visible = new Set(merged.map((c) => c.id));
        setSelected((sel) => {
          const next = new Set<string>();
          for (const id of sel) {
            if (visible.has(id)) next.add(id);
          }
          return next;
        });
        return merged;
      });
      setNextCursor(data.nextCursor ?? null);
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить сертификаты",
      );
    }
  },
    [archived, q],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visibleIds = useMemo(() => items.map((c) => c.id), [items]);

  async function runBatch(action: "archive" | "restore" | "delete") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(`Удалить ${ids.length} сертификат(ов)?`)) return;
    setBusy(true);
    try {
      const res = await batchAgentCertificates({ action, ids });
      if (res.skippedCount > 0) {
        window.alert(
          `Обработано: ${res.processedCount}, пропущено: ${res.skippedCount} (защищённые записи).`,
        );
      }
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Ошибка пакетного действия");
    } finally {
      setBusy(false);
    }
  }

  function shareCert(cert: AgentCertificateRow) {
    const url = resolveCertificatePageUrl(cert);
    if (!url || cert.status === "CANCELLED") {
      window.alert("Публичная ссылка недоступна для этой записи.");
      return;
    }
    setSharePreview({
      lines: [`Код: ${cert.displayCode}`, url],
      url,
    });
  }

  async function renameCert(cert: AgentCertificateRow) {
    const next = window.prompt("Название для себя", cert.userAlias ?? cert.title);
    if (next == null) return;
    if (!next.trim()) {
      window.alert("Название не может быть пустым.");
      return;
    }
    setBusy(true);
    try {
      await patchAgentCertificate(cert.id, { userAlias: next.trim() });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.pageActions}>
        <Link href="/certificates/new">
          <Button>Создать сертификат</Button>
        </Link>
        <Button variant="secondary" onClick={() => setArchived((v) => !v)}>
          {archived ? "Активные" : "Архив"}
        </Button>
        <div className={styles.viewToggle}>
          <button
            type="button"
            data-active={viewMode === "cards"}
            onClick={() => setViewMode("cards")}
          >
            Карточки
          </button>
          <button
            type="button"
            data-active={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            Список
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Поиск: название, код, партнёр"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button variant="secondary" onClick={() => void load()}>
          Найти
        </Button>
      </div>

      {loadState === "loading" ? <p className={styles.loading}>Загрузка…</p> : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" && items.length === 0 ? (
        <div className={styles.empty}>
          <p>{archived ? "В архиве пока пусто." : "Сертификатов пока нет."}</p>
        </div>
      ) : null}

      {loadState === "loaded" && items.length > 0 && viewMode === "cards" ? (
        <div className={styles.list}>
          {items.map((cert) => (
            <article key={cert.id} className={styles.card}>
              <div className={styles.cardTop}>
                <label className={styles.selectCol}>
                  <input
                    type="checkbox"
                    checked={selected.has(cert.id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(cert.id);
                        else next.delete(cert.id);
                        return next;
                      });
                    }}
                  />
                </label>
                <div className={styles.cardMain}>
                  <Link href={`/certificates/${cert.id}`} className={styles.openLink}>
                    {cert.userAlias ?? cert.title}
                  </Link>
                  <p className={styles.meta}>
                    {cert.displayCode} · {cert.directionLabel ?? "—"} · скидка {cert.discountPercent}%
                  </p>
                </div>
                <StatusBadge
                  label={certificateStatusLabel(cert.status)}
                  tone={certificateStatusTone(cert.status)}
                />
              </div>
              <div className={styles.cardBottom}>
                <span className={styles.meta}>
                  {cert.agentClient ? `Клиент: ${cert.agentClient.displayName}` : "Без клиента"}
                </span>
                <RecordRowActions
                  ariaLabel="Действия с сертификатом"
                  actions={[
                    {
                      id: "share",
                      label: "Поделиться",
                      disabled: cert.status === "CANCELLED",
                      disabledReason: "Ссылка неактивна",
                      onClick: () => void shareCert(cert),
                    },
                    {
                      id: "rename",
                      label: "Переименовать",
                      onClick: () => void renameCert(cert),
                    },
                    {
                      id: archived ? "restore" : "archive",
                      label: archived ? "Восстановить" : "В архив",
                      onClick: () => {
                        setBusy(true);
                        void patchAgentCertificate(cert.id, {
                          action: archived ? "restore" : "archive",
                        })
                          .then(() => load())
                          .catch((caught) => {
                            window.alert(
                              caught instanceof RemcardApiError
                                ? caught.message
                                : "Не удалось выполнить действие",
                            );
                          })
                          .finally(() => setBusy(false));
                      },
                    },
                    {
                      id: "delete",
                      label: "Удалить",
                      disabled: cert.hasOrders,
                      disabledReason: "Есть покупки — используйте архив",
                      onClick: () => {
                        if (!window.confirm("Удалить сертификат без возможности восстановления?"))
                          return;
                        setBusy(true);
                        void deleteAgentCertificate(cert.id)
                          .then(() => load())
                          .catch((caught) => {
                            window.alert(
                              caught instanceof RemcardApiError
                                ? caught.message
                                : "Не удалось удалить",
                            );
                          })
                          .finally(() => setBusy(false));
                      },
                    },
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {loadState === "loaded" && items.length > 0 && viewMode === "list" ? (
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th />
                <th>Название</th>
                <th>Код</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cert) => (
                <tr key={cert.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(cert.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(cert.id);
                          else next.delete(cert.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td>
                    <Link href={`/certificates/${cert.id}`}>
                      {cert.userAlias ?? cert.title}
                    </Link>
                  </td>
                  <td>{cert.displayCode}</td>
                  <td>{certificateStatusLabel(cert.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {nextCursor ? (
        <div className={styles.pager}>
          <Button variant="secondary" onClick={() => void load({ cursor: nextCursor, append: true })}>
            Показать ещё
          </Button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className={styles.batchBar}>
          <span>Выбрано: {selected.size}</span>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setSelected(new Set(visibleIds));
            }}
          >
            Выбрать все на экране
          </Button>
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
        open={Boolean(sharePreview)}
        title="Сертификат Ремкард"
        lines={sharePreview?.lines ?? []}
        url={sharePreview?.url ?? ""}
        onClose={() => setSharePreview(null)}
      />
    </>
  );
}
