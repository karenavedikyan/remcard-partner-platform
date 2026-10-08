"use client";

import { useCallback, useEffect, useState } from "react";
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
  buildInviteHeroContent,
  formatInviteAudienceLabel,
  INVITE_GUEST_DISCLAIMER,
  INVITE_MODERATION_NOTE,
  INVITE_PERCENT_EXPLAINER,
  inviterDisplayName,
} from "@/lib/invite-presentation";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/BrandMark";
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

function catalogBlocksAccept(user: AuthUser | null): boolean {
  return Boolean(user?.role === "PRO" && user.catalogStatus && user.catalogStatus !== "APPROVED");
}

function catalogIsDraft(user: AuthUser | null): boolean {
  return Boolean(user?.role === "PRO" && user.catalogStatus === "DRAFT");
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
  const [submittingModeration, setSubmittingModeration] = useState(false);
  const [moderationSubmitError, setModerationSubmitError] = useState("");
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [existingPartnershipId, setExistingPartnershipId] = useState<string | null>(null);

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

  async function submitProfileForModeration() {
    if (submittingModeration || !catalogIsDraft(authUser)) return;
    setSubmittingModeration(true);
    setModerationSubmitError("");
    try {
      await remcardFetch("/api/pro/profile", {
        method: "PATCH",
        body: { action: "submitForModeration" },
      });
      await refreshSession();
    } catch (caught) {
      setModerationSubmitError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось отправить профиль на проверку",
      );
    } finally {
      setSubmittingModeration(false);
    }
  }

  async function acceptInvite() {
    if (accepting || catalogBlocksAccept(authUser)) return;
    setAccepting(true);
    setAcceptError("");
    setExistingPartnershipId(null);
    setDeclinedLocally(false);
    try {
      const result = await remcardFetch<{ ok: boolean; redirect?: string; code?: string }>(
        "/api/partnership/link-invite/accept",
        { method: "POST", body: { token } },
      );
      if (result.redirect) {
        router.replace(result.redirect);
        router.refresh();
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 401) {
        setAcceptError("Сессия завершилась. Войдите снова.");
        setAuthUser(null);
        setReadiness(null);
      } else if (caught instanceof RemcardApiError) {
        setAcceptError(caught.message);
        const body = caught.body as { code?: string; partnershipId?: string } | undefined;
        if (
          body?.partnershipId &&
          (body.code === "PARTNERSHIP_ALREADY_ACTIVE" || body.code === "PARTNERSHIP_EXISTS")
        ) {
          setExistingPartnershipId(body.partnershipId);
        }
        if (caught.body?.code === "CATALOG_PENDING") {
          void refreshSession();
        }
      } else {
        setAcceptError("Не удалось принять");
      }
    } finally {
      setAccepting(false);
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
  const profileBlocksAccept = catalogBlocksAccept(authUser);
  const profileDraft = catalogIsDraft(authUser);
  const needsContinuation = Boolean(hasSession && readiness && !isAuthFlowComplete(readiness));
  const canAccept =
    hasSession && readiness && isAuthFlowComplete(readiness) && !profileBlocksAccept;

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
              К нему можно вернуться, пока приглашение действует. Регистрация и вход сами по себе
              не означают согласия с условиями.
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

  const inviterName = inviterDisplayName(preview);
  const hero = buildInviteHeroContent(preview);
  const audienceLabel = formatInviteAudienceLabel(
    preview.intendedPartnerType,
    preview.inviter?.partnerType ?? null,
  );
  const activeTerms = (preview.terms ?? []).filter((t) => !t.isExcluded);
  const excludedTerms = (preview.terms ?? []).filter((t) => t.isExcluded);

  const termsBlock = (
    <div className={styles.termsSection}>
      <h2 className={styles.termsSectionTitle}>Условия предложения</h2>
      <div className={styles.termsScroll}>
        <table className={styles.termsTable}>
          <thead>
            <tr>
              <th>Категория</th>
              <th>Общий %</th>
            </tr>
          </thead>
          <tbody>
            {activeTerms.map((term) => (
              <tr key={term.category}>
                <td>{displayCategoryLabel(term.category, term.categoryLabel)}</td>
                <td>{term.storePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.meta}>{INVITE_PERCENT_EXPLAINER}</p>
      {excludedTerms.length > 0 ? (
        <p className={styles.meta}>
          Исключено из предложения:{" "}
          {excludedTerms
            .map((term) => displayCategoryLabel(term.category, term.categoryLabel))
            .join(", ")}
        </p>
      ) : null}
      {preview.note ? (
        <p className={styles.noteBlock}>
          Комментарий отправителя: {preview.note}
        </p>
      ) : null}
      {preview.expiresAt ? (
        <p className={styles.meta}>Ссылка действует до {formatExpiry(preview.expiresAt)}</p>
      ) : null}
    </div>
  );

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <BrandMark />
        <section className={styles.card} aria-busy={accepting}>
          <span className={styles.eyebrow}>RemCard PROF</span>
          <h1 className={styles.title}>{hero.headline}</h1>
          <p className={styles.inviterLine}>
            Приглашает: {inviterName}
            {preview.inviter?.city ? ` · ${preview.inviter.city}` : ""}
          </p>
          {audienceLabel ? (
            <span className={styles.audienceBadge}>{audienceLabel}</span>
          ) : null}
          <p className={styles.lead}>{hero.lead}</p>
          <ul className={styles.benefitList}>
            {hero.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {!hasSession ? (
            <div className={styles.ctaGuest}>
              {acceptError ? (
                <p className={styles.error} role="alert">
                  {acceptError}{" "}
                  {/войдите|сессия/i.test(acceptError) ? (
                    <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
                  ) : null}
                </p>
              ) : null}
              <Link href={loginHref}>
                <Button>Зарегистрироваться и продолжить</Button>
              </Link>
              <p className={styles.loginSecondary}>
                Уже есть аккаунт?{" "}
                <Link href={loginHref}>Войти</Link>
              </p>
              <p className={styles.ctaGuestNote}>{INVITE_GUEST_DISCLAIMER}</p>
              <p className={styles.ctaGuestNote}>{INVITE_MODERATION_NOTE}</p>
            </div>
          ) : null}

          {termsBlock}

          <div className={styles.notice}>
            <p><strong>Как начать</strong></p>
            <ol className={styles.steps}>
              <li>Зарегистрируйтесь или войдите и заполните профиль</li>
              <li>Дождитесь проверки профиля, если она потребуется</li>
              <li>Примите или отклоните условия на этой странице</li>
              <li>Работайте с рекомендациями и покупками в кабинете</li>
            </ol>
          </div>

          {hasSession && needsContinuation && readiness ? (
            <>
              <div className={styles.notice}>
                <p><strong>Завершите обязательные шаги</strong></p>
                <p>{continuationLead(readiness)}</p>
              </div>
              <div className={styles.actions}>
                <Button onClick={() => handleContinueRegistration()}>
                  {continuationLabel(readiness)}
                </Button>
                <Button variant="secondary" onClick={() => void handleDecline()}>
                  Не принимать
                </Button>
                <Button
                  variant="secondary"
                  disabled={switchingAccount}
                  onClick={() => void handleSwitchAccount()}
                >
                  {switchingAccount ? "Выходим…" : "Сменить аккаунт"}
                </Button>
              </div>
            </>
          ) : hasSession && profileBlocksAccept ? (
            <>
              <div className={styles.notice}>
                {profileDraft ? (
                  <>
                    <p><strong>Отправьте профиль на проверку</strong></p>
                    <p>
                      Регистрация завершена. Отправьте профиль на модерацию — после одобрения вы
                      сможете принять приглашение. Ссылка сохранится: вернитесь сюда позже или
                      обновите страницу.
                    </p>
                  </>
                ) : (
                  <>
                    <p><strong>Профиль ожидает проверки</strong></p>
                    <p>
                      Профиль на проверке у модератора. После одобрения вы сможете принять
                      приглашение. Ссылка сохранится: вернитесь сюда позже или обновите страницу.
                    </p>
                  </>
                )}
              </div>
              {moderationSubmitError ? (
                <p className={styles.error} role="alert">
                  {moderationSubmitError}
                </p>
              ) : null}
              <div className={styles.actions}>
                {profileDraft ? (
                  <Button
                    disabled={submittingModeration}
                    onClick={() => void submitProfileForModeration()}
                  >
                    {submittingModeration ? "Отправляем…" : "Отправить на проверку"}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    Принять условия
                  </Button>
                )}
                <Button variant="secondary" onClick={() => void handleDecline()}>
                  Не принимать
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void loadPreview();
                    void refreshSession();
                  }}
                >
                  Обновить статус
                </Button>
                <Button
                  variant="secondary"
                  disabled={switchingAccount}
                  onClick={() => void handleSwitchAccount()}
                >
                  {switchingAccount ? "Выходим…" : "Сменить аккаунт"}
                </Button>
              </div>
            </>
          ) : hasSession ? (
            <>
              <p className={styles.lead}>
                Проверьте условия. «Принять условия» создаст активное партнёрство. «Не принимать»
                закроет предложение без ответа — ссылка останется доступной, пока действует
                приглашение.
              </p>
              {acceptError ? (
                <p className={styles.error} role="alert">
                  {acceptError}{" "}
                  {/войдите|сессия/i.test(acceptError) ? (
                    <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
                  ) : null}
                </p>
              ) : null}
              {existingPartnershipId ? (
                <p className={styles.lead}>
                  <Link href={`/partners?terms=${encodeURIComponent(existingPartnershipId)}`}>
                    Открыть существующее партнёрство в кабинете
                  </Link>
                </p>
              ) : null}
              <div className={styles.actions}>
                <Button disabled={accepting || !canAccept} onClick={() => void acceptInvite()}>
                  {accepting ? "Принимаем…" : "Принять условия"}
                </Button>
                <Button variant="secondary" disabled={accepting} onClick={() => void handleDecline()}>
                  Не принимать
                </Button>
                <Button
                  variant="secondary"
                  disabled={switchingAccount || accepting}
                  onClick={() => void handleSwitchAccount()}
                >
                  {switchingAccount ? "Выходим…" : "Сменить аккаунт"}
                </Button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
