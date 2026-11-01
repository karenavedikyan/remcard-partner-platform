"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { handleDialogTabKey } from "@/lib/dialog-focus";
import { RemcardApiError } from "@/lib/api-client";
import { adminNotificationCategoryLabel } from "@/lib/admin-notification-display";
import { adminNotificationActionHref } from "@/lib/admin-notification-url";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationItem,
} from "@/lib/prof-admin-notifications-api";
import { Button } from "@/components/ui/Button";
import { AdminNotificationSettingsSection, type AdminNotificationSettingsHostState } from "./AdminNotificationSettingsSection";
import styles from "./AdminNotifications.module.css";

const PAGE_LIMIT = 25;

type SettingsDiscardConfirmProps = {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
};

function SettingsDiscardConfirm({ open, onStay, onDiscard }: SettingsDiscardConfirmProps) {
  const titleId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onStayRef = useRef(onStay);
  const onDiscardRef = useRef(onDiscard);
  onStayRef.current = onStay;
  onDiscardRef.current = onDiscard;

  useEffect(() => {
    if (!open) return;
    stayRef.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onStayRef.current();
        return;
      }
      const sheet = sheetRef.current;
      if (sheet) handleDialogTabKey(event, sheet);
    };

    const onFocusIn = (event: FocusEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const target = event.target;
      if (target instanceof Node && sheet.contains(target)) return;
      event.stopPropagation();
      stayRef.current?.focus({ preventScroll: true });
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focusin", onFocusIn, true);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.settingsDiscardBackdrop}
      role="presentation"
      data-testid="admin-notify-settings-discard-backdrop"
      onClick={onStay}
    >
      <div
        ref={sheetRef}
        className={styles.settingsDiscardSheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="admin-notify-settings-discard-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId}>Закрыть без сохранения?</h3>
        <p className={styles.settingsDiscardBody}>
          Есть несохранённые изменения в настройках уведомлений. Нажмите «Сохранить», чтобы применить их, или закройте
          окно — черновик будет сброшен.
        </p>
        <div className={styles.settingsDiscardActions}>
          <button
            ref={stayRef}
            type="button"
            className={styles.settingsDiscardPrimary}
            data-testid="admin-notify-settings-discard-stay"
            onClick={onStay}
          >
            Остаться
          </button>
          <button
            ref={discardRef}
            type="button"
            className={styles.settingsDiscardSecondary}
            data-testid="admin-notify-settings-discard-close"
            onClick={onDiscard}
          >
            Закрыть без сохранения
          </button>
        </div>
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminNotificationsClient() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inboxMessage, setInboxMessage] = useState("");
  const [markBusy, setMarkBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsHost, setSettingsHost] = useState<AdminNotificationSettingsHostState>({
    dirty: false,
    saving: false,
    bindingBusy: false,
  });
  const [settingsDiscardConfirmOpen, setSettingsDiscardConfirmOpen] = useState(false);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const mutationSeqRef = useRef(0);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#admin-notify-settings-title") {
      setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const dialog = settingsDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [settingsOpen]);

  const finalizeSettingsDialogClosed = useCallback(() => {
    setSettingsOpen(false);
    setSettingsDiscardConfirmOpen(false);
    setSettingsHost({ dirty: false, saving: false, bindingBusy: false });
    requestAnimationFrame(() => {
      settingsTriggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const performSettingsClose = useCallback(() => {
    setSettingsDiscardConfirmOpen(false);
    const dialog = settingsDialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    finalizeSettingsDialogClosed();
  }, [finalizeSettingsDialogClosed]);

  const requestSettingsClose = useCallback(() => {
    if (settingsHost.saving || settingsHost.bindingBusy) return;
    if (settingsDiscardConfirmOpen) return;
    if (settingsHost.dirty) {
      setSettingsDiscardConfirmOpen(true);
      return;
    }
    performSettingsClose();
  }, [
    performSettingsClose,
    settingsDiscardConfirmOpen,
    settingsHost.bindingBusy,
    settingsHost.dirty,
    settingsHost.saving,
  ]);

  const handleSettingsHostState = useCallback((state: AdminNotificationSettingsHostState) => {
    setSettingsHost(state);
  }, []);

  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (settingsDiscardConfirmOpen) return;
      requestSettingsClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [requestSettingsClose, settingsDiscardConfirmOpen, settingsOpen]);

  useEffect(() => {
    requestSeqRef.current += 1;
    setCursorStack([null]);
    setStackIndex(0);
  }, [unreadOnly]);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const applyInboxResult = useCallback(
    (requestId: number, data: { items: AdminNotificationItem[]; nextCursor: string | null }) => {
      if (requestId !== requestSeqRef.current || !mountedRef.current) return;
      setItems(data.items);
      setNextCursor(data.nextCursor);
    },
    [],
  );

  const fetchUnreadSkippingEmptyPages = useCallback(
    async (requestId: number, startCursor: string | null) => {
      let cursor = startCursor;
      while (true) {
        if (requestId !== requestSeqRef.current) return null;
        const data = await fetchAdminNotifications({
          unread: true,
          limit: PAGE_LIMIT,
          cursor,
        });
        if (requestId !== requestSeqRef.current) return null;
        if (data.items.length > 0 || !data.nextCursor) {
          return { data, resolvedCursor: cursor };
        }
        cursor = data.nextCursor;
      }
    },
    [],
  );

  const runFetch = useCallback(() => {
    const requestId = ++requestSeqRef.current;
    setLoading(true);
    setError("");
    setInboxMessage("");

    void (async () => {
      try {
        const data = await fetchAdminNotifications({
          unread: unreadOnly,
          limit: PAGE_LIMIT,
          cursor: currentCursor,
        });
        applyInboxResult(requestId, data);
      } catch (caught) {
        if (requestId !== requestSeqRef.current || !mountedRef.current) return;
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить уведомления");
        setItems([]);
        setNextCursor(null);
      } finally {
        if (requestId === requestSeqRef.current && mountedRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [applyInboxResult, currentCursor, unreadOnly]);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  const refreshAfterMutation = useCallback(async () => {
    const requestId = requestSeqRef.current;
    const mutationId = mutationSeqRef.current;
    setLoading(true);
    setError("");
    try {
      if (unreadOnly) {
        const resolved = await fetchUnreadSkippingEmptyPages(requestId, currentCursor);
        if (!resolved || requestId !== requestSeqRef.current || mutationId !== mutationSeqRef.current) return;
        applyInboxResult(requestId, resolved.data);
        if (resolved.resolvedCursor !== currentCursor) {
          setCursorStack([null, resolved.resolvedCursor]);
          setStackIndex(resolved.resolvedCursor ? 1 : 0);
        }
        return;
      }
      const data = await fetchAdminNotifications({
        unread: false,
        limit: PAGE_LIMIT,
        cursor: currentCursor,
      });
      if (requestId !== requestSeqRef.current || mutationId !== mutationSeqRef.current) return;
      applyInboxResult(requestId, data);
    } catch (caught) {
      if (requestId !== requestSeqRef.current || mutationId !== mutationSeqRef.current) return;
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось обновить список");
    } finally {
      if (requestId === requestSeqRef.current && mutationId === mutationSeqRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [applyInboxResult, currentCursor, fetchUnreadSkippingEmptyPages, unreadOnly]);

  async function onMarkRead(id: string) {
    if (markBusy) return;
    const mutationId = ++mutationSeqRef.current;
    const scopeRequestId = requestSeqRef.current;
    setMarkBusy(true);
    setInboxMessage("");
    setError("");
    try {
      await markAdminNotificationRead(id);
      if (mutationId !== mutationSeqRef.current || scopeRequestId !== requestSeqRef.current) return;
      window.dispatchEvent(new CustomEvent("admin-notifications-changed"));
      await refreshAfterMutation();
    } catch {
      if (mutationId !== mutationSeqRef.current || scopeRequestId !== requestSeqRef.current) return;
      await refreshAfterMutation();
      if (mutationId !== mutationSeqRef.current || scopeRequestId !== requestSeqRef.current) return;
      setError("Не удалось отметить прочитанным — непрочитанные сохранены");
    } finally {
      if (mutationId === mutationSeqRef.current) setMarkBusy(false);
    }
  }

  async function onMarkAllRead() {
    if (markBusy) return;
    const mutationId = ++mutationSeqRef.current;
    const scopeRequestId = requestSeqRef.current;
    setMarkBusy(true);
    setInboxMessage("");
    setError("");
    try {
      await markAllAdminNotificationsRead();
      if (mutationId !== mutationSeqRef.current || scopeRequestId !== requestSeqRef.current) return;
      requestSeqRef.current += 1;
      setCursorStack([null]);
      setStackIndex(0);
      window.dispatchEvent(new CustomEvent("admin-notifications-changed"));
      setInboxMessage("Все уведомления отмечены прочитанными");
      if (unreadOnly) {
        const requestId = ++requestSeqRef.current;
        setLoading(true);
        try {
          const resolved = await fetchUnreadSkippingEmptyPages(requestId, null);
          if (resolved && requestId === requestSeqRef.current && mutationId === mutationSeqRef.current) {
            applyInboxResult(requestId, resolved.data);
          }
        } finally {
          if (requestId === requestSeqRef.current) setLoading(false);
        }
      } else {
        runFetch();
      }
    } catch {
      if (mutationId !== mutationSeqRef.current) return;
      setError("Не удалось отметить все прочитанными");
    } finally {
      if (mutationId === mutationSeqRef.current) setMarkBusy(false);
    }
  }

  function goNextPage() {
    if (!nextCursor || markBusy) return;
    setCursorStack((prev) => {
      const trimmed = prev.slice(0, stackIndex + 1);
      return [...trimmed, nextCursor];
    });
    setStackIndex((i) => i + 1);
  }

  function goPrevPage() {
    if (stackIndex <= 0 || markBusy) return;
    setStackIndex((i) => i - 1);
  }

  const inboxEmpty = !loading && !error && items.length === 0 && !nextCursor;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
          <h1>Уведомления</h1>
          <p className={styles.pageLead}>События проекта в одном месте</p>
        </div>
        <div className={styles.pageHeadActions}>
          <button
            type="button"
            className={styles.settingsJump}
            ref={settingsTriggerRef}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            Настройки
          </button>
        </div>
      </header>

      <section className={styles.inboxPanel} aria-label="Inbox администратора">
        <div className={styles.inboxToolbar}>
          <label className={styles.unreadToggle}>
            <input
              type="checkbox"
              checked={unreadOnly}
              disabled={markBusy}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            <span>Только непрочитанные</span>
          </label>
          <div className={styles.inboxToolbarSpacer} aria-hidden="true" />
          <Button
            type="button"
            variant="secondary"
            className={styles.markAllButton}
            disabled={loading || markBusy || items.length === 0}
            onClick={() => void onMarkAllRead()}
          >
            Прочитать всё
          </Button>
        </div>

        <div className={styles.inboxBodyRegion}>
          {error ? (
            <div className={styles.stateBox} role="alert">
              <p>{error}</p>
              <button type="button" className={styles.retryButton} onClick={runFetch}>
                Повторить
              </button>
            </div>
          ) : null}

          {inboxMessage ? (
            <p className={styles.success} role="status">
              {inboxMessage}
            </p>
          ) : null}

          {loading ? <p className={styles.stateBox}>Загрузка…</p> : null}

          {inboxEmpty ? (
            <p className={styles.stateBox} role="status">
              {unreadOnly ? "Непрочитанных уведомлений нет." : "Уведомлений пока нет."}
            </p>
          ) : null}

          {!loading && items.length > 0 ? (
            <ul className={styles.inboxList}>
              {items.map((item) => {
                const actionHref = adminNotificationActionHref(item.actionUrl);
                const unread = !item.readAt;
                return (
                  <li key={item.id} className={styles.inboxItem} data-unread={unread || undefined}>
                    <div className={styles.inboxRow}>
                      <span className={styles.categoryBadge}>{adminNotificationCategoryLabel(item)}</span>
                      <div className={styles.inboxMain}>
                        <div className={styles.inboxTitleRow}>
                          <h3 className={styles.inboxTitle}>{item.title}</h3>
                          <time className={styles.inboxTime} dateTime={item.createdAt}>
                            {formatWhen(item.createdAt)}
                          </time>
                        </div>
                        <p className={styles.inboxBody}>{item.body}</p>
                        <div className={styles.inboxActions}>
                          {actionHref ? (
                            actionHref.startsWith("http") ? (
                              <a href={actionHref} target="_blank" rel="noopener noreferrer">
                                Открыть карточку
                              </a>
                            ) : (
                              <Link href={actionHref}>Открыть карточку</Link>
                            )
                          ) : item.actionUrl ? (
                            <span className={styles.untrustedLink}>Ссылка недоступна (не доверенный маршрут)</span>
                          ) : null}
                          {unread ? (
                            <button
                              type="button"
                              className={styles.markRead}
                              disabled={markBusy}
                              onClick={() => void onMarkRead(item.id)}
                            >
                              Прочитано
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {!loading && !error && (items.length > 0 || nextCursor) ? (
          <div className={styles.pagination}>
            <button type="button" disabled={stackIndex <= 0 || markBusy} onClick={goPrevPage}>
              Назад
            </button>
            <span>Страница {stackIndex + 1}</span>
            <button type="button" disabled={!nextCursor || markBusy} onClick={goNextPage}>
              Дальше
            </button>
          </div>
        ) : null}
      </section>

      {settingsOpen ? (
        <dialog
          ref={settingsDialogRef}
          className={styles.settingsDialog}
          aria-labelledby="admin-notify-settings-dialog-title"
          onClose={finalizeSettingsDialogClosed}
        >
          <header className={styles.settingsDialogHead}>
            <h2 id="admin-notify-settings-dialog-title">Уведомления администратора</h2>
            <button
              type="button"
              className={styles.settingsDialogClose}
              aria-label="Закрыть окно настроек"
              disabled={settingsHost.saving || settingsHost.bindingBusy}
              onClick={requestSettingsClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className={styles.settingsDialogBody}>
            <div className={styles.settingsInDialog}>
              <AdminNotificationSettingsSection onHostStateChange={handleSettingsHostState} />
            </div>
          </div>
          <SettingsDiscardConfirm
            open={settingsDiscardConfirmOpen}
            onStay={() => setSettingsDiscardConfirmOpen(false)}
            onDiscard={performSettingsClose}
          />
        </dialog>
      ) : null}
    </div>
  );
}
