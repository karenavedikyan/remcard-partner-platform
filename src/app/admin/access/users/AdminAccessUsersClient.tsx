"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { getFocusableElements, handleDialogTabKey } from "@/lib/dialog-focus";
import {
  accessUsersErrorKind,
  createAdminAccessUser,
  fetchAdminAccessUsers,
  labelAccessState,
  labelStaffRole,
  revokeAdminAccessUser,
  type AdminAccessUserItem,
  type AdminAccessViewer,
} from "@/lib/prof-admin-access-users-api";
import styles from "./AdminAccessUsers.r1.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

type FormState = {
  displayName: string;
  login: string;
  newPassword: string;
};

const EMPTY_FORM: FormState = { displayName: "", login: "", newPassword: "" };

function formDirty(form: FormState) {
  return Boolean(form.displayName || form.login || form.newPassword);
}

export function AdminAccessUsersClient() {
  const titleId = useId();
  const createTitleId = useId();
  const dialogTitleId = useId();
  const cancelTitleId = useId();

  const [viewer, setViewer] = useState<AdminAccessViewer | null>(null);
  const [items, setItems] = useState<AdminAccessUserItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createOk, setCreateOk] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<AdminAccessUserItem | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const flightRef = useRef(0);
  const createFlightRef = useRef(0);
  const revokeFlightRef = useRef(0);
  const displayNameRef = useRef<HTMLInputElement | null>(null);
  const revokeDialogRef = useRef<HTMLDivElement | null>(null);
  const revokeConfirmRef = useRef<HTMLButtonElement | null>(null);
  const revokeOpenerRef = useRef<HTMLElement | null>(null);
  const cancelDialogRef = useRef<HTMLDivElement | null>(null);
  const cancelConfirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelOpenerRef = useRef<HTMLElement | null>(null);

  /** OWNER and ADMIN share access work rights; OWNER rows stay non-revocable. */
  const canManageAccess = viewer?.staffRole === "OWNER" || viewer?.staffRole === "ADMIN";
  const revokeBusyRef = useRef(false);
  revokeBusyRef.current = revokeBusy;

  const load = async () => {
    const flight = ++flightRef.current;
    setLoadState({ kind: "loading" });
    setCreateError("");
    setRevokeError("");
    try {
      const res = await fetchAdminAccessUsers();
      if (flight !== flightRef.current) return;
      setViewer(res.viewer);
      const list = res.items ?? [];
      setItems(list);
      const others = list.filter((row) => row.id !== res.viewer?.id);
      setLoadState(
        others.length === 0 && list.every((row) => row.staffRole === "OWNER")
          ? { kind: "empty" }
          : { kind: "ready" },
      );
    } catch (caught) {
      if (flight !== flightRef.current) return;
      const kind = accessUsersErrorKind(caught);
      setItems([]);
      if (kind === "forbidden") {
        setViewer(null);
        setLoadState({ kind: "forbidden" });
        return;
      }
      if (kind === "unauthorized") {
        setViewer(null);
        setLoadState({ kind: "unauthorized" });
        return;
      }
      setLoadState({
        kind: "error",
        message:
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось загрузить список администраторов",
      });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // Revoke dialog: initial focus, Escape when idle, Tab containment, restore opener.
  useEffect(() => {
    if (!revokeTarget) return;
    const root = revokeDialogRef.current;
    if (!root) return;
    queueMicrotask(() => {
      const focusable = getFocusableElements(root);
      (revokeConfirmRef.current ?? focusable[0])?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (revokeBusyRef.current) return;
        e.preventDefault();
        setRevokeTarget(null);
        setRevokeError("");
        return;
      }
      handleDialogTabKey(e, root);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const opener = revokeOpenerRef.current;
      revokeOpenerRef.current = null;
      queueMicrotask(() => opener?.focus?.());
    };
  }, [revokeTarget]);

  // Confirm-cancel dialog focus management.
  useEffect(() => {
    if (!confirmCancel) return;
    const root = cancelDialogRef.current;
    if (!root) return;
    queueMicrotask(() => {
      const focusable = getFocusableElements(root);
      (cancelConfirmRef.current ?? focusable[0])?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setConfirmCancel(false);
        return;
      }
      handleDialogTabKey(e, root);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const opener = cancelOpenerRef.current;
      cancelOpenerRef.current = null;
      queueMicrotask(() => opener?.focus?.());
    };
  }, [confirmCancel]);

  const clearPassword = () => {
    setForm((prev) => ({ ...prev, newPassword: "" }));
  };

  const resetForm = (opts?: { keepOk?: boolean }) => {
    setForm(EMPTY_FORM);
    setCreateError("");
    if (!opts?.keepOk) setCreateOk("");
  };

  const requestResetForm = () => {
    if (formDirty(form)) {
      const active = document.activeElement;
      cancelOpenerRef.current = active instanceof HTMLElement ? active : null;
      setConfirmCancel(true);
      return;
    }
    resetForm();
  };

  const submitCreate = async () => {
    if (createBusy || createFlightRef.current) return;
    if (!canManageAccess) {
      setCreateError("Создание доступно OWNER или ADMIN. Самоназначение роли OWNER недоступно.");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    setCreateOk("");
    const flight = ++createFlightRef.current;
    try {
      const body = {
        displayName: form.displayName.trim(),
        login: form.login.trim(),
        newPassword: form.newPassword,
      };
      const res = await createAdminAccessUser(body);
      if (flight !== createFlightRef.current) return;
      setItems((prev) => {
        if (prev.some((row) => row.id === res.item.id)) return prev;
        return [...prev, res.item];
      });
      setCreateOk(
        `Администратор «${res.item.displayName}» создан. Пароль введён только в форме и не сохраняется в браузере.`,
      );
      resetForm({ keepOk: true });
      displayNameRef.current?.focus();
      setLoadState({ kind: "ready" });
    } catch (caught) {
      if (flight !== createFlightRef.current) return;
      const kind = accessUsersErrorKind(caught);
      if (kind === "conflict") {
        setCreateError("Такой логин уже занят. Второй аккаунт не создан.");
      } else if (kind === "forbidden") {
        setCreateError("Недостаточно прав: требуется OWNER или ADMIN.");
      } else if (kind === "validation") {
        setCreateError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Проверьте имя, логин и пароль (не короче 12 символов).",
        );
      } else {
        setCreateError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось создать администратора",
        );
      }
    } finally {
      if (flight === createFlightRef.current) {
        clearPassword();
        setCreateBusy(false);
        createFlightRef.current = 0;
      }
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget || revokeBusy) return;
    if (!canManageAccess) {
      setRevokeError("Отключение доступно OWNER или ADMIN. Цель OWNER запрещена.");
      return;
    }
    setRevokeBusy(true);
    setRevokeError("");
    const flight = ++revokeFlightRef.current;
    const targetId = revokeTarget.id;
    try {
      const res = await revokeAdminAccessUser(targetId);
      if (flight !== revokeFlightRef.current) return;
      setItems((prev) => prev.map((row) => (row.id === res.item.id ? res.item : row)));
      setRevokeTarget(null);
    } catch (caught) {
      if (flight !== revokeFlightRef.current) return;
      setRevokeError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось отключить доступ",
      );
    } finally {
      if (flight === revokeFlightRef.current) {
        setRevokeBusy(false);
        revokeFlightRef.current = 0;
      }
    }
  };

  const closeRevokeDialog = () => {
    if (revokeBusy) return;
    setRevokeTarget(null);
    setRevokeError("");
  };

  return (
    <div className={styles.page} data-admin-access-users="r1">
      <header className={styles.pageHead}>
        <Link href="/admin/test-users" className={styles.backLink}>
          ← К тестовым пользователям
        </Link>
        <h1 id={titleId} className={styles.pageTitle}>
          Управление администраторами
        </h1>
        <p className={styles.pageLead}>
          Владелец создаёт второго администратора прямо в RemCard: имя, логин и новый пароль. Пароль
          вводится только здесь по HTTPS и не уходит в чат. Отключение снимает доступ, но сохраняет
          автора прежних действий.
        </p>
      </header>

      {viewer ? (
        <div className={styles.viewerBox} data-testid="access-users-viewer">
          <div>
            Вы вошли как <strong>{viewer.displayName}</strong>
          </div>
          <div className={styles.viewerMeta}>
            Фактическая роль: {labelStaffRole(viewer.staffRole)} · {viewer.publicId}
          </div>
        </div>
      ) : null}

      {loadState.kind === "loading" ? (
        <div className={styles.statusBox} role="status" aria-live="polite">
          Загрузка списка…
        </div>
      ) : null}

      {loadState.kind === "forbidden" ? (
        <div className={styles.statusBox} data-tone="forbidden" role="alert">
          <p>
            Доступ только для OWNER или ADMIN. Данные списка скрыты — это не пустая таблица.
            Автоматическое повышение роли недоступно.
          </p>
        </div>
      ) : null}

      {loadState.kind === "unauthorized" ? (
        <div className={styles.statusBox} data-tone="forbidden" role="alert">
          Сессия недействительна. Войдите снова через форму администратора.
        </div>
      ) : null}

      {loadState.kind === "error" ? (
        <div className={styles.statusBox} data-tone="error" role="alert">
          <p>{loadState.message}</p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => void load()}>
              Повторить
            </Button>
          </div>
        </div>
      ) : null}

      {loadState.kind === "ready" || loadState.kind === "empty" ? (
        <>
          {!canManageAccess ? (
            <div className={styles.statusBox} data-tone="forbidden" role="alert">
              Ваша фактическая роль — {labelStaffRole(viewer?.staffRole)}. Создание и отключение
              администраторов доступны OWNER или ADMIN. Самоназначение OWNER недоступно.
            </div>
          ) : null}

          <section className={styles.panel} aria-labelledby={createTitleId}>
            <div className={styles.panelHead}>
              <h2 id={createTitleId} className={styles.panelTitle}>
                Новый администратор
              </h2>
              <p className={styles.panelHint}>
                Роль всегда ADMIN. Пароль — не короче 12 символов; браузер не сохраняет его в
                localStorage и URL.
              </p>
            </div>
            <div className={styles.panelBody}>
              {createError ? (
                <p role="alert" className={styles.statusBox} data-tone="error">
                  {createError}
                </p>
              ) : null}
              {createOk ? (
                <p className={styles.statusBox} data-tone="ok" role="status">
                  {createOk}
                </p>
              ) : null}
              <label className={styles.field} htmlFor="access-users-display-name">
                Имя
                <input
                  ref={displayNameRef}
                  id="access-users-display-name"
                  className={styles.input}
                  autoComplete="name"
                  value={form.displayName}
                  disabled={createBusy || !canManageAccess}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </label>
              <label className={styles.field} htmlFor="access-users-login">
                Логин
                <input
                  id="access-users-login"
                  className={styles.input}
                  autoComplete="username"
                  value={form.login}
                  disabled={createBusy || !canManageAccess}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                />
              </label>
              <div className={styles.field}>
                <label htmlFor="access-users-password">Новый пароль</label>
                <p className={styles.fieldHint} id="access-users-password-hint">
                  Не короче 12 символов. Вводит человек в этом окне RemCard.
                </p>
                <input
                  id="access-users-password"
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="access-users-password-hint"
                  value={form.newPassword}
                  disabled={createBusy || !canManageAccess}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div className={styles.actions}>
                <Button
                  className={styles.submit}
                  type="button"
                  disabled={
                    createBusy ||
                    !canManageAccess ||
                    form.displayName.trim().length < 2 ||
                    form.login.trim().length < 3 ||
                    form.newPassword.length < 12
                  }
                  onClick={() => void submitCreate()}
                >
                  {createBusy ? "Создание…" : "Создать администратора"}
                </Button>
                <Button type="button" disabled={createBusy || !formDirty(form)} onClick={requestResetForm}>
                  Очистить форму
                </Button>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-label="Список администраторов">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Сотрудники с административным доступом</h2>
              <p className={styles.panelHint}>
                Цель OWNER без кнопок удаления. OWNER или ADMIN могут отключить другого ADMIN;
                история действий и actor id сохраняются.
              </p>
            </div>
            {loadState.kind === "empty" ? (
              <div className={styles.statusBox} role="status">
                Пока нет второго администратора. Создайте его формой выше.
              </div>
            ) : (
              <ul className={styles.list}>
                {items.map((row) => {
                  const canRevoke =
                    canManageAccess && row.staffRole === "ADMIN" && row.accessState === "active";
                  return (
                    <li key={row.id} className={styles.listItem}>
                      <div className={styles.listName}>{row.displayName}</div>
                      <div className={styles.listMeta}>
                        {labelStaffRole(row.staffRole)} · {labelAccessState(row.accessState)} ·{" "}
                        {row.publicId}
                        {row.loginNormalized ? ` · логин ${row.loginNormalized}` : null}
                      </div>
                      {row.staffRole === "OWNER" ? (
                        <div className={styles.listMeta}>Владелец: удаление и понижение недоступны.</div>
                      ) : null}
                      {canRevoke ? (
                        <div className={styles.listActions}>
                          <Button
                            className={styles.revokeBtn}
                            type="button"
                            onClick={(e) => {
                              revokeOpenerRef.current = e.currentTarget;
                              setRevokeError("");
                              setRevokeTarget(row);
                            }}
                          >
                            Отключить доступ
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {revokeTarget ? (
        <div className={styles.dialogBackdrop} role="presentation">
          <div
            ref={revokeDialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <h2 id={dialogTitleId} className={styles.dialogTitle}>
              Отключить доступ?
            </h2>
            <p className={styles.dialogBody}>
              «{revokeTarget.displayName}» потеряет вход администратора. Ранее выполненные действия
              сохранят автора. История пользователя не уничтожается.
            </p>
            {revokeError ? (
              <p role="alert" className={styles.statusBox} data-tone="error">
                {revokeError}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button
                ref={revokeConfirmRef}
                type="button"
                disabled={revokeBusy}
                onClick={() => void confirmRevoke()}
              >
                {revokeBusy ? "Отключение…" : "Отключить доступ"}
              </Button>
              <Button type="button" disabled={revokeBusy} onClick={closeRevokeDialog}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmCancel ? (
        <div className={styles.dialogBackdrop} role="presentation">
          <div
            ref={cancelDialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={cancelTitleId}
          >
            <h2 id={cancelTitleId} className={styles.dialogTitle}>
              Очистить форму?
            </h2>
            <p className={styles.dialogBody}>
              Введённые имя, логин и пароль будут сброшены. Пароль нигде не сохранится.
            </p>
            <div className={styles.actions}>
              <Button
                ref={cancelConfirmRef}
                type="button"
                onClick={() => {
                  resetForm();
                  setConfirmCancel(false);
                  displayNameRef.current?.focus();
                }}
              >
                Очистить
              </Button>
              <Button type="button" onClick={() => setConfirmCancel(false)}>
                Продолжить заполнение
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
