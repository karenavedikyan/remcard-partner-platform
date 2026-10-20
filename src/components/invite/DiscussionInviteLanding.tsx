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
  viewerRole?: string;
  inviteId?: string;
  canJoin?: boolean;
  inviter?: { displayName: string; partnerType: string | null; city: string | null };
  recipientLabel?: string;
  cooperationSubject?: string;
  expiresAt?: string;
};

function statusTitle(preview: Preview | null, joinedLocally: boolean): string {
  const status = preview?.status ?? "NOT_FOUND";
  const role = preview?.viewerRole;

  if (joinedLocally || (status === "JOINED" && (role === "participant" || role === "inviter"))) {
    return role === "inviter"
      ? "Получатель присоединился к обсуждению"
      : "Вы присоединились к обсуждению";
  }
  if (status === "UNAVAILABLE") return "Ссылка уже использована";
  if (status === "JOINED") return "Ссылка уже использована";
  if (status === "REVOKED") return "Приглашение отозвано";
  if (status === "EXPIRED") return "Срок приглашения истёк";
  if (role === "inviter" && status === "PENDING") {
    return "Это ваша ссылка к обсуждению";
  }
  return "Ссылка недействительна";
}

export function DiscussionInviteLanding({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [redirectInviteId, setRedirectInviteId] = useState<string | null>(null);

  const reloadPreview = useCallback(async () => {
    try {
      const data = await remcardFetch<Preview>(
        `/api/partnership/discussion-invite/public/${encodeURIComponent(token)}`,
      );
      setPreview(data);
      return data;
    } catch {
      setPreview({ status: "NOT_FOUND" });
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await reloadPreview();
      if (!cancelled && data?.status === "JOINED" && data.inviteId) {
        setRedirectInviteId(data.inviteId);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadPreview]);

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
      const result = await remcardFetch<{
        ok: boolean;
        alreadyJoined?: boolean;
        inviteId?: string;
        redirectPath?: string;
      }>("/api/partnership/discussion-invite/join", { method: "POST", body: { token } });
      setJoined(true);
      const inviteId = result.inviteId ?? preview?.inviteId ?? null;
      setRedirectInviteId(inviteId);
      await reloadPreview();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось присоединиться");
    } finally {
      setBusy(false);
    }
  }, [preview?.inviteId, reloadPreview, router, token]);

  function openDiscussionContext() {
    const id = redirectInviteId ?? preview?.inviteId;
    if (id) {
      router.push(`/partners?discussion=${encodeURIComponent(id)}`);
      return;
    }
    router.push("/partners");
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.lead}>Загружаем приглашение…</p>
      </div>
    );
  }

  const status = preview?.status ?? "NOT_FOUND";
  const viewerRole = preview?.viewerRole;
  const canShowJoinForm =
    status === "PENDING" && viewerRole !== "inviter" && (preview?.canJoin ?? true) && !joined;
  const showParticipantContinue =
    joined ||
    (status === "JOINED" && (viewerRole === "participant" || viewerRole === "inviter"));

  if (!canShowJoinForm && !showParticipantContinue) {
    const title = statusTitle(preview, joined);
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <div className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            {viewerRole === "inviter" && status === "PENDING" ? (
              <p className={styles.lead}>
                Отправьте ссылку получателю. Присоединиться к собственной ссылке нельзя — управление в
                разделе «Партнёры».
              </p>
            ) : null}
            <Link href="/">На главную</Link>
          </div>
        </div>
      </div>
    );
  }

  if (showParticipantContinue && !canShowJoinForm) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <div className={styles.card}>
            <h1 className={styles.title}>{statusTitle(preview, joined)}</h1>
            {preview?.cooperationSubject ? (
              <div className={styles.noteBlock}>
                <strong>Предмет</strong>
                <p>{preview.cooperationSubject}</p>
              </div>
            ) : null}
            <p className={styles.lead}>
              Дальше можно предложить условия сотрудничества штатным приглашением — партнёрство создаётся
              только после согласования.
            </p>
            <Button onClick={openDiscussionContext}>Перейти к обсуждению</Button>
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
              <Button onClick={openDiscussionContext}>Перейти к обсуждению</Button>
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
