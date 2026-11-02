"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  ADMIN_SETTINGS_DEVELOPMENT_LEAD,
  ADMIN_SETTINGS_DEVELOPMENT_TITLE,
  ADMIN_SETTINGS_NOTIFICATIONS_HREF,
  ADMIN_SETTINGS_PAGE_LEAD,
  ADMIN_SETTINGS_PARTNER_TYPES,
  ADMIN_SETTINGS_RELEASE1_SCOPE,
  ADMIN_SETTINGS_RELEASE2_NOTE,
  ADMIN_SETTINGS_RELEASE3_NOTE,
  ADMIN_SETTINGS_RULES,
  ADMIN_SETTINGS_RULES_TITLE,
  ADMIN_SETTINGS_TYPES_PANEL_LEAD,
  ADMIN_SETTINGS_TYPES_PANEL_TITLE,
} from "./adminSettingsCopy";
import {
  ADMIN_SETTINGS_AUDIT_FORBIDDEN,
  ADMIN_SETTINGS_AUDIT_PROXY_BLOCKED,
  ADMIN_SETTINGS_AUDIT_SCOPE_NOTE,
  ADMIN_SETTINGS_AUDIT_TITLE,
  adminSettingsTabLabel,
  buildStaffAccessAuditPath,
  parseStaffAccessAuditResponse,
  partnerKindEnabledLabel,
  type AdminSettingsTab,
  type StaffAccessAuditRow,
} from "./adminSettingsModel";
import styles from "./AdminSettings.r1.module.css";

const AUDIT_PAGE_LIMIT = 25;

type AuditLoadState =
  | { kind: "idle" }
  | { kind: "loading"; mode: "initial" }
  | {
      kind: "loading";
      mode: "more";
      priorItems: StaffAccessAuditRow[];
      priorCursor: string | null;
    }
  | { kind: "ready"; items: StaffAccessAuditRow[]; nextCursor: string | null; hasMore: boolean }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

function CheckMark() {
  return (
    <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 12.5 10 16.5 18 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatAuditTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminSettingsClient() {
  const tablistId = useId();
  const [tab, setTab] = useState<AdminSettingsTab>("types");
  const [auditState, setAuditState] = useState<AuditLoadState>({ kind: "idle" });
  const auditFlight = useRef(0);

  const loadAudit = useCallback(async (mode: "initial" | "more", cursor: string | null = null) => {
    const flight = ++auditFlight.current;
    if (mode === "more") {
      setAuditState((prev) => {
        if (prev.kind !== "ready") return prev;
        return {
          kind: "loading",
          mode: "more",
          priorItems: prev.items,
          priorCursor: prev.nextCursor,
        };
      });
    } else {
      setAuditState({ kind: "loading", mode: "initial" });
    }
    try {
      const path = buildStaffAccessAuditPath(
        AUDIT_PAGE_LIMIT,
        mode === "more" ? cursor : null,
      );
      const raw = await remcardFetch<unknown>(path);
      if (flight !== auditFlight.current) return;
      const parsed = parseStaffAccessAuditResponse(raw);
      if (!parsed.ok) {
        setAuditState({ kind: "error", message: parsed.message });
        return;
      }
      const { items, nextCursor, hasMore } = parsed.page;
      if (mode === "more" && hasMore && nextCursor === cursor) {
        setAuditState({ kind: "error", message: "Журнал вернул повторяющийся курсор страницы." });
        return;
      }
      if (mode === "more") {
        setAuditState((prev) => {
          const base =
            prev.kind === "loading" && prev.mode === "more" ? prev.priorItems : [];
          const seenIds = new Set(base.map((row) => row.id));
          if (items.some((row) => seenIds.has(row.id))) {
            return { kind: "error", message: "Журнал вернул повторяющиеся записи." };
          }
          const merged = [...base, ...items];
          if (merged.length === 0) return { kind: "empty" };
          return { kind: "ready", items: merged, nextCursor, hasMore };
        });
        return;
      }
      if (items.length === 0) {
        setAuditState({ kind: "empty" });
        return;
      }
      setAuditState({ kind: "ready", items, nextCursor, hasMore });
    } catch (err) {
      if (flight !== auditFlight.current) return;
      if (err instanceof RemcardApiError) {
        if (err.status === 403) {
          setAuditState({ kind: "forbidden" });
          return;
        }
        if (err.status === 404 || err.status === 501) {
          setAuditState({ kind: "error", message: ADMIN_SETTINGS_AUDIT_PROXY_BLOCKED });
          return;
        }
        setAuditState({ kind: "error", message: err.message });
        return;
      }
      setAuditState({ kind: "error", message: ADMIN_SETTINGS_AUDIT_PROXY_BLOCKED });
    }
  }, []);

  useEffect(() => {
    if (tab !== "audit") {
      auditFlight.current += 1;
      setAuditState({ kind: "idle" });
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "audit") return;
    if (auditState.kind === "idle") {
      void loadAudit("initial");
    }
  }, [tab, auditState.kind, loadAudit]);

  const onTabKeyDown = (event: KeyboardEvent, current: AdminSettingsTab) => {
    const order: AdminSettingsTab[] = ["types", "development", "audit"];
    const idx = order.indexOf(current);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setTab(order[(idx + 1) % order.length]!);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setTab(order[(idx - 1 + order.length) % order.length]!);
    }
  };

  return (
    <div className={styles.page} data-testid="admin-settings-page">
      <header className={styles.pageHead}>
        <h1>Настройки</h1>
        <p className={styles.lead}>{ADMIN_SETTINGS_PAGE_LEAD}</p>
      </header>

      <div
        className={styles.subtabs}
        role="tablist"
        aria-label="Разделы настроек"
        id={tablistId}
      >
        {(["types", "development", "audit"] as const).map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${tablistId}-${key}`}
              aria-selected={active}
              aria-controls={`${tablistId}-panel-${key}`}
              className={active ? styles.subtabActive : styles.subtab}
              data-testid={`admin-settings-tab-${key}`}
              onClick={() => setTab(key)}
              onKeyDown={(e) => onTabKeyDown(e, key)}
            >
              {adminSettingsTabLabel(key)}
            </button>
          );
        })}
      </div>

      {tab === "types" ? (
        <div
          role="tabpanel"
          id={`${tablistId}-panel-types`}
          aria-labelledby={`${tablistId}-types`}
          className={styles.layout}
          data-testid="admin-settings-panel-types"
        >
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{ADMIN_SETTINGS_TYPES_PANEL_TITLE}</h2>
                <small>{ADMIN_SETTINGS_TYPES_PANEL_LEAD}</small>
              </div>
            </div>
            <div className={styles.panelPad}>
              {ADMIN_SETTINGS_PARTNER_TYPES.map((t) => (
                <div key={t.id} className={styles.typeRow} data-testid={`admin-settings-type-${t.id}`}>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                  </div>
                  <span className={styles.pillGood}>{partnerKindEnabledLabel(t.id)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelPad}>
              <h2>{ADMIN_SETTINGS_RULES_TITLE}</h2>
              {ADMIN_SETTINGS_RULES.map((rule) => (
                <div key={rule.id} className={styles.ruleRow} data-testid={`admin-settings-rule-${rule.id}`}>
                  <div>
                    <h3>{rule.title}</h3>
                    <p>{rule.description}</p>
                  </div>
                  <div className={styles.ruleAside}>
                    {rule.id === "notifications-context" ? (
                      <Link
                        href={ADMIN_SETTINGS_NOTIFICATIONS_HREF}
                        className={styles.linkBtn}
                        data-testid="admin-settings-notifications-link"
                      >
                        Настроить
                      </Link>
                    ) : (
                      <CheckMark />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "development" ? (
        <section
          role="tabpanel"
          id={`${tablistId}-panel-development`}
          aria-labelledby={`${tablistId}-development`}
          className={styles.panel}
          data-testid="admin-settings-panel-development"
        >
          <div className={styles.panelPad}>
            <h2>{ADMIN_SETTINGS_DEVELOPMENT_TITLE}</h2>
            <p className={styles.auditNote}>{ADMIN_SETTINGS_DEVELOPMENT_LEAD}</p>
            <div className={styles.scopeBlock}>
              <p>
                <strong>Release 1.</strong> {ADMIN_SETTINGS_RELEASE1_SCOPE}
              </p>
              <p className={styles.futureNote}>{ADMIN_SETTINGS_RELEASE2_NOTE}</p>
              <p className={styles.futureNote}>{ADMIN_SETTINGS_RELEASE3_NOTE}</p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section
          role="tabpanel"
          id={`${tablistId}-panel-audit`}
          aria-labelledby={`${tablistId}-audit`}
          className={styles.panel}
          data-testid="admin-settings-panel-audit"
        >
          <div className={styles.panelPad}>
            <h2>{ADMIN_SETTINGS_AUDIT_TITLE}</h2>
            <p className={styles.auditNote}>{ADMIN_SETTINGS_AUDIT_SCOPE_NOTE}</p>
            {auditState.kind === "loading" && auditState.mode === "initial" ? (
              <p className={styles.loading} role="status">
                Загрузка журнала…
              </p>
            ) : null}
            {auditState.kind === "ready" || (auditState.kind === "loading" && auditState.mode === "more") ? (
              <div data-testid="admin-settings-audit-list">
                {(auditState.kind === "ready"
                  ? auditState.items
                  : auditState.priorItems
                ).map((row) => (
                  <div key={row.id} className={styles.auditRow}>
                    <span className={styles.auditTime}>{formatAuditTime(row.occurredAt)}</span>
                    <div>
                      <div className={styles.auditAction}>{row.actionLabel}</div>
                      {row.targetLabel ? <p className={styles.auditTarget}>{row.targetLabel}</p> : null}
                      {row.detailLine ? <p className={styles.auditDetail}>{row.detailLine}</p> : null}
                    </div>
                    <span className={styles.auditActor}>{row.actorLabel ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {auditState.kind === "ready" && auditState.hasMore ? (
              <button
                type="button"
                className={styles.loadMoreBtn}
                data-testid="admin-settings-audit-load-more"
                disabled={false}
                onClick={() => void loadAudit("more", auditState.nextCursor)}
              >
                Показать ещё
              </button>
            ) : null}
            {auditState.kind === "loading" && auditState.mode === "more" ? (
              <p className={styles.loading} role="status">
                Загрузка…
              </p>
            ) : null}
            {auditState.kind === "empty" ? (
              <div className={styles.emptyState} data-testid="admin-settings-audit-empty">
                <strong>Действий пока нет</strong>
                Записи появятся после изменений доступа сотрудников.
              </div>
            ) : null}
            {auditState.kind === "forbidden" ? (
              <div className={styles.alert} role="status" data-testid="admin-settings-audit-forbidden">
                {ADMIN_SETTINGS_AUDIT_FORBIDDEN}
              </div>
            ) : null}
            {auditState.kind === "error" ? (
              <div className={`${styles.alert} ${styles.alertError}`} role="alert">
                {auditState.message}
                <div>
                  <button
                    type="button"
                    className={styles.retryBtn}
                    data-testid="admin-settings-audit-retry"
                    onClick={() => {
                      setAuditState({ kind: "idle" });
                      void loadAudit("initial");
                    }}
                  >
                    Повторить
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
