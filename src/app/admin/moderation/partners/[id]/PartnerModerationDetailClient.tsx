"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchModerationPartner,
  moderationPartnerAction,
} from "@/lib/prof-admin-moderation-api";
import { setProfTestPublicCatalogShow } from "@/lib/prof-admin-api";
import {
  validateModerationRejectClient,
  validateModerationReviseClient,
} from "@/lib/prof-admin-moderation-validation";
import {
  moderationCatalogStatusLabel,
  moderationPartnerChangeBlock,
  moderationPartnerPublicVisibility,
  moderationPartnerSubmittedCategoryLabels,
  moderationPartnerSubmittedStageLabels,
  moderationSubmittedString,
  partnerTypeLabel,
  type ModerationPartnerDetail,
} from "@/lib/prof-admin-moderation-partner-display";
import {
  partnerApproveConfirmMessage,
  partnerRejectConfirmMessage,
  partnerReviseConfirmMessage,
  staleRevisionUserMessage,
  type PartnerModerationAction,
} from "@/lib/prof-admin-moderation-partner-actions";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ModerationConfirmDialog } from "../../organizations/[id]/ModerationConfirmDialog";
import { PartnerModerationPreviewModal } from "./PartnerModerationPreviewModal";
import styles from "../../organizations/[id]/OrganizationModerationDetail.module.css";

type PreviewState = { mode: "list" | "full" } | null;

type PartnerDialog = {
  action: PartnerModerationAction;
  text: string;
  revisionAtOpen: string;
  fieldError: string | null;
} | null;

function SafePhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={styles.photoWrap} aria-hidden>
        <span className={styles.photoFallback}>Нет фото</span>
      </div>
    );
  }
  return (
    <div className={styles.photoWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={styles.photoThumb} onError={() => setFailed(true)} />
      <a className={styles.photoZoomLink} href={src} target="_blank" rel="noopener noreferrer">
        Увеличить
      </a>
    </div>
  );
}

export function PartnerModerationDetailClient({ partnerId }: { partnerId: string }) {
  const searchParams = useSearchParams();
  const [partner, setPartner] = useState<ModerationPartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [partnerDialog, setPartnerDialog] = useState<PartnerDialog>(null);
  const [testDialog, setTestDialog] = useState<boolean | null>(null);

  const backQs = searchParams.toString();

  const load = useCallback(
    async (opts?: { keepExistingOnError?: boolean }) => {
      if (!opts?.keepExistingOnError) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetchModerationPartner(partnerId);
        setPartner(res.partner as ModerationPartnerDetail);
        setError(null);
      } catch (e) {
        const msg = e instanceof RemcardApiError ? e.message : "Ошибка загрузки";
        if (opts?.keepExistingOnError) {
          setMessage({
            kind: "err",
            text: `${msg}. Показаны последние данные — нажмите «Обновить данные».`,
          });
        } else {
          setPartner(null);
          setError(msg);
        }
      }
      setLoading(false);
    },
    [partnerId],
  );

  const refreshAfterMutation = useCallback(async () => {
    try {
      const res = await fetchModerationPartner(partnerId);
      setPartner(res.partner as ModerationPartnerDetail);
      return true;
    } catch {
      setMessage({
        kind: "ok",
        text: "Решение сохранено, но карточку не удалось обновить. Нажмите «Обновить данные».",
      });
      return false;
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApiError = (e: unknown) => {
    if (e instanceof RemcardApiError && e.status === 409) {
      setPartnerDialog(null);
      setPreview(null);
      setTestDialog(null);
      setMessage({ kind: "err", text: staleRevisionUserMessage() });
      void load();
      return;
    }
    setMessage({
      kind: "err",
      text: e instanceof RemcardApiError ? e.message : "Ошибка",
    });
  };

  const openDialog = (action: PartnerModerationAction) => {
    if (!partner) return;
    setPartnerDialog({
      action,
      text: "",
      revisionAtOpen: partner.revisionToken,
      fieldError: null,
    });
  };

  const runPartnerAction = async (action: PartnerModerationAction, text: string) => {
    if (busy || !partner || !partnerDialog) return;
    if (partner.revisionToken !== partnerDialog.revisionAtOpen) {
      setPartnerDialog(null);
      setMessage({ kind: "err", text: staleRevisionUserMessage() });
      void load();
      return;
    }
    if (action === "reject") {
      const err = validateModerationRejectClient(text);
      if (err) {
        setPartnerDialog({ ...partnerDialog, fieldError: err });
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(text);
      if (err) {
        setPartnerDialog({ ...partnerDialog, fieldError: err });
        return;
      }
    }

    setBusy(true);
    setMessage(null);
    const body =
      action === "revise"
        ? { comment: text.trim(), revisionToken: partner.revisionToken, attachments: [] }
        : action === "reject"
          ? { reason: text.trim(), revisionToken: partner.revisionToken }
          : { revisionToken: partner.revisionToken };

    try {
      await moderationPartnerAction(partnerId, action, body);
      setPartnerDialog(null);
      setMessage({ kind: "ok", text: "Решение по партнёру сохранено." });
      await refreshAfterMutation();
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  const toggleTestPublic = async (allowed: boolean) => {
    setBusy(true);
    try {
      await setProfTestPublicCatalogShow(partnerId, allowed);
      setTestDialog(null);
      setMessage({
        kind: "ok",
        text: allowed ? "Публикация тестового партнёра разрешена." : "Тестовый партнёр скрыт из каталога.",
      });
      await refreshAfterMutation();
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  if (loading) return <p className={styles.page}>Загрузка…</p>;
  if (error) {
    return (
      <p className={styles.page} role="alert">
        {error}
      </p>
    );
  }
  if (!partner) return <p className={styles.page}>Не найдено</p>;

  const sub = partner.submitted;
  const visibility = moderationPartnerPublicVisibility(partner);
  const changeBlock = moderationPartnerChangeBlock(partner);
  const pending = partner.catalogStatus === "PENDING";
  const title = moderationSubmittedString(sub.displayName) || partner.publicId;

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href={`/admin/moderation${backQs ? `?${backQs}` : ""}`}>
        ← Очередь модерации
      </Link>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.badges}>
            <span
              className={
                partner.catalogStatus === "PENDING" ? styles.badgePending : styles.badge
              }
            >
              {moderationCatalogStatusLabel(partner.catalogStatus)}
            </span>
            <span className={styles.badge}>{partnerTypeLabel(partner.partnerType ?? "")}</span>
            {partner.isTestPartner ? <span className={styles.badgeTest}>TEST</span> : null}
          </div>
        </div>
        <p className={styles.metaLine}>Публичный ID: {partner.publicId}</p>
        <p className={styles.metaLine} data-testid="partner-catalog-visibility">
          <strong>Видимость в каталоге:</strong> {visibility.catalogVisibilityHeadline} —{" "}
          {visibility.catalogVisibilityDetail}
        </p>
        {changeBlock ? <p className={styles.metaLine}>{changeBlock}</p> : null}
      </header>

      <div className={styles.actionsRow}>
        <Button type="button" variant="secondary" onClick={() => setPreview({ mode: "list" })}>
          Карточка в списке
        </Button>
        <Button type="button" variant="secondary" onClick={() => setPreview({ mode: "full" })}>
          Полная карточка
        </Button>
        <Button type="button" variant="text" disabled={busy} onClick={() => void load()}>
          Обновить данные
        </Button>
      </div>

      <div className={styles.sectionGrid}>
        <Panel title="Отправленная заявка">
          {sub.photoUrl ? (
            <SafePhoto src={sub.photoUrl} alt="" />
          ) : (
            <p className={styles.metaLine}>Фото не заполнено</p>
          )}
          <p>Город: {moderationSubmittedString(sub.city) || "—"}</p>
          <p>{moderationSubmittedString(sub.description) || "Описание не заполнено"}</p>
          <p>Категории: {moderationPartnerSubmittedCategoryLabels(partner).join(", ") || "—"}</p>
          <p>
            Этапы: {moderationPartnerSubmittedStageLabels(sub.navigatorStageIds).join(", ") || "—"}
          </p>
          <p>Сайт: {moderationSubmittedString(sub.website) || "—"}</p>
          <p>Telegram: {moderationSubmittedString(sub.telegram) || "—"}</p>
          <p>WhatsApp: {moderationSubmittedString(sub.whatsapp) || "—"}</p>
        </Panel>

        <Panel title="Опубликовано сейчас (live)">
          <p data-testid="partner-live-snapshot">
            Сохранённая live-версия:{" "}
            {visibility.liveSnapshotPublished ? "опубликована (isPublic)" : "не опубликована"}
          </p>
          <p data-testid="partner-catalog-public-line">
            В публичном каталоге: {visibility.catalogPubliclyVisible ? "видна" : "скрыта"}
          </p>
          <p>Название: {partner.live.displayName ?? "—"}</p>
          <p>Город: {partner.live.city ?? "—"}</p>
          <p>{partner.live.description ?? "—"}</p>
        </Panel>

        {partner.isTestPartner ? (
          <Panel title="Публикация тестового партнёра">
            <p className={styles.metaLine}>
              Opt-in:{" "}
              {visibility.testOptIn
                ? "разрешён показ в каталоге"
                : "не разрешён — одобренные test-карточки скрыты"}
            </p>
            <p className={styles.metaLine}>
              Обновление CDN-кэша каталога может занять до ~360 с после изменения.
            </p>
            <div className={styles.actionsRow}>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setTestDialog(true)}>
                Разрешить показ в каталоге
              </Button>
              <Button type="button" variant="text" disabled={busy} onClick={() => setTestDialog(false)}>
                Скрыть из каталога
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>

      {partner.services.length ? (
        <Panel title="Услуги и товары в заявке">
          <ul>
            {partner.services.map((s) => (
              <li key={s.id}>
                {s.title} ({s.itemKind}) · {s.city}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {partner.portfolioItems.length ? (
        <Panel title="Портфолио">
          <ul>
            {partner.portfolioItems.map((p) => (
              <li key={p.id}>{p.title ?? "Без названия"}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <section className={styles.actionsPanel} aria-label="Решение по партнёру">
        <h2 className={styles.dialogTitle}>Решение по партнёру</h2>
        <div className={styles.actionsRow}>
          <Button
            className={styles.actionPrimary}
            type="button"
            disabled={busy || !pending}
            onClick={() => openDialog("approve")}
          >
            Одобрить заявку
          </Button>
          <Button type="button" variant="secondary" disabled={busy || !pending} onClick={() => openDialog("revise")}>
            Вернуть на доработку
          </Button>
          <Button type="button" variant="text" disabled={busy || !pending} onClick={() => openDialog("reject")}>
            Отклонить заявку
          </Button>
        </div>
      </section>

      {message ? (
        <p className={message.kind === "err" ? styles.statusError : styles.statusOk} role="status">
          {message.text}
        </p>
      ) : null}

      <PartnerModerationPreviewModal
        open={preview !== null}
        mode={preview?.mode ?? "full"}
        onClose={() => setPreview(null)}
        partner={partner}
      />

      <ModerationConfirmDialog
        open={partnerDialog?.action === "approve"}
        title="Одобрить заявку"
        description={partnerApproveConfirmMessage(partner)}
        confirmLabel="Подтвердить одобрение"
        busy={busy}
        textValue=""
        onTextChange={() => {}}
        onCancel={() => setPartnerDialog(null)}
        onConfirm={() => void runPartnerAction("approve", "")}
      />

      <ModerationConfirmDialog
        open={partnerDialog?.action === "reject"}
        title="Отклонить заявку"
        description={partnerRejectConfirmMessage(partner)}
        confirmLabel="Отклонить"
        danger
        busy={busy}
        requireText
        textLabel="Причина отказа"
        textValue={partnerDialog?.text ?? ""}
        textError={partnerDialog?.fieldError}
        onTextChange={(t) =>
          setPartnerDialog((d) => (d ? { ...d, text: t, fieldError: null } : d))
        }
        onCancel={() => setPartnerDialog(null)}
        onConfirm={() => void runPartnerAction("reject", partnerDialog?.text ?? "")}
      />

      <ModerationConfirmDialog
        open={partnerDialog?.action === "revise"}
        title="Вернуть на доработку"
        description={partnerReviseConfirmMessage(partner)}
        confirmLabel="Отправить на доработку"
        busy={busy}
        requireText
        textLabel="Что нужно исправить"
        textValue={partnerDialog?.text ?? ""}
        textError={partnerDialog?.fieldError}
        onTextChange={(t) =>
          setPartnerDialog((d) => (d ? { ...d, text: t, fieldError: null } : d))
        }
        onCancel={() => setPartnerDialog(null)}
        onConfirm={() => void runPartnerAction("revise", partnerDialog?.text ?? "")}
      />

      <ModerationConfirmDialog
        open={testDialog !== null}
        title={
          testDialog ? "Разрешить публикацию тестового партнёра" : "Скрыть тестового партнёра из каталога"
        }
        description={
          testDialog
            ? "Разрешить показ карточки тестового партнёра в каталоге?"
            : "Скрыть тестового партнёра из каталога? Аккаунт не блокируется."
        }
        confirmLabel="Подтвердить"
        busy={busy}
        textValue=""
        onTextChange={() => {}}
        onCancel={() => setTestDialog(null)}
        onConfirm={() => void toggleTestPublic(Boolean(testDialog))}
      />
    </div>
  );
}
