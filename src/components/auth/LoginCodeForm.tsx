"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import styles from "./LoginCodeForm.module.css";

const BOT_LOGIN_URL = "https://t.me/RemCardBot?start=login";

type VerifyCodeResponse = {
  user?: {
    id: string;
    publicId?: string;
    displayName?: string;
    role?: string;
    needsDisplayName?: boolean;
  };
};

export function LoginCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();

    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError("Введите 6-значный код");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await remcardFetch<VerifyCodeResponse>("/api/auth/verify-code", {
        method: "POST",
        body: { code: trimmed },
      });
      router.refresh();
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        setError(caught.message || "Неверный или просроченный код");
      } else {
        setError("Не удалось проверить код. Проверьте подключение к backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-labelledby="login-title">
      <h2 id="login-title" className={styles.title}>
        Вход по коду из бота
      </h2>
      <p className={styles.hint}>
        Отправьте{" "}
        <a href={BOT_LOGIN_URL} target="_blank" rel="noopener noreferrer">
          /login боту RemCard
        </a>{" "}
        в Telegram или MAX, затем введите 6-значный код.
      </p>

      <label className={styles.label} htmlFor="login-code">
        Код
      </label>
      <input
        id="login-code"
        className={styles.input}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={loading}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "login-error" : undefined}
      />

      {error ? (
        <p id="login-error" className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading || code.length !== 6}>
        {loading ? "Проверка…" : "Войти"}
      </Button>
    </form>
  );
}
