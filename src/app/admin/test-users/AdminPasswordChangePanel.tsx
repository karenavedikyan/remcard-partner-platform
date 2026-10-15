"use client";

import { useState } from "react";
import { adminPasswordChange } from "@/lib/prof-admin-api";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function AdminPasswordChangePanel() {
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

  return (
    <section className="adminPanel" aria-labelledby="admin-password-heading">
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
