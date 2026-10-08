"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import { fetchReadinessSafe } from "@/lib/auth-session";
import {
  buildSessionRecoveryLoginHref,
  isAuthFlowComplete,
  resolveDestinationAfterAuth,
} from "@/lib/auth-flow";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "./InviteLanding.module.css";

type PreviewOk = {
  status: "PENDING";
  employer: { displayName: string; type: "BRANCH" | "SOLO_PARTNER" };
  role: string;
  position: string | null;
  expiresAt: string;
};

function roleLabelRu(role: string): string {
  if (role === "MANAGER") return "менеджер";
  if (role === "VIEWER") return "наблюдатель";
  return "продавец";
}

export function StaffInviteAccept() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token")?.trim() || "";
  const returnTo = token ? `/invite/accept?token=${encodeURIComponent(token)}` : "/profile";

  const [preview, setPreview] = useState<
    "loading" | PreviewOk | "ACCEPTED" | "REVOKED" | "EXPIRED" | "NOT_FOUND" | "error"
  >("loading");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [needsContinuation, setNeedsContinuation] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setPreview("NOT_FOUND");
      return;
    }
    setPreview("loading");
    try {
      const data = await remcardFetch<{ status: string; employer?: PreviewOk["employer"] }>(
        `/api/invite/${encodeURIComponent(token)}`,
      );
      if (data.status === "PENDING" && data.employer) {
        setPreview(data as PreviewOk);
      } else {
        setPreview(data.status as "ACCEPTED" | "REVOKED" | "EXPIRED" | "NOT_FOUND");
      }
    } catch {
      setPreview("error");
    }
  }, [token]);

  const refreshSession = useCallback(async () => {
    try {
      const me = await getAuthMe();
      setHasSession(Boolean(me.user));
      if (me.user) {
        const readiness = await fetchReadinessSafe();
        setNeedsContinuation(
          readiness.ok ? !isAuthFlowComplete(readiness.data) : true,
        );
      } else {
        setNeedsContinuation(false);
      }
    } catch {
      setHasSession(false);
      setNeedsContinuation(false);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function acceptInvite() {
    if (!token || accepting) return;
    setAccepting(true);
    setError("");
    try {
      const result = await remcardFetch<{ redirect?: string }>("/api/invite/accept", {
        method: "POST",
        body: { token },
      });
      if (result.redirect) {
        router.replace(result.redirect);
        router.refresh();
      } else {
        router.replace("/profile");
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 401) {
        setError("Сессия завершилась. Войдите снова.");
        setHasSession(false);
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось принять");
      }
    } finally {
      setAccepting(false);
    }
  }

  if (preview === "loading" || !sessionChecked) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <p className={styles.lead}>Загружаем приглашение…</p>
        </div>
      </main>
    );
  }

  if (preview === "error" || preview === "NOT_FOUND") {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <section className={styles.card}>
            <h1 className={styles.title}>Приглашение недоступно</h1>
            <p className={styles.lead}>Проверьте ссылку или запросите новое приглашение у работодателя.</p>
            <Link href="/">На главную</Link>
          </section>
        </div>
      </main>
    );
  }

  if (
    preview === "ACCEPTED" ||
    preview === "REVOKED" ||
    preview === "EXPIRED"
  ) {
    const copy =
      preview === "ACCEPTED"
        ? { title: "Приглашение уже принято", lead: "Доступ оформлен в вашем аккаунте." }
        : preview === "REVOKED"
          ? { title: "Приглашение отозвано", lead: "Работодатель отменил приглашение." }
          : { title: "Срок приглашения истёк", lead: "Запросите новую ссылку." };
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <section className={styles.card}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.lead}>{copy.lead}</p>
            <Link href="/profile">В профиль</Link>
          </section>
        </div>
      </main>
    );
  }

  const pending = preview;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <BrandMark />
        <section className={styles.card}>
          <span className={styles.eyebrow}>RemCard PROF</span>
          <h1 className={styles.title}>Приглашение в команду</h1>
          <p className={styles.lead}>
            {pending.employer.displayName} приглашает вас как {roleLabelRu(pending.role)}
            {pending.position ? ` (${pending.position})` : ""}.
          </p>
          <p className={styles.meta}>
            Срок действия: {new Date(pending.expiresAt).toLocaleString("ru-RU")}
          </p>

          {!hasSession ? (
            <div className={styles.ctaGuest}>
              <Link href={loginHref}>
                <Button>Войти или зарегистрироваться</Button>
              </Link>
              <p className={styles.ctaGuestNote}>
                Вход не означает принятие приглашения — подтвердите его отдельной кнопкой после
                входа.
              </p>
            </div>
          ) : needsContinuation ? (
            <div className={styles.actions}>
              <Button
                onClick={async () => {
                  const readiness = await fetchReadinessSafe();
                  if (readiness.ok) {
                    router.push(resolveDestinationAfterAuth(readiness.data, returnTo));
                  }
                }}
              >
                Продолжить обязательные шаги
              </Button>
            </div>
          ) : (
            <>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}{" "}
                  {/войдите|сессия/i.test(error) ? (
                    <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
                  ) : null}
                </p>
              ) : null}
              <div className={styles.actions}>
                <Button disabled={accepting} onClick={() => void acceptInvite()}>
                  {accepting ? "Принимаем…" : "Принять приглашение"}
                </Button>
                <Link href="/profile">
                  <Button variant="secondary">В профиль</Button>
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
