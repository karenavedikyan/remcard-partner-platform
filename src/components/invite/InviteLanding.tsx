"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { fetchReadinessSafe } from "@/lib/auth-session";
import {
  buildSessionRecoveryLoginHref,
  isAuthFlowComplete,
  resolveDestinationAfterAuth,
} from "@/lib/auth-flow";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  buildInviteLandingCopy,
  INVITE_ACCEPT_FINE_PRINT,
  INVITE_GUEST_FINE_PRINT,
  inviteRegistrationHref,
} from "@/lib/invite-presentation";
import {
  linkInvitePreviewExcludedLabelsForDisplay,
  linkInvitePreviewHasAcceptableTerms,
  linkInvitePreviewParticipatingRowsForDisplay,
  LINK_INVITE_TERMS_UNAVAILABLE_MESSAGE,
} from "@/lib/link-invite-public";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import { BrandMark } from "@/components/layout/BrandMark";
import {
  buildInviteProfileCompletionHref,
  extractAuthContinuationFromPayload,
  extractAuthContinuationRedirect,
  fetchInviteProfileReadiness,
  isStrictPostOk,
  planRouteAfterInviteSuccess,
  sanitizeInternalPath,
} from "@/lib/invite-profile-completion";
import { InviteAcceptedProfilePrompt } from "./InviteAcceptedProfilePrompt";
import { InviteDock, InviteFlow, InviteSteps, useOffscreen } from "./InviteLandingParts";
import styles from "./InviteLanding.module.css";

type PreviewTerm = {
  category: string;
  categoryLabel: string;
  storePercent: number;
  isExcluded: boolean;
};

type PreviewData = {
  status: string;
  inviter?: { displayName: string; partnerType: string | null; city: string | null };
  intendedPartnerType?: string | null;
  terms?: PreviewTerm[];
  note?: string | null;
  expiresAt?: string;
};

type InviteLandingProps = {
  token: string;
};

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COPY: Record<string, { title: string; lead: string }> = {
  PENDING: { title: "", lead: "" },
  ACCEPTED: {
    title: "Приглашение уже принято",
    lead: "Эта ссылка больше недоступна для новых участников.",
  },
  REVOKED: {
    title: "Приглашение отозвано",
    lead: "Отправитель отменил предложение. Попросите новую ссылку.",
  },
  EXPIRED: {
    title: "Срок приглашения истёк",
    lead: "Попросите отправителя создать новую ссылку.",
  },
  NOT_FOUND: {
    title: "Ссылка недействительна",
    lead: "Проверьте адрес или запросите новое приглашение.",
  },
};

function profileBlocksPrivateAccept(
  user: AuthUser | null,
  readiness: CabinetReadiness | null,
): boolean {
  if (!user || user.role !== "PRO") return true;
  if (!readiness?.canAccessCabinet) return true;
  if (readiness.needsProfileOnboarding) return true;
  if (readiness.needsProfileCompletion) return true;
  return false;
}

function continuationLabel(readiness: CabinetReadiness): string {
  if (readiness.needsProfileOnboarding) {
    return "Продолжить регистрацию";
  }
  return "Продолжить вход";
}

function continuationLead(readiness: CabinetReadiness): string {
  if (readiness.needsProfileOnboarding) {
    return "Завершите обязательные шаги профиля — после этого вы сможете принять или отклонить предложение на этой странице.";
  }
  return "Примите обязательные соглашения — после этого вы сможете принять или отклонить предложение на этой странице.";
}

export function InviteLanding({ token }: InviteLandingProps) {
  const router = useRouter();
  const returnTo = `/invite/${encodeURIComponent(token)}`;
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [readiness, setReadiness] = useState<CabinetReadiness | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [declinedLocally, setDeclinedLocally] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [existingPartnershipId, setExistingPartnershipId] = useState<string | null>(null);
  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [postAcceptDestination, setPostAcceptDestination] = useState<string | null>(null);
  const [postAcceptCheckError, setPostAcceptCheckError] = useState("");
  const [postAcceptChecking, setPostAcceptChecking] = useState(false);
  const acceptInFlightRef = useRef(false);
  const acceptCompletedRef = useRef(false);
  const mountedRef = useRef(true);
  const routeGeneration = useRef(0);
  const [actionsRef, actionsOffscreen] = useOffscreen<HTMLDivElement>();

  const loadPreview = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await remcardFetch<PreviewData>(
        `/api/partnership/link-invite/public/${encodeURIComponent(token)}`,
      );
      setPreview(data);
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setLoadError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить приглашение",
      );
    }
  }, [token]);

  const refreshSession = useCallback(async () => {
    try {
      const me = await getAuthMe();
      setAuthUser(me.user);
      if (me.user) {
        const readinessResult = await fetchReadinessSafe();
        setReadiness(readinessResult.ok ? readinessResult.data : null);
      } else {
        setReadiness(null);
      }
    } catch {
      setAuthUser(null);
      setReadiness(null);
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

  const isRequestActive = useCallback((generation: number) => {
    return mountedRef.current && generation === routeGeneration.current;
  }, []);

  const completeAcceptedInvite = useCallback(
    async (destinationRaw: string, requestGeneration: number) => {
      const destination = sanitizeInternalPath(destinationRaw, "/partners");
      if (!isRequestActive(requestGeneration)) return;
      setAcceptConfirmed(true);
      setPostAcceptDestination(destination);
      setPostAcceptCheckError("");
      setPostAcceptChecking(true);
      const readiness = await fetchInviteProfileReadiness();
      if (!isRequestActive(requestGeneration)) return;
      setPostAcceptChecking(false);
      const plan = planRouteAfterInviteSuccess(readiness, destination, "partnership");
      if (readiness.status === "error") {
        setPostAcceptCheckError(
          "Не удалось проверить профиль. Это не значит, что данных точно не хватает.",
        );
        return;
      }
      router.replace(plan.href);
      router.refresh();
    },
    [isRequestActive, router],
  );

  async function retryPostAcceptProfileCheck() {
    if (!postAcceptDestination || postAcceptChecking || !acceptConfirmed) return;
    const requestGeneration = routeGeneration.current;
    setPostAcceptCheckError("");
    setPostAcceptChecking(true);
    const readiness = await fetchInviteProfileReadiness();
    if (!isRequestActive(requestGeneration)) return;
    setPostAcceptChecking(false);
    const plan = planRouteAfterInviteSuccess(
      readiness,
      postAcceptDestination,
      "partnership",
    );
    if (readiness.status === "error") {
      setPostAcceptCheckError(
        "Не удалось проверить профиль. Это не значит, что данных точно не хватает.",
      );
      return;
    }
    router.replace(plan.href);
    router.refresh();
  }

  async function acceptInvite() {
    if (
      acceptInFlightRef.current ||
      accepting ||
      acceptCompletedRef.current ||
      profileBlocksPrivateAccept(authUser, readiness) ||
      !preview ||
      !linkInvitePreviewHasAcceptableTerms(preview)
    ) {
      return;
    }
    acceptInFlightRef.current = true;
    const requestGeneration = ++routeGeneration.current;
    setAccepting(true);
    setAcceptError("");
    setExistingPartnershipId(null);
    setDeclinedLocally(false);
    setPostAcceptCheckError("");
    try {
      const result = await remcardFetch<{ ok?: boolean; redirect?: string }>(
        "/api/partnership/link-invite/accept",
        { method: "POST", body: { token } },
      );
      if (!isRequestActive(requestGeneration)) return;
      if (!isStrictPostOk(result)) {
        const continuation = extractAuthContinuationFromPayload(result);
        if (continuation) {
          router.replace(continuation);
          router.refresh();
          return;
        }
        setAcceptError("Не удалось принять приглашение. Попробуйте обновить страницу.");
        return;
      }
      acceptCompletedRef.current = true;
      const destination = sanitizeInternalPath(result.redirect ?? "/partners", "/partners");
      await completeAcceptedInvite(destination, requestGeneration);
    } catch (caught) {
      if (!isRequestActive(requestGeneration)) return;
      if (caught instanceof RemcardApiError && caught.status === 401) {
        setAcceptError("Сессия завершилась. Войдите снова.");
        setAuthUser(null);
        setReadiness(null);
      } else if (caught instanceof RemcardApiError) {
        const body = caught.body as { code?: string; partnershipId?: string } | undefined;
        const continuation = extractAuthContinuationRedirect(caught);
        if (continuation) {
          router.replace(continuation);
          router.refresh();
          return;
        }
        if (
          body?.partnershipId &&
          (body.code === "PARTNERSHIP_ALREADY_ACTIVE" || body.code === "PARTNERSHIP_EXISTS")
        ) {
          setExistingPartnershipId(body.partnershipId);
        }
        setAcceptError(caught.message);
      } else {
        setAcceptError("Не удалось принять");
      }
    } finally {
      acceptInFlightRef.current = false;
      if (isRequestActive(requestGeneration)) {
        setAccepting(false);
      }
    }
  }

  function handleDecline() {
    setDeclinedLocally(true);
    setAcceptError("");
  }

  function handleReturnToOffer() {
    setDeclinedLocally(false);
    void loadPreview();
    void refreshSession();
  }

  async function handleSwitchAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      await remcardFetch("/api/auth/logout", { method: "POST", body: {} });
    } catch {
      // proceed to login even if logout endpoint fails
    } finally {
      setAuthUser(null);
      setReadiness(null);
      setSwitchingAccount(false);
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      router.refresh();
    }
  }

  function handleContinueRegistration() {
    if (!readiness) return;
    router.push(resolveDestinationAfterAuth(readiness, returnTo));
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const hasSession = Boolean(authUser);
  const profileIncomplete = profileBlocksPrivateAccept(authUser, readiness);
  const needsContinuation = Boolean(hasSession && readiness && !isAuthFlowComplete(readiness));
  const termsAcceptable = preview ? linkInvitePreviewHasAcceptableTerms(preview) : false;
  const canAccept =
    hasSession &&
    readiness &&
    isAuthFlowComplete(readiness) &&
    !profileIncomplete &&
    termsAcceptable;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      routeGeneration.current += 1;
    };
  }, []);

  if (acceptConfirmed && postAcceptDestination && (postAcceptChecking || postAcceptCheckError)) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <InviteAcceptedProfilePrompt
            variant="partnership"
            profileHref={buildInviteProfileCompletionHref(postAcceptDestination, "partnership")}
            continueHref={postAcceptDestination}
            checkError={postAcceptCheckError}
            checking={postAcceptChecking}
            onRetryCheck={() => void retryPostAcceptProfileCheck()}
          />
        </div>
      </main>
    );
  }

  if (loadState === "loading" || !sessionChecked) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <p className={styles.lead}>Загружаем приглашение…</p>
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <section className={styles.card}>
            <h1 className={styles.title}>Не удалось загрузить приглашение</h1>
            <p className={styles.error} role="alert">
              {loadError}
            </p>
            <Button onClick={() => void loadPreview()}>Повторить</Button>
          </section>
        </div>
      </main>
    );
  }

  if (!preview || preview.status !== "PENDING") {
    const copy = STATUS_COPY[preview?.status ?? "NOT_FOUND"] ?? STATUS_COPY.NOT_FOUND;
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <section className={styles.card}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.lead}>{copy.lead}</p>
            <Link href="/">На главную</Link>
          </section>
        </div>
      </main>
    );
  }

  if (declinedLocally) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <BrandMark />
          <section className={styles.card}>
            <h1 className={styles.title}>Вы не приняли предложение</h1>
            <p className={styles.lead}>
              Сотрудничество не начато. К условиям можно вернуться, пока ссылка активна.
            </p>
            {preview.expiresAt ? (
              <p className={styles.meta}>Ссылка действует до {formatExpiry(preview.expiresAt)}</p>
            ) : null}
            <div className={styles.actions}>
              <Button onClick={() => void handleReturnToOffer()}>Вернуться к условиям</Button>
              <Link href="/">
                <Button variant="secondary">На главную</Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const copy = buildInviteLandingCopy(
    preview,
    authUser
      ? { partnerType: authUser.partnerType, partnerActivities: authUser.partnerActivities }
      : null,
  );
  const activeTerms = linkInvitePreviewParticipatingRowsForDisplay(preview.terms);
  const excludedTerms = linkInvitePreviewExcludedLabelsForDisplay(preview.terms);
  const registrationHref = inviteRegistrationHref(preview.intendedPartnerType, returnTo);
  const profileHref = buildInviteProfileCompletionHref(returnTo);
  const primaryLinkClass = `${buttonStyles.button} ${buttonStyles.primary} ${styles.fullButton}`;
  const readyToAccept = hasSession && !needsContinuation && !profileIncomplete;
  const stage: "guest" | "continuation" | "profile" | "accept" = !hasSession
    ? "guest"
    : needsContinuation && readiness
      ? "continuation"
      : profileIncomplete
        ? "profile"
        : "accept";

  const acceptErrorBlock = acceptError ? (
    <p className={styles.error} role="alert">
      {acceptError}{" "}
      {/войдите|сессия/i.test(acceptError) ? (
        <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
      ) : null}
    </p>
  ) : null;

  const declineAndSwitch = (
    <p className={styles.altActions}>
      <span>Не подходит?</span>
      <button
        type="button"
        className={styles.linkAction}
        disabled={accepting}
        onClick={() => void handleDecline()}
      >
        Отклонить
      </button>
      <button
        type="button"
        className={styles.linkAction}
        disabled={switchingAccount || accepting}
        onClick={() => void handleSwitchAccount()}
      >
        {switchingAccount ? "Выходим…" : "Сменить аккаунт"}
      </button>
    </p>
  );

  const acceptButton = (
    <Button
      className={styles.fullButton}
      disabled={accepting || !canAccept}
      onClick={() => void acceptInvite()}
    >
      {accepting ? "Принимаем…" : "Принять условия"}
    </Button>
  );

  const dockAction =
    stage === "guest" ? (
      <Link href={registrationHref} className={primaryLinkClass}>
        Зарегистрироваться
      </Link>
    ) : stage === "continuation" && readiness ? (
      <Button className={styles.fullButton} onClick={() => handleContinueRegistration()}>
        {continuationLabel(readiness)}
      </Button>
    ) : stage === "profile" ? (
      <Link href={profileHref} className={primaryLinkClass}>
        Заполнить профиль
      </Link>
    ) : (
      acceptButton
    );

  return (
    <main className={`${styles.page} ${styles.pageWithDock}`}>
      <div className={styles.wrapWide}>
        <BrandMark />
        <article
          className={styles.invitation}
          aria-busy={accepting}
          data-testid="invite-landing"
          data-direction={copy.direction}
        >
          <div className={styles.offer}>
            <p className={styles.kicker}>{copy.kicker}</p>
            <h1 className={styles.heroTitle}>{copy.headline}</h1>
            {copy.senderLine ? <p className={styles.sender}>{copy.senderLine}</p> : null}
            <p className={styles.heroLead}>{copy.lead}</p>

            <InviteFlow title={copy.flowTitle} items={copy.flow} />

            {activeTerms.length > 0 || excludedTerms.length > 0 ? (
              <section className={styles.rateSection} data-testid="invite-terms">
                <div className={styles.rateHead}>
                  <h2 className={styles.sectionTitle}>{copy.termsTitle}</h2>
                  <span>{copy.termsColumn}</span>
                </div>
                <dl className={styles.rates}>
                  {activeTerms.map((term) => (
                    <div key={`${term.category}-${term.storePercent}`}>
                      <dt>{displayCategoryLabel(term.category, term.categoryLabel)}</dt>
                      <dd>{term.storePercent}%</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.explanation}>{copy.percentExplainer}</p>
                {excludedTerms.length > 0 ? (
                  <p className={styles.explanation}>
                    Не участвуют:{" "}
                    {excludedTerms
                      .map((term) => displayCategoryLabel(term.category, term.categoryLabel))
                      .join(", ")}
                  </p>
                ) : null}
              </section>
            ) : null}

            {copy.mutual ? (
              <section className={styles.mutual} data-testid="invite-mutual">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 9h15m-4-4 4 4-4 4M20 15H5m4 4-4-4 4-4" />
                </svg>
                <div>
                  <h2>{copy.mutual.title}</h2>
                  <p>{copy.mutual.text}</p>
                </div>
              </section>
            ) : null}

            {preview.note ? (
              <figure className={styles.senderNote} data-testid="invite-note">
                <figcaption>{copy.noteCaption}</figcaption>
                <blockquote>{preview.note}</blockquote>
              </figure>
            ) : null}
          </div>

          <aside className={styles.next} data-testid="invite-next" data-stage={stage}>
            <h2 className={styles.sectionTitle}>{copy.stepsTitle}</h2>
            <InviteSteps steps={copy.steps} current={readyToAccept ? 2 : 1} />

            {stage === "guest" ? (
              <>
                <div className={styles.nextActions} ref={actionsRef}>
                  {acceptErrorBlock}
                  <Link href={registrationHref} className={primaryLinkClass}>
                    Зарегистрироваться
                  </Link>
                  <p className={styles.altActions}>
                    <span>Уже есть аккаунт?</span>
                    <Link href={loginHref} className={styles.linkAction}>
                      Войти
                    </Link>
                  </p>
                </div>
                <p className={styles.fine}>{INVITE_GUEST_FINE_PRINT}</p>
              </>
            ) : stage === "continuation" && readiness ? (
              <>
                <p className={styles.nextCopy}>
                  <strong>Завершите обязательные шаги.</strong> {continuationLead(readiness)}
                </p>
                <div className={styles.nextActions} ref={actionsRef}>
                  <Button className={styles.fullButton} onClick={() => handleContinueRegistration()}>
                    {continuationLabel(readiness)}
                  </Button>
                  {declineAndSwitch}
                </div>
              </>
            ) : stage === "profile" ? (
              <>
                <p className={styles.nextCopy}>
                  <strong>Дозаполните профиль.</strong> Укажите имя представителя, город и тип
                  партнёра. Публикация в каталоге не нужна — после сохранения вернитесь сюда и
                  примите условия.
                </p>
                <div className={styles.nextActions} ref={actionsRef}>
                  <Link href={profileHref} className={primaryLinkClass}>
                    Заполнить профиль
                  </Link>
                  <Button variant="secondary" className={styles.fullButton} disabled>
                    Принять условия
                  </Button>
                  <Button
                    variant="secondary"
                    className={styles.fullButton}
                    onClick={() => {
                      void loadPreview();
                      void refreshSession();
                    }}
                  >
                    Обновить статус
                  </Button>
                  {declineAndSwitch}
                </div>
              </>
            ) : (
              <>
                {!termsAcceptable ? (
                  <p className={styles.nextCopy} role="status">
                    {LINK_INVITE_TERMS_UNAVAILABLE_MESSAGE}
                  </p>
                ) : null}
                <div className={styles.nextActions} ref={actionsRef}>
                  {acceptErrorBlock}
                  {existingPartnershipId ? (
                    <p className={styles.nextCopy}>
                      <Link href={`/partners?terms=${encodeURIComponent(existingPartnershipId)}`}>
                        Открыть существующее партнёрство в кабинете
                      </Link>
                    </p>
                  ) : null}
                  {acceptButton}
                  {declineAndSwitch}
                </div>
                <p className={styles.fine}>{INVITE_ACCEPT_FINE_PRINT}</p>
              </>
            )}
            {preview.expiresAt ? (
              <p className={styles.explanation}>
                Ссылка действует до {formatExpiry(preview.expiresAt)}
              </p>
            ) : null}
          </aside>
        </article>
      </div>
      <InviteDock visible={actionsOffscreen}>{dockAction}</InviteDock>
    </main>
  );
}
