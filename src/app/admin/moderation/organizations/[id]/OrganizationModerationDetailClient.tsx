"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  buildModerationOrgCatalogPreviewInput,
  moderationCatalogStatusLabel,
  moderationOrgChangeBlock,
  moderationFormatPublicPhone,
  moderationOrgCanPublishLabel,
  moderationOrgPublicVisibility,
  moderationOrgReadiness,
  moderationPublicContactTypeLabel,
  moderationSubmittedCategoryLabels,
  moderationSubmittedServiceLabels,
  moderationSubmittedStageLabels,
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
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { BranchCatalogPublicationPreview } from "@/components/profile/BranchCatalogPublicationPreview";
import { ModerationPreviewModal } from "./ModerationPreviewModal";
import { ModerationConfirmDialog } from "./ModerationConfirmDialog";
import styles from "./OrganizationModerationDetail.module.css";

const MODERATION_FOCUS_HASH_KEY = "profModerationFocusHash";

type PreviewState = { mode: "list" | "full" } | null;

type OrgDialog = { action: OrgModerationAction; text: string } | null;

type BranchDialog = {
  branchId: string;
  action: "approve" | "reject" | "revise";
  text: string;
} | null;

function SafePhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div className={className} aria-hidden style={{ background: "#eee" }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModerationOrganization(organizationId);
      setOrg(res.organization as ModerationOrgDetail);
    } catch (e) {
      setOrg(null);
      setError(e instanceof RemcardApiError ? e.message : "Ошибка загрузки");
    }
    setLoading(false);
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

  const previewInput = useMemo(
    () => (org ? buildModerationOrgCatalogPreviewInput(org) : null),
    [org],
  );

  const visibility = org ? moderationOrgPublicVisibility(org) : null;
  const changeBlock = org ? moderationOrgChangeBlock(org) : null;
  const readiness = org ? moderationOrgReadiness(org) : [];
  const city = org ? org.branches.find((b) => b.submitted.city)?.submitted.city : null;

  const handleApiError = (e: unknown) => {
    if (e instanceof RemcardApiError && e.status === 409) {
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
    if (busy || !org) return;
    if (action === "reject") {
      const err = validateModerationRejectClient(text);
      if (err) {
        setMessage({ kind: "err", text: err });
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(text);
      if (err) {
        setMessage({ kind: "err", text: err });
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
      try {
        await load();
      } catch {
        setMessage({
          kind: "ok",
          text: "Решение сохранено, но карточку не удалось обновить. Нажмите «Обновить данные».",
        });
      }
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
    if (action === "reject") {
      const err = validateModerationRejectClient(text);
      if (err) {
        setMessage({ kind: "err", text: err });
        return;
      }
    }
    if (action === "revise") {
      const err = validateModerationReviseClient(text);
      if (err) {
        setMessage({ kind: "err", text: err });
        return;
      }
    }

    setBusy(true);
    const branch = org.branches.find((b) => b.id === branchId);
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
      try {
        await load();
      } catch {
        setMessage({
          kind: "ok",
          text: "Решение сохранено, но карточку не удалось обновить. Нажмите «Обновить данные».",
        });
      }
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

  if (loading) return <p className={styles.page}>Загрузка…</p>;
  if (error) {
    return (
      <p className={styles.page} role="alert">
        {error}
      </p>
    );
  }
  if (!org || !previewInput) return <p className={styles.page}>Не найдено</p>;

  const backQs = searchParams.toString();
  const orgPending = org.catalogStatus === "PENDING";
  const pendingBranches = org.branches.filter((b) => b.catalogStatus === "PENDING");

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href={`/admin/moderation${backQs ? `?${backQs}` : ""}`}>
        ← Очередь модерации
      </Link>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{org.name}</h1>
          <div className={styles.badges}>
            <span className={styles.badge}>{partnerTypeLabel(org.partnerType)}</span>
            <span className={orgPending ? styles.badgePending : styles.badge}>
              {moderationCatalogStatusLabel(org.catalogStatus)}
            </span>
            {org.isTestPartner ? <span className={styles.badgeTest}>Тестовый партнёр</span> : null}
          </div>
        </div>
        {city ? <p className={styles.metaLine}>Город: {city}</p> : null}
        {org.updatedAt ? (
          <p className={styles.metaLine}>
            Обновлено в системе: {new Date(org.updatedAt).toLocaleString("ru-RU")} (не дата отправки
            заявки)
          </p>
        ) : null}
        {visibility ? (
          <p className={styles.metaLine}>
            <strong>Видимость в каталоге:</strong> {visibility.headline} — {visibility.detail}
          </p>
        ) : null}
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
          Обновить данные
        </Button>
      </header>

      <div className={styles.previewBar}>
        <Button type="button" variant="secondary" onClick={() => setPreview({ mode: "list" })}>
          Посмотреть как в каталоге · список
        </Button>
        <Button type="button" variant="secondary" onClick={() => setPreview({ mode: "full" })}>
          Посмотреть как в каталоге · полная карточка
        </Button>
      </div>

      <div className={styles.sectionGrid}>
        <Panel title={changeBlock?.title ?? "Изменения"}>
          <ul className={styles.diffList}>
            {(changeBlock?.lines ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Готовность к публикации">
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
        </Panel>

        <Panel title="Фото и описание">
          {org.submitted.logoUrl ? (
            <SafePhoto src={org.submitted.logoUrl} alt="" className={styles.photoThumb} />
          ) : (
            <p className={styles.metaLine}>Логотип не приложен</p>
          )}
          <p>{org.submitted.description?.trim() || "Описание не указано"}</p>
        </Panel>

        <Panel title="Контакты (публичные в заявке)">
          <div className={styles.dataGrid}>
            <span>Сайт</span>
            <span>{org.submitted.website?.trim() || "—"}</span>
            <span>Telegram</span>
            <span>{org.submitted.telegram?.trim() || "—"}</span>
            <span>Email</span>
            <span>{org.submitted.publicEmail?.trim() || "—"}</span>
            <span>Телефон</span>
            <span>{moderationFormatPublicPhone(org.submitted.publicPhone)}</span>
          </div>
        </Panel>

        <Panel title="Товары и услуги">
          <div className={styles.dataGrid}>
            <span>Товары</span>
            <span>{moderationSubmittedCategoryLabels(org.submitted.storeCategories).join(", ") || "—"}</span>
            <span>Услуги</span>
            <span>{moderationSubmittedServiceLabels(org.submitted.specializations).join(", ") || "—"}</span>
            <span>Этапы</span>
            <span>{moderationSubmittedStageLabels(org.submitted.navigatorStageIds).join(", ") || "—"}</span>
          </div>
        </Panel>

        {org.live.catalogPublished ? (
          <Panel title="Опубликовано сейчас (live)" hint="Для сравнения с отправленной заявкой">
            <p>{org.live.description?.trim() || "Описание не заполнено"}</p>
          </Panel>
        ) : null}

        {org.publicContacts?.length ? (
          <Panel title="Служебно: строки publicContacts (опубликованный справочник)">
            <ul className={styles.diffList}>
              {org.publicContacts.map((c, i) => (
                <li key={`${c.type}-${i}`}>
                  {moderationPublicContactTypeLabel(c.type)}: {c.value}{" "}
                  {c.isPublic ? "" : "(скрыт)"}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel title="Адреса и филиалы">
          {org.branches.map((b) => (
            <article
              key={b.id}
              id={`branch-${b.id}`}
              className={`${styles.branchCard} ${focusBranch === b.id ? styles.branchFocus : ""}`}
            >
              <strong>{b.submitted.name ?? "Филиал"}</strong> ·{" "}
              {moderationCatalogStatusLabel(b.catalogStatus)}
              {b.catalogStatus === "DRAFT" ? (
                <p className={styles.branchDraftNote}>Черновик — на проверку не отправлен.</p>
              ) : null}
              <p className={styles.metaLine}>
                {b.submitted.city}, {b.submitted.address}
              </p>
              {b.submitted.workingHours ? <p>Часы: {b.submitted.workingHours}</p> : null}
              {b.submitted.description ? <p>{b.submitted.description}</p> : null}
              {b.submitted.photoUrl ? (
                <SafePhoto src={b.submitted.photoUrl} alt="" className={styles.photoThumb} />
              ) : null}
              {b.catalogStatus === "PENDING" ? (
                <div className={styles.actionsRow} style={{ marginTop: "0.5rem" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setBranchDialog({ branchId: b.id, action: "approve", text: "" })}
                  >
                    Одобрить филиал
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    disabled={busy}
                    onClick={() => setBranchDialog({ branchId: b.id, action: "revise", text: "" })}
                  >
                    На доработку
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    disabled={busy}
                    onClick={() => setBranchDialog({ branchId: b.id, action: "reject", text: "" })}
                  >
                    Отклонить
                  </Button>
                </div>
              ) : null}
              {b.catalogStatus === "PENDING" ? (
                <BranchCatalogPublicationPreview model={buildModerationBranchPreviewModel(b, org)} />
              ) : null}
            </article>
          ))}
        </Panel>

        <Panel title="История проверки">
          <p className={styles.metaLine}>
            История решений по организации в API не передаётся. Показываются только сохранённые данные
            текущей заявки.
          </p>
        </Panel>

        {org.isTestPartner ? (
          <Panel title="Публикация тестового партнёра">
            <p className={styles.metaLine}>
              Opt-in владельца:{" "}
              {org.profTestPublicCatalogAllowed
                ? "разрешён"
                : "не разрешён — одобренные test-карточки скрыты"}
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
          </Panel>
        ) : null}
      </div>

      <section className={styles.actionsPanel} aria-label="Решение по организации">
        <h2 className={styles.dialogTitle}>Решение по организации</h2>
        <p className={styles.metaLine}>{moderationOrgCanPublishLabel(org)}</p>
        <div className={styles.actionsRow}>
          <Button
            className={styles.actionPrimary}
            type="button"
            disabled={busy || !orgPending}
            onClick={() => setOrgDialog({ action: "approve", text: "" })}
          >
            {orgApproveButtonLabel(org)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !orgPending}
            onClick={() => setOrgDialog({ action: "revise", text: "" })}
          >
            Вернуть на доработку
          </Button>
          <Button
            type="button"
            variant="text"
            disabled={busy || !orgPending}
            onClick={() => setOrgDialog({ action: "reject", text: "" })}
          >
            Отклонить заявку
          </Button>
          {pendingBranches.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !orgPending}
              onClick={() => setOrgDialog({ action: "approve-all", text: "" })}
            >
              Одобрить org и {pendingBranches.length} филиал(ов)
            </Button>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className={message.kind === "err" ? styles.statusError : styles.statusOk} role="status">
          {message.text}
        </p>
      ) : null}

      <dl className={styles.techBlock}>
        <dt>Служебная информация</dt>
        <dd>ID организации: {org.id}</dd>
        <dd>Owner public ID: {org.ownerPublicId}</dd>
        <dd>revisionToken: {org.revisionToken}</dd>
      </dl>

      <ModerationPreviewModal
        open={preview !== null}
        mode={preview?.mode ?? "full"}
        onClose={() => setPreview(null)}
        profile={previewInput.profile}
        draft={previewInput.draft}
        partnerType={org.partnerType}
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
        onTextChange={(t) => setOrgDialog((d) => (d ? { ...d, text: t } : d))}
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
        onTextChange={(t) => setOrgDialog((d) => (d ? { ...d, text: t } : d))}
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
          onTextChange={(t) => setBranchDialog((d) => (d ? { ...d, text: t } : d))}
          onCancel={() => setBranchDialog(null)}
          onConfirm={() =>
            void runBranchAction(branchDialog.branchId, branchDialog.action, branchDialog.text)
          }
        />
      ) : null}

      <ModerationConfirmDialog
        open={testDialog !== null}
        title={testDialog ? "Разрешить публикацию test" : "Скрыть test из каталога"}
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
