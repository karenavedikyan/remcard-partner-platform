"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchModerationOrganization,
  moderationBranchAction,
  moderationOrganizationAction,
} from "@/lib/prof-admin-moderation-api";
import { setProfTestPublicCatalogShow } from "@/lib/prof-admin-api";
import {
  validateModerationRejectClient,
  validateModerationReviseClient,
} from "@/lib/prof-admin-moderation-validation";
import {
  buildModerationBranchPreviewModel,
  moderationCatalogStatusLabel,
  moderationOrgChangeBlock,
  moderationFormatPublicPhone,
  moderationOrgCity,
  moderationOrgPublicVisibility,
  moderationPublicContactTypeLabel,
  moderationSubmittedCategoryLabels,
  moderationSubmittedServiceLabels,
  moderationSubmittedStageLabels,
  moderationSubmittedString,
  partnerTypeLabel,
  type ModerationOrgDetail,
} from "@/lib/prof-admin-moderation-org-display";
import {
  orgApproveAllConfirmMessage,
  orgApproveConfirmMessage,
  orgApproveButtonLabel,
  orgRejectConfirmMessage,
  orgReviseConfirmMessage,
  staleRevisionUserMessage,
  type OrgModerationAction,
} from "@/lib/prof-admin-moderation-org-actions";
import {
  moderationOrgCanPublishLabel,
  moderationOrgServerReadiness,
} from "@/lib/prof-admin-moderation-org-readiness";
import { Button } from "@/components/ui/Button";
import { BranchCatalogPublicationPreview } from "@/components/profile/BranchCatalogPublicationPreview";
import { ModerationPreviewModal } from "./ModerationPreviewModal";
import { ModerationConfirmDialog } from "./ModerationConfirmDialog";
import styles from "./OrganizationModerationDetail.r1.module.css";

const MODERATION_FOCUS_HASH_KEY = "profModerationFocusHash";

type PreviewState = { mode: "list" | "full" } | null;

type OrgDialog = {
  action: OrgModerationAction;
  text: string;
  revisionAtOpen: string;
  fieldError: string | null;
} | null;

type BranchDialog = {
  branchId: string;
  action: "approve" | "reject" | "revise";
  text: string;
  revisionAtOpen: string;
  fieldError: string | null;
} | null;

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function SafePhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={className} aria-hidden>
        <span className={styles.photoFallback}>Нет фото</span>
      </div>
    );
  }
  return (
    <div className={styles.photoWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
      <a className={styles.photoZoomLink} href={src} target="_blank" rel="noopener noreferrer">
        Увеличить
      </a>
    </div>
  );
}

export function OrganizationModerationDetailClient({ organizationId }: { organizationId: string }) {
  const searchParams = useSearchParams();
  const focusBranch = searchParams.get("branch");
  const [org, setOrg] = useState<ModerationOrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [orgDialog, setOrgDialog] = useState<OrgDialog>(null);
  const [branchDialog, setBranchDialog] = useState<BranchDialog>(null);
  const [testDialog, setTestDialog] = useState<boolean | null>(null);

  const backQs = searchParams.toString();
  const backHref = `/admin/moderation${backQs ? `?${backQs}` : ""}`;

  const load = useCallback(
    async (opts?: { keepExistingOnError?: boolean }) => {
      if (!opts?.keepExistingOnError) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetchModerationOrganization(organizationId);
        setOrg(res.organization as ModerationOrgDetail);
        setError(null);
      } catch (e) {
        const msg = e instanceof RemcardApiError ? e.message : "Ошибка загрузки";
        if (opts?.keepExistingOnError) {
          setMessage({
            kind: "err",
            text: `${msg}. Показаны последние загруженные данные — нажмите «Обновить данные».`,
          });
        } else {
          setOrg(null);
          setError(msg);
        }
      }
      setLoading(false);
    },
    [organizationId],
  );

  const refreshAfterMutation = useCallback(async () => {
    try {
      const res = await fetchModerationOrganization(organizationId);
      setOrg(res.organization as ModerationOrgDetail);
      return true;
    } catch {
      setMessage({
        kind: "ok",
        text: "Решение сохранено, но карточку не удалось обновить. Нажмите «Обновить данные».",
      });
      return false;
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) {
      sessionStorage.setItem(MODERATION_FOCUS_HASH_KEY, window.location.hash);
    } else {
      const saved = sessionStorage.getItem(MODERATION_FOCUS_HASH_KEY);
      if (saved) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${saved}`);
        sessionStorage.removeItem(MODERATION_FOCUS_HASH_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !org) return;
    const hash = window.location.hash.replace(/^#/, "");
    let branchFromHash: string | null = null;
    if (hash.startsWith("branch-")) {
      const rest = hash.slice("branch-".length);
      branchFromHash = rest.replace(/-reject$/, "").replace(/-revise$/, "");
    }
    const id = focusBranch ?? branchFromHash;
    if (id) {
      const el = document.getElementById(`branch-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusBranch, org]);

  const visibility = org ? moderationOrgPublicVisibility(org) : null;
  const changeBlock = org ? moderationOrgChangeBlock(org) : null;
  const readiness = org ? moderationOrgServerReadiness(org) : [];
  const city = org ? moderationOrgCity(org) : null;

  const handleApiError = (e: unknown) => {
    if (e instanceof RemcardApiError && e.status === 409) {
      setOrgDialog(null);
      setBranchDialog(null);
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

  const runOrgAction = async (action: OrgModerationAction, text: string) => {
    if (busy || !org || !orgDialog) return;
    if (org.revisionToken !== orgDialog.revisionAtOpen) {
      setOrgDialog(null);
      setMessage({ kind: "err", text: staleRevisionUserMessage() });
      void load();
      return;
    }
    if (action === "reject") {
      const err = validateModerationRejectClient(text);
      if (err) {
        setOrgDialog({ ...orgDialog, fieldError: err });
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(text);
      if (err) {
        setOrgDialog({ ...orgDialog, fieldError: err });
        return;
      }
    }

    setBusy(true);
    setMessage(null);
    const pendingBranchRevisions = org.branches
      .filter((b) => b.catalogStatus === "PENDING")
      .reduce<Record<string, string>>((acc, b) => {
        if (b.revisionToken) acc[b.id] = b.revisionToken;
        return acc;
      }, {});

    const body =
      action === "revise"
        ? { comment: text.trim(), revisionToken: org.revisionToken, attachments: [] }
        : action === "reject"
          ? { reason: text.trim(), revisionToken: org.revisionToken }
          : action === "approve"
            ? { revisionToken: org.revisionToken }
            : action === "approve-all"
              ? { revisionToken: org.revisionToken, branchRevisions: pendingBranchRevisions }
              : {};

    try {
      await moderationOrganizationAction(organizationId, action, body);
      setMessage({ kind: "ok", text: "Решение по организации сохранено." });
      setOrgDialog(null);
      await refreshAfterMutation();
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  const runBranchAction = async (
    branchId: string,
    action: "approve" | "reject" | "revise",
    text: string,
  ) => {
    if (busy || !org) return;
    if (!branchDialog) return;
    const branch = org.branches.find((b) => b.id === branchId);
    if (branch?.revisionToken !== branchDialog.revisionAtOpen) {
      setBranchDialog(null);
      setMessage({ kind: "err", text: staleRevisionUserMessage() });
      void load();
      return;
    }
    if (action === "reject") {
      const err = validateModerationRejectClient(text);
      if (err) {
        setBranchDialog({ ...branchDialog, fieldError: err });
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(text);
      if (err) {
        setBranchDialog({ ...branchDialog, fieldError: err });
        return;
      }
    }

    setBusy(true);
    const body =
      action === "revise"
        ? { comment: text.trim(), revisionToken: branch?.revisionToken, attachments: [] }
        : action === "reject"
          ? { reason: text.trim(), revisionToken: branch?.revisionToken }
          : { revisionToken: branch?.revisionToken };

    try {
      await moderationBranchAction(branchId, action, body);
      setMessage({ kind: "ok", text: "Решение по филиалу сохранено." });
      setBranchDialog(null);
      await refreshAfterMutation();
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  const toggleTestPublic = async (allowed: boolean) => {
    if (!org?.ownerId) return;
    setBusy(true);
    try {
      await setProfTestPublicCatalogShow(org.ownerId, allowed);
      setTestDialog(null);
      await load();
      setMessage({
        kind: "ok",
        text: allowed
          ? "Разрешена публикация тестового партнёра (может затронуть другие карточки владельца)."
          : "Тестовый партнёр скрыт из каталога.",
      });
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  if (loading && !org) {
    return (
      <div className={styles.page} role="status" aria-live="polite" data-org-moderation-detail="true">
        <div className={styles.stateBlock}>
          <strong>Загрузка карточки</strong>
          <p>Получаем отправленную заявку, готовность и филиалы…</p>
        </div>
      </div>
    );
  }

  if (error && !org) {
    const forbidden = /403|forbidden|доступ|прав/i.test(error);
    const notFound = /404|not found|не найден/i.test(error);
    return (
      <div className={styles.page} data-org-moderation-detail="true">
        <Link className={styles.backLink} href={backHref}>
          ← Очередь модерации
        </Link>
        <div className={styles.stateBlock} role="alert">
          <strong>
            {forbidden ? "Недостаточно прав" : notFound ? "Карточка не найдена" : "Не удалось загрузить"}
          </strong>
          <p>{error}</p>
          <div className={styles.toolbar} style={{ justifyContent: "center", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Повторить загрузку
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className={styles.page} data-org-moderation-detail="true">
        <Link className={styles.backLink} href={backHref}>
          ← Очередь модерации
        </Link>
        <div className={styles.stateBlock}>
          <strong>Не найдено</strong>
          <p>Организация с таким идентификатором недоступна в очереди модерации.</p>
        </div>
      </div>
    );
  }

  const orgPending = org.catalogStatus === "PENDING";
  const pendingBranches = org.branches.filter((b) => b.catalogStatus === "PENDING");
  const typeLabel = partnerTypeLabel(org.partnerType);
  const metaBits = [typeLabel, city || null, org.ownerPublicId].filter(Boolean);

  const openOrgDialog = (action: OrgModerationAction) => {
    setOrgDialog({
      action,
      text: "",
      revisionAtOpen: org.revisionToken,
      fieldError: null,
    });
  };

  const openBranchDialog = (
    branchId: string,
    action: "approve" | "reject" | "revise",
  ) => {
    const branch = org.branches.find((b) => b.id === branchId);
    setBranchDialog({
      branchId,
      action,
      text: "",
      revisionAtOpen: branch?.revisionToken ?? "",
      fieldError: null,
    });
  };

  const decisionButtons = (
    <div className={styles.actionsRow}>
      <Button
        className={styles.actionPrimary}
        type="button"
        disabled={busy || !orgPending}
        onClick={() => openOrgDialog("approve")}
      >
        {orgApproveButtonLabel(org)}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || !orgPending}
        onClick={() => openOrgDialog("revise")}
      >
        Вернуть на доработку
      </Button>
      <Button
        type="button"
        variant="text"
        disabled={busy || !orgPending}
        onClick={() => openOrgDialog("reject")}
      >
        Отклонить заявку
      </Button>
      {pendingBranches.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !orgPending}
          onClick={() => openOrgDialog("approve-all")}
        >
          Одобрить организацию и {pendingBranches.length} филиал(ов)
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className={styles.page} data-org-moderation-detail="true">
      <Link className={styles.backLink} href={backHref}>
        ← Очередь модерации
      </Link>

      <header className={styles.header}>
        <div className={styles.detailTop}>
          <div className={styles.avatar} aria-hidden>
            {org.submitted.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.submitted.logoUrl} alt="" />
            ) : (
              initialsFromName(org.name)
            )}
          </div>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{org.name}</h1>
            <p className={styles.metaLine}>{metaBits.join(" · ")}</p>
            <div className={styles.badges}>
              <span className={orgPending ? styles.badgePending : styles.badge}>
                {moderationCatalogStatusLabel(org.catalogStatus)}
              </span>
              <span className={styles.badge}>{typeLabel}</span>
              {org.isTestPartner ? <span className={styles.badgeTest}>Тестовый партнёр</span> : null}
            </div>
          </div>
        </div>
        {org.updatedAt ? (
          <p className={styles.metaLine}>
            Обновлено в системе: {new Date(org.updatedAt).toLocaleString("ru-RU")} (не дата отправки
            заявки)
          </p>
        ) : null}
      </header>

      {visibility ? (
        <section className={styles.visibilityCard} aria-label="Видимость в каталоге">
          <div className={styles.visibilityRow}>
            <div>
              <h2>Публичный каталог</h2>
              <p>
                <strong>{visibility.headline}</strong> — {visibility.detail}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {changeBlock ? (
        <section className={styles.section} aria-label={changeBlock.title}>
          <h2>{changeBlock.title}</h2>
          <ul className={styles.diffList}>
            {changeBlock.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.toolbar}>
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

      {orgPending ? (
        <section className={styles.reviewSection} aria-label="Ожидает проверки">
          <h2>Ожидает проверки</h2>
          <p className={styles.reviewLead}>
            Проверяется отправленная заявка организации и филиалы. Одобрение не меняет видимость в
            каталоге само по себе. Закрытие окна подтверждения без подтверждения ничего не отправляет.
          </p>
          <p className={styles.metaLine}>{moderationOrgCanPublishLabel(org)}</p>
          <p className={styles.metaLine}>
            Действия по организации — в блоке «Решение по организации» ниже. По филиалам — в карточке
            каждого филиала.
          </p>
        </section>
      ) : null}

      <div className={styles.sectionGrid}>
        <section className={styles.section} aria-label="Готовность к публикации">
          <h2>Готовность к публикации</h2>
          <p className={styles.metaLine}>{moderationOrgCanPublishLabel(org)}</p>
          <ul className={styles.readinessList}>
            {readiness.map((item) => (
              <li
                key={item.text}
                className={
                  item.level === "required"
                    ? styles.readinessRequired
                    : item.level === "ok"
                      ? styles.readinessOk
                      : undefined
                }
              >
                {item.text}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-label="Фото и описание">
          <h2>Фото и описание</h2>
          {org.submitted.logoUrl ? (
            <SafePhoto src={org.submitted.logoUrl} alt="" className={styles.photoThumb} />
          ) : (
            <p className={styles.metaLine}>Логотип не приложен</p>
          )}
          <p className={styles.prose}>
            {moderationSubmittedString(org.submitted.description) || "Описание не указано"}
          </p>
        </section>

        <section className={styles.section} aria-label="Контакты">
          <h2>Контакты (публичные в заявке)</h2>
          <dl className={styles.dataGrid}>
            <dt>Сайт</dt>
            <dd>{moderationSubmittedString(org.submitted.website) || "—"}</dd>
            <dt>Telegram</dt>
            <dd>{moderationSubmittedString(org.submitted.telegram) || "—"}</dd>
            <dt>Email</dt>
            <dd>{moderationSubmittedString(org.submitted.publicEmail) || "—"}</dd>
            <dt>Телефон</dt>
            <dd>{moderationFormatPublicPhone(org.submitted.publicPhone)}</dd>
          </dl>
        </section>

        <section className={styles.section} aria-label="Товары и услуги">
          <h2>Товары и услуги</h2>
          <dl className={styles.dataGrid}>
            <dt>Товары</dt>
            <dd>{moderationSubmittedCategoryLabels(org.submitted.storeCategories).join(", ") || "—"}</dd>
            <dt>Услуги</dt>
            <dd>{moderationSubmittedServiceLabels(org.submitted.specializations).join(", ") || "—"}</dd>
            <dt>Этапы</dt>
            <dd>{moderationSubmittedStageLabels(org.submitted.navigatorStageIds).join(", ") || "—"}</dd>
          </dl>
        </section>

        {org.live.catalogPublished ? (
          <section className={styles.section} aria-label="Опубликовано сейчас">
            <h2>Опубликовано сейчас (live)</h2>
            <p className={styles.metaLine}>Для сравнения с отправленной заявкой</p>
            <p className={styles.prose}>
              {moderationSubmittedString(org.live.description) || "Описание не заполнено"}
            </p>
          </section>
        ) : null}

        {org.publicContacts?.length ? (
          <section className={styles.section} aria-label="Справочник контактов">
            <h2>Служебно: опубликованный справочник контактов</h2>
            <ul className={styles.diffList}>
              {org.publicContacts.map((c, i) => (
                <li key={`${c.type}-${i}`}>
                  {moderationPublicContactTypeLabel(c.type)}: {c.value}{" "}
                  {c.isPublic ? "" : "(скрыт)"}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.section} aria-label="Адреса и филиалы">
          <h2>Адреса и филиалы</h2>
          {org.branches.length === 0 ? (
            <p className={styles.metaLine}>Филиалы не указаны</p>
          ) : (
            org.branches.map((b) => (
              <article
                key={b.id}
                id={`branch-${b.id}`}
                className={`${styles.branchCard} ${focusBranch === b.id ? styles.branchFocus : ""}`}
              >
                <p className={styles.branchTitle}>
                  {b.submitted.name ?? "Филиал"} · {moderationCatalogStatusLabel(b.catalogStatus)}
                </p>
                {b.catalogStatus === "DRAFT" ? (
                  <p className={styles.branchDraftNote}>Черновик — на проверку не отправлен.</p>
                ) : null}
                <p className={styles.metaLine}>
                  {b.submitted.city}, {b.submitted.address}
                </p>
                {b.submitted.workingHours ? <p className={styles.prose}>Часы: {b.submitted.workingHours}</p> : null}
                {b.submitted.description ? <p className={styles.prose}>{b.submitted.description}</p> : null}
                {b.submitted.photoUrl ? (
                  <SafePhoto src={b.submitted.photoUrl} alt="" className={styles.photoThumb} />
                ) : null}
                {b.catalogStatus === "PENDING" ? (
                  <div className={styles.actionsRow} style={{ marginTop: "0.75rem" }}>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => openBranchDialog(b.id, "approve")}
                    >
                      Одобрить филиал
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      disabled={busy}
                      onClick={() => openBranchDialog(b.id, "revise")}
                    >
                      На доработку
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      disabled={busy}
                      onClick={() => openBranchDialog(b.id, "reject")}
                    >
                      Отклонить
                    </Button>
                  </div>
                ) : null}
                {b.catalogStatus === "PENDING" ? (
                  <BranchCatalogPublicationPreview model={buildModerationBranchPreviewModel(b, org)} />
                ) : null}
              </article>
            ))
          )}
        </section>

        <section className={styles.section} aria-label="История проверки">
          <h2>История проверки</h2>
          <p className={styles.metaLine}>
            История решений по организации в API не передаётся. Показываются только сохранённые данные
            текущей заявки.
          </p>
        </section>

        {org.isTestPartner ? (
          <section className={styles.section} aria-label="Публикация тестового партнёра">
            <h2>Публикация тестового партнёра</h2>
            <p className={styles.prose}>
              Разрешение публикации:{" "}
              {org.profTestPublicCatalogAllowed
                ? "включено"
                : "выключено — одобренные тестовые карточки скрыты"}
            </p>
            <p className={styles.metaLine}>
              Действие может затронуть другие карточки этого владельца. Скрытие не удаляет аккаунт.
              Обновление CDN-кэша каталога может занять до ~360 с.
            </p>
            <div className={styles.actionsRow}>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setTestDialog(true)}>
                Разрешить показ в каталоге
              </Button>
              <Button type="button" variant="text" disabled={busy} onClick={() => setTestDialog(false)}>
                Скрыть из каталога
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <section className={styles.actionsPanel} aria-label="Решение по организации">
        <h2>Решение по организации</h2>
        <p className={styles.metaLine}>{moderationOrgCanPublishLabel(org)}</p>
        {decisionButtons}
      </section>

      {message ? (
        <p className={message.kind === "err" ? styles.statusError : styles.statusOk} role="status">
          {message.text}
        </p>
      ) : null}

      <dl className={styles.techBlock}>
        <dt>Служебная информация</dt>
        <dd>ID организации: {org.id}</dd>
        <dd>Публичный ID владельца: {org.ownerPublicId}</dd>
        <dd>Токен ревизии: {org.revisionToken}</dd>
      </dl>

      <ModerationPreviewModal
        open={preview !== null}
        mode={preview?.mode ?? "full"}
        onClose={() => setPreview(null)}
        org={org}
      />

      <ModerationConfirmDialog
        open={orgDialog?.action === "approve"}
        title="Одобрить заявку"
        description={orgApproveConfirmMessage(org)}
        confirmLabel="Подтвердить одобрение"
        busy={busy}
        textValue=""
        onTextChange={() => {}}
        onCancel={() => setOrgDialog(null)}
        onConfirm={() => void runOrgAction("approve", "")}
      />

      <ModerationConfirmDialog
        open={orgDialog?.action === "approve-all"}
        title="Одобрить организацию и филиалы"
        description={orgApproveAllConfirmMessage(org)}
        confirmLabel="Подтвердить"
        busy={busy}
        textValue=""
        onTextChange={() => {}}
        onCancel={() => setOrgDialog(null)}
        onConfirm={() => void runOrgAction("approve-all", "")}
      />

      <ModerationConfirmDialog
        open={orgDialog?.action === "reject"}
        title="Отклонить заявку"
        description={orgRejectConfirmMessage(org)}
        confirmLabel="Отклонить"
        danger
        busy={busy}
        requireText
        textLabel="Причина отказа"
        textValue={orgDialog?.text ?? ""}
        textError={orgDialog?.fieldError}
        onTextChange={(t) =>
          setOrgDialog((d) => (d ? { ...d, text: t, fieldError: null } : d))
        }
        onCancel={() => setOrgDialog(null)}
        onConfirm={() => void runOrgAction("reject", orgDialog?.text ?? "")}
      />

      <ModerationConfirmDialog
        open={orgDialog?.action === "revise"}
        title="Вернуть на доработку"
        description={orgReviseConfirmMessage(org)}
        confirmLabel="Отправить на доработку"
        busy={busy}
        requireText
        textLabel="Что нужно исправить"
        textValue={orgDialog?.text ?? ""}
        textError={orgDialog?.fieldError}
        onTextChange={(t) =>
          setOrgDialog((d) => (d ? { ...d, text: t, fieldError: null } : d))
        }
        onCancel={() => setOrgDialog(null)}
        onConfirm={() => void runOrgAction("revise", orgDialog?.text ?? "")}
      />

      {branchDialog ? (
        <ModerationConfirmDialog
          open
          title={
            branchDialog.action === "approve"
              ? "Одобрить филиал"
              : branchDialog.action === "reject"
                ? "Отклонить филиал"
                : "Вернуть филиал на доработку"
          }
          description={`Филиал «${
            org.branches.find((b) => b.id === branchDialog.branchId)?.submitted.name ?? branchDialog.branchId
          }»`}
          confirmLabel={
            branchDialog.action === "approve"
              ? "Одобрить"
              : branchDialog.action === "reject"
                ? "Отклонить"
                : "На доработку"
          }
          danger={branchDialog.action === "reject"}
          busy={busy}
          requireText={branchDialog.action !== "approve"}
          textLabel={
            branchDialog.action === "reject" ? "Причина отказа" : "Что нужно исправить"
          }
          textValue={branchDialog.text}
          textError={branchDialog.fieldError}
          onTextChange={(t) =>
            setBranchDialog((d) => (d ? { ...d, text: t, fieldError: null } : d))
          }
          onCancel={() => setBranchDialog(null)}
          onConfirm={() =>
            void runBranchAction(branchDialog.branchId, branchDialog.action, branchDialog.text)
          }
        />
      ) : null}

      <ModerationConfirmDialog
        open={testDialog !== null}
        title={
          testDialog ? "Разрешить публикацию тестового партнёра" : "Скрыть тестового партнёра из каталога"
        }
        description={
          testDialog
            ? "Разрешить показ карточек тестового партнёра в каталоге? Может затронуть все карточки владельца."
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
