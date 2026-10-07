"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";
import { buildSessionRecoveryLoginHref } from "@/lib/auth-flow";
import { categoryLabel } from "@/lib/partnership-labels";
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

export function InviteLanding({ token }: InviteLandingProps) {
  const router = useRouter();
  const returnTo = `/invite/${encodeURIComponent(token)}`;
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");

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

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getAuthMe();
        setHasSession(Boolean(me.user));
      } catch {
        setHasSession(false);
      }
    })();
  }, []);

  async function acceptInvite() {
    if (accepting) return;
    setAccepting(true);
    setAcceptError("");
    try {
      const result = await remcardFetch<{ ok: boolean; redirect?: string }>(
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
        setHasSession(false);
      } else {
        setAcceptError(caught instanceof RemcardApiError ? caught.message : "Не удалось принять");
      }
    } finally {
      setAccepting(false);
    }
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  if (loadState === "loading") {
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

  const inviterName = preview.inviter?.displayName?.trim() || "Партнёр RemCard";
  const activeTerms = (preview.terms ?? []).filter((t) => !t.isExcluded);

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <BrandMark />
        <section className={styles.card}>
          <span className={styles.eyebrow}>RemCard PROF</span>
          <h1 className={styles.title}>{inviterName} приглашает вас к сотрудничеству</h1>
          <p className={styles.lead}>
            {preview.inviter?.city ? `Город: ${preview.inviter.city}. ` : ""}
            Предложение партнёрства в программе RemCard PROF — условия зафиксированы отправителем.
          </p>

          {preview.intendedPartnerType ? (
            <p className={styles.meta}>Ожидаемый тип партнёра: {preview.intendedPartnerType}</p>
          ) : null}

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
                  <td>{term.categoryLabel || categoryLabel(term.category)}</td>
                  <td>{term.storePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {preview.note ? <p className={styles.lead}>Комментарий: {preview.note}</p> : null}

          {preview.expiresAt ? (
            <p className={styles.meta}>Ссылка действует до {formatExpiry(preview.expiresAt)}</p>
          ) : null}

          <div className={styles.notice}>
            <p><strong>Как работает программа</strong></p>
            <ol className={styles.steps}>
              <li>Согласовать условия с партнёром</li>
              <li>Оформить рекомендацию клиенту</li>
              <li>Подтвердить покупку</li>
              <li>Увидеть начисление во взаиморасчётах</li>
            </ol>
          </div>

          {!hasSession ? (
            <>
              <p className={styles.lead}>
                После входа вы сможете принять или отклонить предложение. Регистрация не означает
                согласия с условиями.
              </p>
              <div className={styles.actions}>
                <Link href={loginHref}>
                  <Button>Войти или зарегистрироваться</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.lead}>
                Проверьте условия и нажмите «Принять условия», если согласны. Это создаст активное
                партнёрство — регистрация сама по себе не означает согласия.
              </p>
              {acceptError ? (
                <p className={styles.error} role="alert">
                  {acceptError}{" "}
                  {acceptError.includes("Войдите") ? (
                    <Link href={buildSessionRecoveryLoginHref(returnTo)}>Войти снова</Link>
                  ) : null}
                </p>
              ) : null}
              <div className={styles.actions}>
                <Button disabled={accepting} onClick={() => void acceptInvite()}>
                  {accepting ? "Принимаем…" : "Принять условия"}
                </Button>
                <Link href={loginHref}>
                  <Button variant="secondary">Сменить аккаунт</Button>
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
