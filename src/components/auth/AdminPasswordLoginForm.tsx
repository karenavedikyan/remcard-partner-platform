"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { adminPasswordLogin } from "@/lib/prof-admin-api";
import { Button } from "@/components/ui/Button";
import styles from "./auth.module.css";

type Props = {
  returnTo?: string | null;
};

export function AdminPasswordLoginForm({ returnTo }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await adminPasswordLogin(login, password);
      router.replace(returnTo?.startsWith("/admin") ? returnTo : "/admin/test-users");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message || "Неверный логин или пароль."
          : "Не удалось войти. Проверьте подключение.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label}>
        Логин администратора
        <input
          className={styles.input}
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
        />
      </label>
      <label className={styles.label}>
        Пароль
        <div className={styles.passwordRow}>
          <input
            className={styles.input}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Скрыть" : "Показать"}
          </button>
        </div>
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Вход…" : "Войти"}
      </Button>
    </form>
  );
}
