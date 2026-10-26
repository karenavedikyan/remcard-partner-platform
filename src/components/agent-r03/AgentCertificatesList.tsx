"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpecialistCertificateCreateDialog } from "@/components/specialist-certificates/SpecialistCertificateCreateDialog";
import { SpecialistCertificateDetailDialog } from "@/components/specialist-certificates/SpecialistCertificateDetailDialog";
import { certificateListDetail } from "@/lib/agent-r03/certificateOffers";
import { readAgentR03ViewMode, writeAgentR03ViewMode } from "@/lib/agent-r03/viewModeStorage";
import { AgentR03PageIntro } from "./AgentR03PageIntro";
import { RemcardApiError } from "@/lib/api-client";
import {
  batchAgentCertificates,
  deleteAgentCertificate,
  fetchAgentCertificates,
  patchAgentCertificate,
} from "@/lib/agent-r03/api";
import {
  batchSpecialistIssuerCertificates,
  deleteSpecialistIssuerCertificate,
  fetchSpecialistIssuerCertificates,
  patchSpecialistIssuerCertificate,
} from "@/lib/specialist-certificates/api";
import {
  batchBusinessOwnerCertificates,
  deleteBusinessOwnerCertificate,
  fetchBusinessOwnerCertificates,
  patchBusinessOwnerCertificate,
} from "@/lib/business-owner-certificates/api";
import { businessCertificatesPageCopy } from "@/lib/business-owner-certificates/copy";
import { useOwnerIssuerModeValue } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { SpecialistCertificateEditDiscountsDialog } from "./SpecialistCertificateEditDiscountsDialog";
import { SPECIALIST_CERTIFICATES_PAGE } from "@/lib/specialist-certificates/copy";
import {
  CERT_SORT_OPTIONS,
  CERT_STATUS_FILTER_OPTIONS,
} from "@/lib/agent-r03/listSortOptions";
import type { AgentCertificateRow, AgentR03ListMeta, AgentR03ListSort } from "@/lib/agent-r03/types";
import {
  certificateLifecycleStatusLabel,
  certificatePurchaseStatusLabel,
} from "@/lib/agent-r03/certificatePurchaseStatus";
import { resolveCertificatePageUrl } from "@/lib/certificate-url";
import { Button } from "@/components/ui/Button";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import { AgentR03ListToolbar } from "./AgentR03ListToolbar";
import { AgentR03Pagination } from "./AgentR03Pagination";
import { AgentCertificateCard } from "./AgentCertificateCard";
import { AgentR03MobileCertRow } from "./AgentR03MobileCertRow";
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

export type AgentCertificatesListAccessMode = "agent" | "specialist" | "business";

type AgentCertificatesListProps = {
  accessMode?: AgentCertificatesListAccessMode;
};

export function AgentCertificatesList({ accessMode = "agent" }: AgentCertificatesListProps = {}) {
  const isSpecialist = accessMode === "specialist";
  const isBusiness = accessMode === "business";
  const isIssuerShell = isSpecialist || isBusiness;
  const ownerMode = useOwnerIssuerModeValue();
  const businessPageCopy = isBusiness
    ? businessCertificatesPageCopy({
        partnerType: ownerMode?.businessPartnerType ?? "STORE",
      })
    : null;
  const issuerPageCopy = isBusiness
    ? businessPageCopy!
    : SPECIALIST_CERTIFICATES_PAGE;
  const issuerListApi = isBusiness ? "business" : "specialist";
  const patchIssuerCertificate = isBusiness
    ? patchBusinessOwnerCertificate
    : isSpecialist
      ? patchSpecialistIssuerCertificate
      : patchAgentCertificate;
  const deleteIssuerCertificate = isBusiness
    ? deleteBusinessOwnerCertificate
    : isSpecialist
      ? deleteSpecialistIssuerCertificate
      : deleteAgentCertificate;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailCertificateId, setDetailCertificateId] = useState<string | null>(null);
  const createClientId = searchParams.get("clientId")?.trim() || undefined;
  const certificateQueryId = searchParams.get("certificate")?.trim() || null;

  useEffect(() => {
    if (!isIssuerShell) return;
    if (searchParams.get("create") === "1") {
      setCreateDialogOpen(true);
    }
  }, [isIssuerShell, searchParams]);

  useEffect(() => {
    if (!isIssuerShell) return;
    if (certificateQueryId) {
      setDetailCertificateId(certificateQueryId);
    }
  }, [certificateQueryId, isIssuerShell]);

  function openCreateDialog() {
    setCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    setCreateDialogOpen(false);
    if (isIssuerShell && searchParams.get("create") === "1") {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("create");
      const qs = next.toString();
      router.replace(qs ? `/recommendations?${qs}` : "/recommendations");
    }
  }

  function closeDetailDialog() {
    setDetailCertificateId(null);
    if (!isIssuerShell || !certificateQueryId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("certificate");
    const qs = next.toString();
    router.replace(qs ? `/recommendations?${qs}` : "/recommendations");
  }
  const detailBasePath = isIssuerShell ? "/recommendations" : "/certificates";
  const [items, setItems] = useState<AgentCertificateRow[]>([]);
  const [meta, setMeta] = useState<AgentR03ListMeta>(emptyMeta);
  const [archived, setArchived] = useState(false);
  const [qDraft, setQDraft] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [searchRevision, setSearchRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<AgentR03ListSort>("created_desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sharePreview, setSharePreview] = useState<{
    lines: string[];
    url: string;
  } | null>(null);
  const [editDiscountsCert, setEditDiscountsCert] = useState<AgentCertificateRow | null>(null);
  const listFetchGenerationRef = useRef(0);

  const load = useCallback(async () => {
    const fetchId = ++listFetchGenerationRef.current;
    const preserveItemsOnError = isIssuerShell;
    setLoadState("loading");
    setError("");
    try {
      const listParams = {
        archived,
        q: appliedQ || undefined,
        page,
        limit: pageSize,
        sort,
        status: statusFilter || undefined,
      };
      const data = isBusiness
        ? await fetchBusinessOwnerCertificates(listParams)
        : isSpecialist
          ? await fetchSpecialistIssuerCertificates(listParams)
          : await fetchAgentCertificates(listParams);
      if (fetchId !== listFetchGenerationRef.current) {
        return;
      }
      setItems(data.certificates ?? []);
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
      if (fetchId !== listFetchGenerationRef.current) {
        return;
      }
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить сертификаты",
      );
      if (preserveItemsOnError) {
        setLoadState("loaded");
      } else {
        setLoadState("error");
      }
    }
  }, [appliedQ, archived, isBusiness, isSpecialist, page, pageSize, sort, statusFilter, searchRevision]);

  useEffect(() => {
    const stored = readAgentR03ViewMode("certificates");
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
    setStatusFilter("");
    setSort("created_desc");
    resetFiltersAndPage();
    setSearchRevision((r) => r + 1);
  }

  const filtersActive = Boolean(appliedQ || archived || statusFilter || sort !== "created_desc");

  async function runBatch(action: "archive" | "restore" | "delete") {
    let ids = [...selected];
    if (action === "delete" && isBusiness) {
      ids = ids.filter((id) => {
        const cert = items.find((c) => c.id === id);
        return cert && cert.canMutateIssuer === true;
      });
      if (!ids.length) {
        window.alert("Удаление доступно только для сертификатов, которые вы создали.");
        return;
      }
    }
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(`Удалить ${ids.length} сертификат(ов)?`)) return;
    setBusy(true);
    try {
      const res = isBusiness
        ? await batchBusinessOwnerCertificates({ action, ids })
        : isSpecialist
          ? await batchSpecialistIssuerCertificates({ action, ids })
          : await batchAgentCertificates({ action, ids });
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

  function certRowActions(cert: AgentCertificateRow): import("./RecordRowActions").RecordRowAction[] {
    const canIssuerMutate = !isBusiness || cert.canMutateIssuer === true;
    return [
      {
        id: "share",
        label: "Поделиться",
        disabled: cert.status === "CANCELLED" || busy,
        disabledReason: "Ссылка неактивна",
        onClick: () => shareCert(cert),
      },
      {
        id: "rename",
        label: "Переименовать",
        disabled: busy,
        onClick: () => void renameCert(cert),
      },
      ...(isIssuerShell && canIssuerMutate
        ? [
            {
              id: "edit-discounts",
              label: "Изменить скидки",
              disabled: cert.hasOrders || busy || cert.status === "CANCELLED",
              disabledReason: cert.hasOrders
                ? "Есть использования"
                : "Сертификат отключён",
              onClick: () => setEditDiscountsCert(cert),
            } as import("./RecordRowActions").RecordRowAction,
          ]
        : []),
      {
        id: archived ? "restore" : "archive",
        label: archived ? "Восстановить" : "В архив",
        disabled: busy,
        onClick: () => {
          setBusy(true);
          void patchIssuerCertificate(cert.id, {
            action: archived ? "restore" : "archive",
          })
            .then(() => load())
            .catch((caught) => {
              window.alert(
                caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие",
              );
            })
            .finally(() => setBusy(false));
        },
      },
      ...(isIssuerShell && canIssuerMutate
        ? [
            {
              id: "cancel",
              label: "Отключить ссылку",
              disabled: cert.status === "CANCELLED" || cert.hasOrders || busy,
              disabledReason: cert.hasOrders
                ? "Есть использования"
                : "Ссылка уже отключена",
              onClick: () => {
                if (!window.confirm("Отключить ссылку? Новые использования будут недоступны.")) return;
                setBusy(true);
                void patchIssuerCertificate(cert.id, { action: "cancel" })
                  .then(() => load())
                  .catch((caught) => {
                    window.alert(
                      caught instanceof RemcardApiError ? caught.message : "Не удалось отключить",
                    );
                  })
                  .finally(() => setBusy(false));
              },
            } as import("./RecordRowActions").RecordRowAction,
          ]
        : []),
      ...(canIssuerMutate || !isBusiness
        ? [
            {
              id: "delete",
              label: "Удалить",
              disabled: cert.hasOrders || busy,
              disabledReason: "Есть покупки — используйте архив",
              onClick: () => {
                if (!window.confirm("Удалить сертификат без возможности восстановления?")) return;
                setBusy(true);
                void deleteIssuerCertificate(cert.id)
                  .then(() => load())
                  .catch((caught) => {
                    window.alert(
                      caught instanceof RemcardApiError ? caught.message : "Не удалось удалить",
                    );
                  })
                  .finally(() => setBusy(false));
              },
            } as import("./RecordRowActions").RecordRowAction,
          ]
        : []),
    ];
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
      await patchIssuerCertificate(cert.id, {
        userAlias: next.trim(),
      });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
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
  const selectedRows = items.filter((c) => selected.has(c.id));
  const batchDeleteAllowed =
    !isBusiness || selectedRows.every((c) => c.canMutateIssuer === true);

  function formatCertDate(iso: string) {
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  return (
    <div
      className={styles.r03Root}
      data-testid={
        isBusiness
          ? "business-certificates-root"
          : isSpecialist
            ? "specialist-certificates-root"
            : undefined
      }
    >
      {isBusiness ? (
        <section className={styles.businessCertStack} data-testid="business-certificates-intro">
          <p className={styles.pageIntroMuted}>{businessPageCopy!.description}</p>
          <Button
            className={styles.heroCtaInline}
            data-testid="business-certificates-create-cta"
            onClick={openCreateDialog}
          >
            {businessPageCopy!.createCta}
          </Button>
          <details className={styles.businessCertOptional} data-testid="business-certificates-client-arrived">
            <summary>{businessPageCopy!.clientArrivedSummary}</summary>
            <p className={styles.businessCertOptionalHint}>{businessPageCopy!.clientArrivedHint}</p>
            <Link href="/scanner" className={styles.businessCertGhostLink}>
              {businessPageCopy!.verifyCertificateCta}
            </Link>
          </details>
        </section>
      ) : isIssuerShell ? (
        <section className={styles.pageIntroBlock}>
          <p className={styles.pageIntroMuted}>{issuerPageCopy.description}</p>
          <Button className={styles.heroCtaInline} onClick={openCreateDialog}>
            {issuerPageCopy.createCta}
          </Button>
        </section>
      ) : (
        <AgentR03PageIntro variant="certificates" certificateActiveCount={meta.activeCount} />
      )}

      <div data-testid="agent-r03-capture-body">
      <AgentR03ListToolbar
        searchPlaceholder={
          isIssuerShell ? issuerPageCopy.searchPlaceholder : "Название, партнёр или категория"
        }
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
          writeAgentR03ViewMode("certificates", mode);
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
        sortOptions={CERT_SORT_OPTIONS}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          resetFiltersAndPage();
        }}
        statusOptions={CERT_STATUS_FILTER_OPTIONS}
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
        <div className={styles.empty} data-testid="business-certificates-empty">
          {isBusiness && !archived ? (
            <p className={styles.muted}>{businessPageCopy!.emptyCollection}</p>
          ) : isSpecialist && !archived ? (
            <>
              <p>{issuerPageCopy.emptyTitle}</p>
              <p className={styles.muted}>{issuerPageCopy.emptyHint}</p>
              <Button onClick={openCreateDialog}>{issuerPageCopy.createCta}</Button>
            </>
          ) : (
            <p>{archived ? "В архиве пока пусто." : "Сертификатов пока нет."}</p>
          )}
        </div>
      ) : null}

      {loadState === "loaded" && items.length > 0 && viewMode === "cards" ? (
        <div className={styles.list} data-testid="agent-r03-cards-grid">
          {items.map((cert) => (
            <AgentCertificateCard
              key={cert.id}
              cert={cert}
              archived={archived}
              selected={selected.has(cert.id)}
              onSelectChange={(checked) => toggleSelected(cert.id, checked)}
              actions={certRowActions(cert)}
              detailBasePath={detailBasePath}
            />
          ))}
        </div>
      ) : null}

      {loadState === "loaded" && items.length > 0 && viewMode === "list" ? (
        <>
          <div className={`${styles.collectionPanel} ${styles.mobileOnly}`}>
            {items.map((cert) => (
              <AgentR03MobileCertRow
                key={cert.id}
                cert={cert}
                selected={selected.has(cert.id)}
                onSelectChange={(checked) => toggleSelected(cert.id, checked)}
                actions={certRowActions(cert)}
                detailBasePath={detailBasePath}
              />
            ))}
          </div>
          <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
            <table className={styles.collectionTable}>
              <thead>
                <tr>
                  <th />
                  <th>Название</th>
                  <th>Подробности</th>
                  <th>Статус</th>
                  <th>
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(cert.id)}
                        onChange={(e) => toggleSelected(cert.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <Link
                        href={`${detailBasePath}/${cert.id}`}
                        className={styles.collectionOpenLink}
                        data-testid={isSpecialist ? `specialist-cert-list-name-${cert.id}` : undefined}
                      >
                        {cert.userAlias ?? cert.title}
                      </Link>
                      <small className={styles.collectionCaption}>
                        {cert.displayCode} · {formatCertDate(cert.createdAt)}
                      </small>
                    </td>
                    <td className={styles.collectionDetail}>{certificateListDetail(cert)}</td>
                    <td>
                      <span className={styles.purchasePill}>
                        {certificatePurchaseStatusLabel(cert)}
                      </span>
                      <small className={styles.collectionLifecycle}>
                        {certificateLifecycleStatusLabel(cert)}
                      </small>
                    </td>
                    <td className={styles.collectionRowAction}>
                      <RecordRowActions
                        ariaLabel="Действия"
                        actions={certRowActions(cert)}
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
          <Button
            variant="secondary"
            disabled={busy || !batchDeleteAllowed}
            title={
              batchDeleteAllowed
                ? undefined
                : "В выборке есть сертификаты других авторов — удаление недоступно"
            }
            onClick={() => void runBatch("delete")}
          >
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

      <SpecialistCertificateEditDiscountsDialog
        open={Boolean(editDiscountsCert)}
        cert={editDiscountsCert}
        issuerListApi={isIssuerShell ? issuerListApi : "specialist"}
        onClose={() => setEditDiscountsCert(null)}
        onSaved={() => load()}
      />

      {isIssuerShell ? (
        <>
          <SpecialistCertificateCreateDialog
            open={createDialogOpen}
            agentClientId={createClientId}
            issuerListApi={issuerListApi}
            onClose={closeCreateDialog}
            onCertificateCreated={() => void load()}
            onListRefresh={() => void load()}
          />
          <SpecialistCertificateDetailDialog
            open={Boolean(detailCertificateId)}
            certificateId={detailCertificateId}
            issuerListApi={issuerListApi}
            onClose={closeDetailDialog}
            onListMutated={() => void load()}
          />
        </>
      ) : null}
    </div>
  );
}
