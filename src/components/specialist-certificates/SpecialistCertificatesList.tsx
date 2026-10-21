"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { CertificateListResponse, StoreCertificate } from "@/lib/certificate-types";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import {
  certificateDisplayTitle,
  clientVisibleDiscountSummary,
  resolveCertificatePageUrl,
} from "@/lib/certificate-url";
import { CERT_SORT_OPTIONS, CERT_STATUS_FILTER_OPTIONS } from "@/lib/agent-r03/listSortOptions";
import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import { readAgentR03ViewMode, writeAgentR03ViewMode } from "@/lib/agent-r03/viewModeStorage";
import { AgentR03ListToolbar } from "@/components/agent-r03/AgentR03ListToolbar";
import { AgentR03Pagination } from "@/components/agent-r03/AgentR03Pagination";
import { SharePreviewDialog } from "@/components/agent-r03/SharePreviewDialog";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SPECIALIST_CERTIFICATES_PAGE } from "@/lib/specialist-certificates/copy";
import {
  countActiveArchived,
  filterStoreCertificates,
  sortStoreCertificates,
} from "@/lib/specialist-certificates/listModel";
import styles from "@/components/agent-r03/agent-r03.module.css";

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function SpecialistCertificatesList() {
  const [allItems, setAllItems] = useState<StoreCertificate[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [archived, setArchived] = useState(false);
  const [qDraft, setQDraft] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<AgentR03ListSort>("created_desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sharePreview, setSharePreview] = useState<{ lines: string[]; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await remcardFetch<CertificateListResponse>("/api/store/certificate");
      setAllItems(data.certificates ?? []);
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить сертификаты",
      );
      setAllItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stored = readAgentR03ViewMode("certificates");
    if (stored) setViewMode(stored);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setAppliedQ(qDraft), 300);
    return () => window.clearTimeout(t);
  }, [qDraft]);

  useEffect(() => {
    setPage(1);
  }, [appliedQ, archived, sort, statusFilter]);

  const { activeCount, archivedCount } = useMemo(() => countActiveArchived(allItems), [allItems]);

  const filtered = useMemo(
    () =>
      sortStoreCertificates(
        filterStoreCertificates(allItems, { archived, q: appliedQ, statusFilter }),
        sort,
      ),
    [allItems, archived, appliedQ, sort, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectableIds = pageItems.map((c) => c.id);

  async function deleteSelected() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      for (const id of selected) {
        await remcardFetch(`/api/store/certificate/${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      setSelected(new Set());
      await load();
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось удалить сертификат",
      );
    } finally {
      setBusy(false);
    }
  }

  function openShare(cert: StoreCertificate) {
    const url = resolveCertificatePageUrl(cert);
    if (!url) return;
    setSharePreview({
      url,
      lines: [
        certificateDisplayTitle(cert),
        `Скидка: ${clientVisibleDiscountSummary(cert)}`,
        url,
      ],
    });
  }

  return (
    <div className={styles.r03Root} data-testid="specialist-certificates-root">
      <section className={styles.pageIntroBlock}>
        <p className={styles.pageIntroMuted}>{SPECIALIST_CERTIFICATES_PAGE.description}</p>
        <Link href="/recommendations/new" className={styles.heroCtaInline}>
          <Button>{SPECIALIST_CERTIFICATES_PAGE.createCta}</Button>
        </Link>
      </section>

      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" ? (
        <>
          <AgentR03ListToolbar
            searchPlaceholder={SPECIALIST_CERTIFICATES_PAGE.searchPlaceholder}
            q={qDraft}
            onQChange={setQDraft}
            archived={archived}
            onShowChange={setArchived}
            activeCount={activeCount}
            archivedCount={archivedCount}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              writeAgentR03ViewMode("certificates", mode);
            }}
            foundCount={filtered.length}
            selectableIds={selectableIds}
            selectedIds={selected}
            onSelectPage={(checked) => {
              setSelected((prev) => {
                const next = new Set(prev);
                for (const id of selectableIds) {
                  if (checked) next.add(id);
                  else next.delete(id);
                }
                return next;
              });
            }}
            sort={sort}
            onSortChange={setSort}
            sortOptions={CERT_SORT_OPTIONS}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusOptions={CERT_STATUS_FILTER_OPTIONS}
            filtersActive={Boolean(appliedQ || statusFilter)}
            onResetFilters={() => {
              setQDraft("");
              setAppliedQ("");
              setStatusFilter("");
            }}
          />

          {selected.size > 0 ? (
            <div className={styles.batchBar}>
              <span>Выбрано: {selected.size}</span>
              <Button variant="secondary" disabled={busy} onClick={() => void deleteSelected()}>
                Удалить неиспользованные
              </Button>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>{SPECIALIST_CERTIFICATES_PAGE.emptyTitle}</p>
              <p className={styles.muted}>{SPECIALIST_CERTIFICATES_PAGE.emptyHint}</p>
              <Link href="/recommendations/new">
                <Button>{SPECIALIST_CERTIFICATES_PAGE.createCta}</Button>
              </Link>
            </div>
          ) : viewMode === "cards" ? (
            <div className={styles.list} data-testid="specialist-cert-cards-grid">
              {pageItems.map((cert) => (
                <article key={cert.id} className={styles.collectionCardShell}>
                  <div className={styles.collectionCardBody}>
                    <h3>{certificateDisplayTitle(cert)}</h3>
                    <p className={styles.muted}>
                      {formatDate(cert.createdAt)} · {cert.promoCode} ·{" "}
                      {clientVisibleDiscountSummary(cert)}
                    </p>
                    <StatusBadge
                      label={certificateStatusLabel(cert.status)}
                      tone={certificateStatusTone(cert.status)}
                    />
                  </div>
                  <div className={styles.collectionCardActions}>
                    <Link href={`/recommendations/${cert.id}`}>
                      <Button variant="secondary">Открыть</Button>
                    </Link>
                    <Button variant="secondary" onClick={() => openShare(cert)}>
                      Поделиться
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.collectionList}>
              {pageItems.map((cert) => (
                <div key={cert.id} className={styles.collectionRow}>
                  <label className={styles.collectionRowSelect}>
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
                  <div className={styles.collectionRowMain}>
                    <Link href={`/recommendations/${cert.id}`} className={styles.collectionRowTitle}>
                      {certificateDisplayTitle(cert)}
                    </Link>
                    <p className={styles.muted}>
                      {formatDate(cert.createdAt)} · {cert.promoCode}
                    </p>
                  </div>
                  <StatusBadge
                    label={certificateStatusLabel(cert.status)}
                    tone={certificateStatusTone(cert.status)}
                  />
                  <div className={styles.collectionRowActions}>
                    <Button variant="secondary" onClick={() => openShare(cert)}>
                      Ссылка
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AgentR03Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            hasPrev={page > 1}
            hasNext={page < totalPages}
          />
        </>
      ) : loadState === "loading" ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : null}

      <SharePreviewDialog
        open={sharePreview != null}
        title="Поделиться сертификатом"
        lines={sharePreview?.lines ?? []}
        url={sharePreview?.url ?? ""}
        onClose={() => setSharePreview(null)}
      />
    </div>
  );
}
