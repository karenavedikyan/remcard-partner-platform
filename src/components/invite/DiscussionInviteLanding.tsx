"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import { buildSessionRecoveryLoginHref } from "@/lib/auth-flow";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "./InviteLanding.module.css";

type Preview = {
  status: string;
  inviter?: { displayName: string; partnerType: string | null; city: string | null };
  recipientLabel?: string;
  cooperationSubject?: string;
  expiresAt?: string;
};

export function DiscussionInviteLanding({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await remcardFetch<Preview>(
          `/api/partnership/discussion-invite/public/${encodeURIComponent(token)}`,
        );
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setPreview({ status: "NOT_FOUND" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const join = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const me = await getAuthMe();
      if (!me?.user) {
        const returnTo = `/invite/discussion/${encodeURIComponent(token)}`;
        router.push(buildSessionRecoveryLoginHref(returnTo));
        return;
      }
      await remcardFetch<{ ok: boolean; alreadyJoined?: boolean }>(
        "/api/partnership/discussion-invite/join",
        { method: "POST", body: { token } },
      );
      setJoined(true);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось присоединиться");
    } finally {
      setBusy(false);
    }
  }, [router, token]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.lead}>Загружаем приглашение…</p>
      </div>
    );
  }

  const status = preview?.status ?? "NOT_FOUND";
  if (status !== "PENDING" && !joined) {
    const title =
      status === "JOINED"
        ? "Вы уже присоединились к обсуждению"
        : status === "REVOKED"
          ? "Приглашение отозвано"
          : status === "EXPIRED"
            ? "Срок приглашения истёк"
            : "Ссылка недействительна";
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <div className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            <Link href="/">На главную</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <BrandMark />
        <div className={styles.card}>
          <p className={styles.eyebrow}>Приглашение к обсуждению</p>
          <h1 className={styles.title}>
            {preview?.inviter?.displayName ?? "Партнёр RemCard"} приглашает обсудить сотрудничество
          </h1>
          {preview?.recipientLabel ? (
            <p className={styles.inviterLine}>Для: {preview.recipientLabel}</p>
          ) : null}
          {preview?.cooperationSubject ? (
            <div className={styles.noteBlock}>
              <strong>Предмет</strong>
              <p>{preview.cooperationSubject}</p>
            </div>
          ) : null}
          <p className={styles.lead}>
            Присоединение не создаёт партнёрство и не согласует проценты — только открывает обсуждение.
            Дальнейшие условия оформляются отдельно, если вы решите сотрудничать.
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {joined ? (
            <>
              <p className={styles.notice}>Вы присоединились к обсуждению.</p>
              <Button onClick={() => router.push("/partners")}>Открыть кабинет</Button>
            </>
          ) : (
            <div className={styles.actions}>
              <Button disabled={busy} onClick={() => void join()}>
                Присоединиться к обсуждению
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
