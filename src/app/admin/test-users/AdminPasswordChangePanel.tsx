"use client";

import { useState } from "react";
import { adminPasswordChange } from "@/lib/prof-admin-api";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import r1Styles from "./AdminPasswordChangePanel.r1.module.css";

type Props = {
  /** Visual chrome only. Default keeps legacy shared adminPanel classes for harness/test-users. */
  presentationVariant?: "legacy" | "r1";
};

export function AdminPasswordChangePanel({ presentationVariant = "legacy" }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminPasswordChange(currentPassword, newPassword);
      setMessage("Пароль обновлён. Другие сессии отозваны.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сменить пароль");
    } finally {
      setBusy(false);
    }
  };

  const isR1 = presentationVariant === "r1";

  if (isR1) {
    return (
      <section
        className={r1Styles.panel}
        aria-labelledby="admin-password-heading"
        data-admin-password-variant="r1"
      >
        <div className={r1Styles.panelHead}>
          <h2 id="admin-password-heading" className={r1Styles.panelTitle}>
            Пароль администратора
          </h2>
          <p className={r1Styles.panelHint}>
            Смена пароля отзовёт другие активные сессии. Новый пароль — не короче 12 символов.
          </p>
        </div>
        <div className={r1Styles.panelBody}>
          {error ? (
            <p role="alert" className={r1Styles.statusError}>
              {error}
            </p>
          ) : null}
          {message ? <p className={r1Styles.statusOk}>{message}</p> : null}
          <div className={r1Styles.field}>
            <label htmlFor="admin-password-current">Текущий пароль</label>
            <input
              id="admin-password-current"
              className={r1Styles.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className={r1Styles.field}>
            <label htmlFor="admin-password-new">Новый пароль</label>
            <p className={r1Styles.fieldHint} id="admin-password-new-hint">
              Не короче 12 символов
            </p>
            <input
              id="admin-password-new"
              className={r1Styles.input}
              type="password"
              autoComplete="new-password"
              aria-describedby="admin-password-new-hint"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className={r1Styles.actions}>
            <Button
              className={r1Styles.submit}
              type="button"
              disabled={busy || newPassword.length < 12}
              onClick={() => void submit()}
            >
              {busy ? "Сохранение…" : "Сменить пароль"}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="adminPanel" aria-labelledby="admin-password-heading" data-admin-password-variant="legacy">
      <h2 id="admin-password-heading">Пароль администратора</h2>
      {error ? (
        <p role="alert" className="adminError">
          {error}
        </p>
      ) : null}
      {message ? <p className="adminOk">{message}</p> : null}
      <label>
        Текущий пароль
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label>
        Новый пароль (не короче 12 символов)
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <Button type="button" disabled={busy || newPassword.length < 12} onClick={() => void submit()}>
        {busy ? "Сохранение…" : "Сменить пароль"}
      </Button>
    </section>
  );
}
