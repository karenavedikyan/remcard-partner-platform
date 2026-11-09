"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import { buildSessionRecoveryLoginHref } from "@/lib/auth-flow";
import {
  buildInviteProfileCompletionHref,
  discussionPartnersHref,
  extractAuthContinuationFromPayload,
  extractAuthContinuationRedirect,
  fetchInviteProfileReadiness,
  isStrictPostOk,
  planRouteAfterInviteSuccess,
} from "@/lib/invite-profile-completion";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/BrandMark";
import { InviteAcceptedProfilePrompt } from "./InviteAcceptedProfilePrompt";
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
  const [joinConfirmed, setJoinConfirmed] = useState(false);
  const [redirectInviteId, setRedirectInviteId] = useState<string | null>(null);
  const [continueDestination, setContinueDestination] = useState<string | null>(null);
  const [profileCheckError, setProfileCheckError] = useState("");
  const [profileChecking, setProfileChecking] = useState(false);
  const joinInFlightRef = useRef(false);
  const joinCompletedRef = useRef(false);
  const mountedRef = useRef(true);
  const routeGeneration = useRef(0);

  const isRequestActive = useCallback((generation: number) => {
    return mountedRef.current && generation === routeGeneration.current;
  }, []);

  const reloadPreview = useCallback(
    async (requestGeneration?: number) => {
      try {
        const data = await remcardFetch<Preview>(
          `/api/partnership/discussion-invite/public/${encodeURIComponent(token)}`,
        );
        const active =
          requestGeneration === undefined
            ? mountedRef.current
            : isRequestActive(requestGeneration);
        if (active) setPreview(data);
        return data;
      } catch {
        if (
          requestGeneration === undefined
            ? mountedRef.current
            : isRequestActive(requestGeneration)
        ) {
          setPreview({ status: "NOT_FOUND" });
        }
        return null;
      }
    },
    [isRequestActive, token],
  );

  useEffect(() => {
    mountedRef.current = true;
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
      mountedRef.current = false;
      routeGeneration.current += 1;
    };
  }, [reloadPreview]);

  const resolveDiscussionDestination = useCallback(
    (inviteId: string | null | undefined) => {
      const id = inviteId ?? preview?.inviteId ?? redirectInviteId;
      return discussionPartnersHref(id ?? "");
    },
    [preview?.inviteId, redirectInviteId],
  );

  const routeAfterJoinSuccess = useCallback(
    async (inviteId: string | null | undefined, requestGeneration: number) => {
      const destination = resolveDiscussionDestination(inviteId);
      if (!isRequestActive(requestGeneration)) return;
      setJoinConfirmed(true);
      setContinueDestination(destination);
      setProfileCheckError("");
      setProfileChecking(true);
      const readiness = await fetchInviteProfileReadiness();
      if (!isRequestActive(requestGeneration)) return;
      setProfileChecking(false);
      const plan = planRouteAfterInviteSuccess(readiness, destination, "discussion");
      if (readiness.status === "error") {
        setProfileCheckError(
          "Не удалось проверить профиль. Это не значит, что данных точно не хватает.",
        );
        return;
      }
      router.replace(plan.href);
      router.refresh();
    },
    [isRequestActive, resolveDiscussionDestination, router],
  );

  const join = useCallback(async () => {
    if (busy || joinInFlightRef.current || joinCompletedRef.current) return;
    joinInFlightRef.current = true;
    const requestGeneration = ++routeGeneration.current;
    setBusy(true);
    setError("");
    try {
      const me = await getAuthMe();
      if (!isRequestActive(requestGeneration)) return;
      if (!me?.user) {
        const returnTo = `/invite/discussion/${encodeURIComponent(token)}`;
        router.push(buildSessionRecoveryLoginHref(returnTo));
        return;
      }
      const result = await remcardFetch<{
        ok?: boolean;
        inviteId?: string;
        redirectPath?: string;
      }>("/api/partnership/discussion-invite/join", { method: "POST", body: { token } });
      if (!isRequestActive(requestGeneration)) return;
      if (!isStrictPostOk(result)) {
        const continuation = extractAuthContinuationFromPayload(result);
        if (continuation) {
          router.replace(continuation);
          router.refresh();
          return;
        }
        setError("Не удалось присоединиться. Обновите страницу и повторите.");
        return;
      }
      joinCompletedRef.current = true;
      const inviteId =
        (result as { inviteId?: string }).inviteId ?? preview?.inviteId ?? null;
      setRedirectInviteId(inviteId);
      await reloadPreview(requestGeneration);
      if (!isRequestActive(requestGeneration)) return;
      await routeAfterJoinSuccess(inviteId, requestGeneration);
    } catch (caught) {
      if (!isRequestActive(requestGeneration)) return;
      if (caught instanceof RemcardApiError) {
        const continuation = extractAuthContinuationRedirect(caught);
        if (continuation) {
          router.replace(continuation);
          router.refresh();
          return;
        }
      }
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось присоединиться");
    } finally {
      joinInFlightRef.current = false;
      if (isRequestActive(requestGeneration)) {
        setBusy(false);
      }
    }
  }, [busy, isRequestActive, preview?.inviteId, reloadPreview, routeAfterJoinSuccess, router, token]);

  const openDiscussionContext = useCallback(async () => {
    const destination = continueDestination ?? resolveDiscussionDestination(redirectInviteId);
    const requestGeneration = ++routeGeneration.current;
    setProfileChecking(true);
    setProfileCheckError("");
    const readiness = await fetchInviteProfileReadiness();
    if (!isRequestActive(requestGeneration)) return;
    setProfileChecking(false);
    const plan = planRouteAfterInviteSuccess(readiness, destination, "discussion");
    if (readiness.status === "error") {
      setProfileCheckError(
        "Не удалось проверить профиль. Это не значит, что данных точно не хватает.",
      );
      setContinueDestination(destination);
      setJoinConfirmed(true);
      return;
    }
    router.replace(plan.href);
    router.refresh();
  }, [continueDestination, isRequestActive, redirectInviteId, resolveDiscussionDestination, router]);

  async function retryProfileCheck() {
    if (!continueDestination || profileChecking || !joinConfirmed) return;
    const requestGeneration = routeGeneration.current;
    setProfileCheckError("");
    setProfileChecking(true);
    const readiness = await fetchInviteProfileReadiness();
    if (!isRequestActive(requestGeneration)) return;
    setProfileChecking(false);
    const plan = planRouteAfterInviteSuccess(
      readiness,
      continueDestination,
      "discussion",
    );
    if (readiness.status === "error") {
      setProfileCheckError(
        "Не удалось проверить профиль. Это не значит, что данных точно не хватает.",
      );
      return;
    }
    router.replace(plan.href);
    router.refresh();
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

  if (joinConfirmed && continueDestination && (profileChecking || profileCheckError)) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <InviteAcceptedProfilePrompt
            variant="discussion"
            profileHref={buildInviteProfileCompletionHref(continueDestination, "discussion")}
            continueHref={continueDestination}
            checkError={profileCheckError}
            checking={profileChecking}
            onRetryCheck={() => void retryProfileCheck()}
          />
        </div>
      </div>
    );
  }

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
            {profileCheckError ? (
              <p className={styles.error} role="alert">
                {profileCheckError}
              </p>
            ) : null}
            <Button disabled={profileChecking} onClick={() => void openDiscussionContext()}>
              {profileChecking ? "Проверяем профиль…" : "Перейти к обсуждению"}
            </Button>
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
              <Button disabled={profileChecking} onClick={() => void openDiscussionContext()}>
                {profileChecking ? "Проверяем профиль…" : "Перейти к обсуждению"}
              </Button>
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
