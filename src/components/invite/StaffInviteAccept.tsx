"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { fetchReadinessSafe } from "@/lib/auth-session";
import { buildSessionRecoveryLoginHref } from "@/lib/auth-flow";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "./InviteLanding.module.css";

type PreviewOk = {
  status: "PENDING";
  employer: { displayName: string; type: "BRANCH" | "SOLO_PARTNER" | "ORGANIZATION" };
  role: string;
  position: string | null;
  membershipKind?: string | null;
  branchLabels?: string[];
  allCurrentBranchesSnapshot?: boolean;
  expiresAt: string;
};

function roleLabelRu(role: string): string {
  if (role === "MANAGER") return "менеджер";
  if (role === "VIEWER") return "наблюдатель";
  return "продавец";
}

function mapProfRedirect(redirect: string | undefined): string {
  if (!redirect) return "/";
  if (redirect === "/pro" || redirect === "/client" || redirect.startsWith("/pro/")) {
    return "/";
  }
  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/";
}

export function StaffInviteAccept() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token")?.trim() || "";
  const returnTo = token ? `/invite/accept?token=${encodeURIComponent(token)}` : "/profile";

  const [preview, setPreview] = useState<
    "loading" | PreviewOk | "ACCEPTED" | "REVOKED" | "EXPIRED" | "NOT_FOUND" | "error"
  >("loading");
  const [previewError, setPreviewError] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [needsConsents, setNeedsConsents] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setPreview("NOT_FOUND");
      return;
    }
    setPreview("loading");
    setPreviewError(false);
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
      setPreviewError(true);
    }
  }, [token]);

  const refreshSession = useCallback(async () => {
    try {
      const me = await getAuthMe();
      setHasSession(Boolean(me.user));
      if (me.user) {
        const readiness = await fetchReadinessSafe();
        setNeedsConsents(readiness.ok ? hasPendingLoginConsents(readiness.data) : true);
      } else {
        setNeedsConsents(false);
      }
    } catch {
      setHasSession(false);
      setNeedsConsents(false);
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
      router.replace(mapProfRedirect(result.redirect));
      router.refresh();
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

  if ((preview === "loading" || !sessionChecked) && !previewError) {
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
            {previewError ? (
              <Button type="button" onClick={() => void loadPreview()}>
                Повторить загрузку
              </Button>
            ) : null}
            <Link href="/">На главную</Link>
          </section>
        </div>
      </main>
    );
  }

  if (preview === "ACCEPTED" || preview === "REVOKED" || preview === "EXPIRED") {
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
            <Link href="/">В кабинет</Link>
          </section>
        </div>
      </main>
    );
  }

  if (preview === "loading") {
    return null;
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
            {pending.employer.displayName} приглашает вас как сотрудника ({roleLabelRu(pending.role)}
            {pending.position ? ` · ${pending.position}` : ""}). Это приглашение в команду, не
            партнёрство и не публикация в каталоге.
          </p>
          {pending.employer.type === "ORGANIZATION" ? (
            <p className={styles.meta}>
              {pending.membershipKind === "HEAD_OFFICE" ? "Головной офис" : "Сотрудник филиалов"}
              {pending.branchLabels?.length
                ? ` · филиалы: ${pending.branchLabels.join(", ")}`
                : " · без доступа к операциям филиалов"}
              {pending.allCurrentBranchesSnapshot
                ? " · набор «все текущие филиалы» (новые добавляются отдельно)"
                : ""}
            </p>
          ) : null}
          <p className={styles.meta}>
            Срок действия: {new Date(pending.expiresAt).toLocaleString("ru-RU")}
          </p>

          {error ? (
            <p className={styles.error} role="alert">
              {error}{" "}
              {/войдите|сессия/i.test(error) ? (
                <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
              ) : null}
            </p>
          ) : null}

          {!hasSession ? (
            <div className={styles.ctaGuest}>
              <Link href={loginHref}>
                <Button>Войти или зарегистрироваться</Button>
              </Link>
              <p className={styles.ctaGuestNote}>
                Создание компании или публикация в каталоге не требуются — только вход и явное
                принятие приглашения.
              </p>
            </div>
          ) : needsConsents ? (
            <div className={styles.actions}>
              <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}&step=consents`}>
                <Button>Примите обязательные соглашения</Button>
              </Link>
              <Button type="button" variant="secondary" onClick={() => void refreshSession()}>
                Обновить статус
              </Button>
            </div>
          ) : (
            <div className={styles.actions}>
              <Button disabled={accepting} onClick={() => void acceptInvite()}>
                {accepting ? "Принимаем…" : "Принять приглашение"}
              </Button>
              <Link href="/">
                <Button variant="secondary">В кабинет</Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
