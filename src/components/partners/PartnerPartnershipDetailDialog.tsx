"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getPartnershipUiActions, partnershipInviteTermsEmpty } from "@/lib/partnership-rules";
import {
  partnerRowTitle,
  partnerTermsFullDetail,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import { CounterpartyProfile } from "@/components/partners/CounterpartyProfile";
import { resolvePublicPartnerType } from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";
import {
  CertificatePolicyDialog,
  type PartnerCertificatePolicyEntry,
} from "@/components/certificate-policy/CertificatePolicyDialog";
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";
import type { CertificatePolicyCounterparty } from "@/lib/certificate-policy/types";
import {
  counterpartyUserId,
  directionBadgeModel,
  partnershipClientsHref,
  directionClientsHref,
  directionReceiverId,
  formatPurchaseLimit,
  formatValidityDays,
  rowDirection,
} from "@/lib/partner-directions/direction";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import { PartnerDirectionBadge } from "@/components/partners/PartnerDirectionBadge";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  getFocusableElements,
  handleDialogTabKey,
  lockBodyScroll,
  unlockBodyScroll,
} from "@/lib/dialog-focus";
import { Button } from "@/components/ui/Button";
import {
  cooperationActionLabel,
  termChangeActionLabel,
} from "@/components/partners/partner-cooperation-c1";
import sheetStyles from "./PartnerPersonalAliasDialog.module.css";
import styles from "./PartnerPartnershipDetailDialog.module.css";
import outgoingSheetStyles from "./PartnerOutgoingSheet.module.css";
import { PartnerOutgoingClientsTab } from "./PartnerOutgoingClientsTab";
import { PartnerRowTerms } from "./PartnerRowTerms";
import { useOutgoingPartnerClients } from "./useOutgoingPartnerClients";

type Props = {
  partnership: Partnership | null;
  meId: string;
  /** List principal for counterparty display (defaults to meId). */
  listSubjectUserId?: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  busy?: boolean;
  /**
   * When an overlying confirm owns focus (pause/resume / dirty discard),
   * suspend Escape + focus trap so only the top workflow is active.
   */
  suspendFocusTrap?: boolean;
  /** Action error owned by the open detail workflow (visible above the sheet body). */
  actionError?: string;
  /** Existing hub handler (pause/resume/invite actions). */
  onRunAction?: (action: string) => void;
  /** Opens the shared term-change host for this partnership. */
  onOpenTermChange?: () => void;
  compactCooperation?: boolean;
  /** Which tab the outgoing partner sheet opens on. */
  initialSheetTab?: "terms" | "clients";
  /** Overview with directions: header, per-row terms and links. */
  directionAudience?: PartnersHubAudience;
  /** Gate from the hub: who may open the existing certificate-policy editor. */
  certificatePolicyEntry?: PartnerCertificatePolicyEntry | null;
};

type RowPolicyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; row: CertificatePolicyCounterparty }
  | { status: "missing" }
  | { status: "error" };

function directionSentence(partnership: Partnership, meId: string): string {
  const direction = rowDirection(partnership, meId);
  const base =
    direction === "incoming"
      ? "Партнёр выдаёт сертификаты вашей организации на ваших условиях получения."
      : "Вы выдаёте сертификаты этому партнёру. Условия получения задаёт он, вы их не меняете.";
  switch (partnership.status) {
    case "ACTIVE":
      return base;
    case "PAUSED":
      return `${base} Сейчас приостановлено: выдача сертификатов недоступна.`;
    case "INVITED":
    case "PENDING":
      return "Договорённость ещё не действует: ждёт ответа. Сертификаты по ней выдать нельзя.";
    case "ENDED":
      return "Договорённость завершена. Ранее выданные сертификаты не меняются.";
    default:
      return base;
  }
}

function isEmptyAgentInviteRequest(partnership: Partnership, meId: string): boolean {
  if (partnership.status !== "INVITED" || !partnershipInviteTermsEmpty(partnership)) {
    return false;
  }
  if (partnership.initiatedBy === meId) return false;
  const partner = partnershipPartnerProfile(partnership, meId);
  return resolvePublicPartnerType(partner) === "agent";
}

export function PartnerPartnershipDetailDialog({
  partnership,
  meId,
  listSubjectUserId,
  open,
  onClose,
  returnFocusRef,
  busy = false,
  suspendFocusTrap = false,
  actionError = "",
  onRunAction,
  onOpenTermChange,
  compactCooperation = false,
  initialSheetTab = "terms",
  directionAudience,
  certificatePolicyEntry = null,
}: Props) {
  const titleId = useId();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<"settings" | "incoming">("incoming");
  const [rowPolicy, setRowPolicy] = useState<RowPolicyState>({ status: "idle" });
  const partnershipId = partnership?.id ?? null;
  const partnershipStatus = partnership?.status ?? null;
  const policyViewerId = certificatePolicyEntry?.viewerUserId ?? null;
  const trapSuspended = suspendFocusTrap || policyOpen;

  const loadRowPolicy = useCallback(() => {
    if (!open || !partnershipId || !policyViewerId) {
      setRowPolicy({ status: "idle" });
      return () => undefined;
    }
    if (partnershipStatus !== "ACTIVE" && partnershipStatus !== "PAUSED") {
      setRowPolicy({ status: "idle" });
      return () => undefined;
    }
    let cancelled = false;
    setRowPolicy({ status: "loading" });
    void fetchCertificatePolicyWorkspace(policyViewerId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setRowPolicy({ status: "error" });
        return;
      }
      const row = res.workspace.counterparties.find((item) => item.partnershipId === partnershipId);
      setRowPolicy(row ? { status: "loaded", row } : { status: "missing" });
    });
    return () => {
      cancelled = true;
    };
  }, [open, partnershipId, partnershipStatus, policyViewerId]);

  useEffect(() => loadRowPolicy(), [loadRowPolicy]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const focusStartRef = useRef<HTMLSpanElement>(null);
  const focusEndRef = useRef<HTMLSpanElement>(null);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      returnFocusRef?.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();

    // Overlying confirm owns Escape/focus — do not steal or close detail underneath.
    if (trapSuspended) {
      return () => {
        unlockBodyScroll();
      };
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      const sheet = sheetRef.current;
      if (sheet) handleDialogTabKey(event, sheet);
    };

    const redirectFocusIntoDialog = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = getFocusableElements(sheet);
      focusable[0]?.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const target = event.target;
      if (target instanceof Node && sheet.contains(target)) return;
      event.stopPropagation();
      redirectFocusIntoDialog();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("focusin", onFocusIn, true);
      unlockBodyScroll();
    };
  }, [open, trapSuspended]);

  const listPrincipalIdEarly = listSubjectUserId?.trim() || meId;
  const sheetMode = Boolean(
    open &&
      partnership &&
      directionAudience &&
      partnership.directionInfo &&
      rowDirection(partnership, listPrincipalIdEarly) === "outgoing" &&
      (partnership.status === "ACTIVE" || partnership.status === "PAUSED"),
  );
  const outgoingPartnerId =
    sheetMode && partnership ? directionReceiverId(partnership, listPrincipalIdEarly) : null;
  const outgoingClients = useOutgoingPartnerClients(outgoingPartnerId, sheetMode);
  const [sheetTab, setSheetTab] = useState<"terms" | "clients">("terms");
  const termsTabRef = useRef<HTMLButtonElement>(null);
  const clientsTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setSheetTab(initialSheetTab);
  }, [partnershipId, open, initialSheetTab]);

  if (!open || !partnership) return null;

  const listPrincipalId = listSubjectUserId?.trim() || meId;
  const actions = getPartnershipUiActions(partnership, listPrincipalId);
  const waiting = actions.filter((a) => a.kind === "waiting");
  const runnable = actions.filter((a) => a.kind !== "waiting");
  const hasActionCallbacks = Boolean(onRunAction || onOpenTermChange);
  const termsLines = partnerTermsFullDetail(partnership);
  const showAgentEmptyExplain = isEmptyAgentInviteRequest(partnership, meId);
  const directional = Boolean(directionAudience && partnership.directionInfo);
  const direction = rowDirection(partnership, listPrincipalId);
  const badge = directional ? directionBadgeModel(partnership, listPrincipalId, directionAudience) : null;
  const excludedTerms = partnership.terms.filter((term) => term.isExcluded);
  const clientsHref = directional ? partnershipClientsHref(partnership, listPrincipalId) : null;
  const counterpartyId = counterpartyUserId(partnership, listPrincipalId);
  const offer = partnership.pendingOffer ?? null;
  const policyRow = rowPolicy.status === "loaded" ? rowPolicy.row : null;
  const canOpenPolicy = directional && certificatePolicyEntry != null &&
    (partnership.status === "ACTIVE" || partnership.status === "PAUSED");

  const existingBody = (
    <>
          <CounterpartyProfile partnership={partnership} listPrincipalId={listPrincipalId} />

          {directional && badge ? (
            <section className={styles.directionBlock} data-testid="partner-detail-direction" data-direction={direction}>
              <div className={styles.directionHead}>
                <PartnerDirectionBadge
                  glyph={badge.glyph}
                  label={badge.label}
                  description={badge.description}
                  pending={partnership.status !== "ACTIVE" && partnership.status !== "PAUSED"}
                  testId="partner-detail-direction-badge"
                />
                <strong>{badge.label}</strong>
              </div>
              <p className={styles.metaBlock}>{directionSentence(partnership, listPrincipalId)}</p>
              {partnership.directionInfo?.legacyInverted ? (
                <p className={styles.metaBlock} data-testid="partner-detail-legacy-inverted">
                  Партнёрство создано по прежней схеме агента: условия получения задаёт бизнес, агент выдаёт сертификаты.
                </p>
              ) : null}
              {partnership.directionInfo?.reverseStatus ? (
                <p className={styles.metaBlock} data-testid="partner-detail-reverse">
                  Встречное направление:{" "}
                  {{ ACTIVE: "действует", PAUSED: "приостановлено", INVITED: "ждёт ответа", PENDING: "ждёт ответа", ENDED: "завершено" }[
                    partnership.directionInfo.reverseStatus
                  ] ?? partnership.directionInfo.reverseStatus}
                  . У него свои условия, лимиты и клиенты.
                </p>
              ) : null}
            </section>
          ) : null}

          {showAgentEmptyExplain ? (
            <p className={styles.explain} data-testid="partner-detail-agent-empty-hint">
              Агент хочет рекомендовать ваши товары и услуги клиентам. Вы можете подготовить
              персональное предложение с категориями и процентами или отклонить запрос.
            </p>
          ) : null}

          <p className={styles.sectionTitle}>
            {directional
              ? direction === "incoming"
                ? "Ваши условия получения"
                : "Условия партнёра для ваших рекомендаций"
              : compactCooperation
                ? "Ваши условия по категориям"
                : "Персональные условия"}
          </p>
          {termsLines.length ? (
            <ul className={`${styles.list} ${styles.termsList}`} data-testid="partner-detail-terms-list">
              {termsLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.metaBlock}>Персональные условия пока не согласованы.</p>
          )}
          {directional && partnership.terms.some((term) => !term.isExcluded && term.storePercent === 0) ? (
            <p className={styles.metaBlock} data-testid="partner-detail-zero-note">
              0% — категория согласована без скидки. Это не исключение: остальные категории выдаются как обычно.
            </p>
          ) : null}
          {directional && excludedTerms.length ? (
            <p className={styles.metaBlock} data-testid="partner-detail-excluded">
              Не участвуют: {excludedTerms.map((term) => displayCategoryLabel(term.category, term.categoryLabel)).join(", ")}
            </p>
          ) : null}

          {directional && offer ? (
            <div data-testid="partner-detail-offer">
              <p className={styles.sectionTitle}>Условия сертификата в приглашении</p>
              <p className={styles.metaBlock}>
                Срок скидки: {formatValidityDays(offer.restrictions.validityDays)} · {formatPurchaseLimit(offer.restrictions.purchaseLimit)}
                {offer.restrictions.minimumPurchaseAmount != null
                  ? ` · от ${offer.restrictions.minimumPurchaseAmount} ₽`
                  : ""}
                {offer.restrictions.promotionsCompatible ? " · суммируется с акциями" : " · без суммирования с акциями"}
              </p>
              {offer.restrictions.exclusionsText ? (
                <p className={styles.metaBlock}>{offer.restrictions.exclusionsText}</p>
              ) : null}
              <p className={styles.metaBlock}>Применятся только после принятия приглашения. Общие условия при этом не меняются.</p>
            </div>
          ) : null}

          {directional && (partnership.status === "ACTIVE" || partnership.status === "PAUSED") && policyViewerId ? (
            <div data-testid="partner-detail-restrictions">
              <p className={styles.sectionTitle}>Срок и число покупок</p>
              {rowPolicy.status === "loading" ? <p className={styles.metaBlock}>Загрузка…</p> : null}
              {rowPolicy.status === "error" ? (
                <p className={styles.metaBlock} role="alert">
                  Не удалось загрузить срок и число покупок.{" "}
                  <button type="button" onClick={() => loadRowPolicy()}>Повторить</button>
                </p>
              ) : null}
              {rowPolicy.status === "missing" ? (
                <p className={styles.metaBlock}>Ограничения для этой договорённости пока недоступны.</p>
              ) : null}
              {policyRow ? (
                <p className={styles.metaBlock} data-testid="partner-detail-restrictions-line">
                  Срок скидки: {formatValidityDays(policyRow.effective.validityDays)} · {formatPurchaseLimit(policyRow.effective.purchaseLimit)}
                  {policyRow.effective.minimumPurchaseAmount != null
                    ? ` · от ${policyRow.effective.minimumPurchaseAmount} ₽`
                    : ""}
                  {policyRow.effective.promotionsCompatible ? " · суммируется с акциями" : " · без суммирования с акциями"}
                </p>
              ) : null}
            </div>
          ) : null}

          {directional && (canOpenPolicy || clientsHref) ? (
            <div className={styles.actionRow} data-testid="partner-detail-links">
              {canOpenPolicy && direction === "incoming" && certificatePolicyEntry?.canEditSettings &&
              partnership.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="partner-detail-individual-terms"
                  onClick={() => {
                    setPolicyTab("settings");
                    setPolicyOpen(true);
                  }}
                >
                  Индивидуальные условия
                </Button>
              ) : null}
              {canOpenPolicy && direction === "outgoing" ? (
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="partner-detail-receiver-terms"
                  onClick={() => {
                    setPolicyTab("incoming");
                    setPolicyOpen(true);
                  }}
                >
                  Условия сертификатов партнёра
                </Button>
              ) : null}
              {clientsHref ? (
                <Link href={clientsHref} className={styles.certificateLink} data-testid="partner-detail-clients-link">
                  {direction === "outgoing" ? "Клиенты у этого партнёра" : "Клиенты по рекомендациям"}
                </Link>
              ) : null}
            </div>
          ) : null}

          {waiting.map((item) => (
            <p key={item.message} className={styles.waiting}>
              {item.message}
            </p>
          ))}

          {hasActionCallbacks && (runnable.length || partnership.status === "ACTIVE") ? (
            <div className={styles.actionsBlock} data-testid="partner-detail-actions">
              <p className={styles.sectionTitle}>{compactCooperation ? "Сотрудничество" : "Действия"}</p>
              {actionError ? (
                <p className={styles.actionError} role="alert" data-testid="partner-detail-action-error">
                  {actionError}
                </p>
              ) : null}
              <div className={styles.actionRow}>
                {runnable.map((action) => (
                  <Button
                    key={action.kind}
                    type="button"
                    variant={action.variant ?? "secondary"}
                    disabled={busy || !onRunAction}
                    data-testid={`partner-detail-action-${action.kind}`}
                    data-partnership-id={partnership.id}
                    onClick={() => onRunAction?.(action.kind)}
                  >
                    {cooperationActionLabel(action.kind) ?? action.label}
                  </Button>
                ))}
                {partnership.status === "ACTIVE" && onOpenTermChange ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    data-testid="partner-detail-term-change"
                    data-partnership-id={partnership.id}
                    onClick={onOpenTermChange}
                  >
                    {termChangeActionLabel(partnership)}
                  </Button>
                ) : null}
                {compactCooperation && partnership.status === "ACTIVE" ? (
                  <Link href="/certificates" className={styles.certificateLink}>
                    Создать сертификат
                  </Link>
                ) : null}
              </div>
              {compactCooperation ? (
                <p className={styles.metaBlock}>
                  Архив в списке не меняет условия сотрудничества. Пауза сотрудничества
                  управляется отдельно.
                </p>
              ) : null}
            </div>
          ) : runnable.length ? (
            <>
              <p className={styles.sectionTitle}>Доступные действия в списке</p>
              <p className={styles.metaBlock}>
                {runnable
                  .map((a) => cooperationActionLabel(a.kind) ?? a.label)
                  .join(" · ")}
              </p>
            </>
          ) : null}

          {partnership.note ? (
            <>
              <p className={styles.sectionTitle}>Комментарий</p>
              <p className={styles.metaBlock}>{partnership.note}</p>
            </>
          ) : null}
    </>
  );

  const partnerTitle = partnerRowTitle(partnership, listPrincipalId);
  const receiverClientsHref = sheetMode ? directionClientsHref(partnership, listPrincipalId) : null;
  const clientsCountLabel =
    outgoingClients.state.phase === "ready" ? ` ${outgoingClients.state.appeals.length}` : "";
  const restrictionsForRates =
    policyRow
      ? { validityDays: policyRow.effective.validityDays, purchaseLimit: policyRow.effective.purchaseLimit }
      : null;
  const sheetBody = (
    <>
      <div
        className={outgoingSheetStyles.tabs}
        role="tablist"
        aria-label="Разделы партнёра"
        data-testid="partner-sheet-tabs"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const next = sheetTab === "terms" ? "clients" : "terms";
          setSheetTab(next);
          (next === "terms" ? termsTabRef : clientsTabRef).current?.focus();
        }}
      >
        <button
          type="button"
          role="tab"
          ref={termsTabRef}
          id={`${titleId}-tab-terms`}
          aria-selected={sheetTab === "terms"}
          aria-controls={`${titleId}-panel-terms`}
          tabIndex={sheetTab === "terms" ? 0 : -1}
          className={outgoingSheetStyles.tab}
          data-testid="partner-sheet-tab-terms"
          onClick={() => setSheetTab("terms")}
        >
          Условия
        </button>
        <button
          type="button"
          role="tab"
          ref={clientsTabRef}
          id={`${titleId}-tab-clients`}
          aria-selected={sheetTab === "clients"}
          aria-controls={`${titleId}-panel-clients`}
          tabIndex={sheetTab === "clients" ? 0 : -1}
          className={outgoingSheetStyles.tab}
          data-testid="partner-sheet-tab-clients"
          onClick={() => setSheetTab("clients")}
        >
          Клиенты{clientsCountLabel}
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${titleId}-panel-terms`}
        aria-labelledby={`${titleId}-tab-terms`}
        hidden={sheetTab !== "terms"}
        data-testid="partner-sheet-panel-terms"
      >
        <p className={outgoingSheetStyles.context}>Условия, которые {partnerTitle} дал вам</p>
        <p
          className={outgoingSheetStyles.statusBadge}
          data-state={partnership.status === "ACTIVE" ? "active" : "paused"}
          data-testid="partner-sheet-status"
        >
          {partnership.status === "ACTIVE" ? "Условия согласованы" : "Сотрудничество приостановлено"}
        </p>
        {partnership.terms.length ? (
          <dl
            className={outgoingSheetStyles.rates}
            aria-label="Согласованные проценты по категориям"
            data-testid="partner-sheet-rates"
          >
            {partnership.terms.map((term) => (
              <div
                key={term.id}
                data-testid="partner-sheet-rate"
                data-excluded={term.isExcluded ? "true" : undefined}
              >
                <dt>{displayCategoryLabel(term.category, term.categoryLabel)}</dt>
                <dd>
                  {term.isExcluded ? (
                    <span className={outgoingSheetStyles.excluded} data-testid="partner-sheet-excluded">
                      Не участвует
                    </span>
                  ) : (
                    `${term.storePercent}%`
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.metaBlock}>Персональные условия пока не согласованы.</p>
        )}
        {policyViewerId ? (
          <div data-testid="partner-sheet-restrictions">
            {rowPolicy.status === "loading" ? (
              <p className={outgoingSheetStyles.muted} role="status">Загрузка…</p>
            ) : null}
            {rowPolicy.status === "error" ? (
              <p className={outgoingSheetStyles.muted} role="alert">
                Не удалось загрузить срок и число покупок.{" "}
                <button type="button" className={outgoingSheetStyles.linkButton} onClick={() => loadRowPolicy()}>
                  Повторить
                </button>
              </p>
            ) : null}
            {rowPolicy.status === "missing" ? (
              <p className={outgoingSheetStyles.muted}>Ограничения для этой договорённости пока недоступны.</p>
            ) : null}
            {policyRow ? (
              <>
                <dl className={outgoingSheetStyles.limitTiles} data-testid="partner-sheet-limits">
                  <div data-testid="partner-sheet-limit-validity">
                    <dt>Срок скидки</dt>
                    <dd>
                      <strong>{policyRow.effective.validityDays}</strong>
                      <span>{formatValidityDays(policyRow.effective.validityDays).replace(/^\d+\s*/, "")}</span>
                    </dd>
                  </div>
                  <div data-testid="partner-sheet-limit-purchases">
                    <dt>Покупок</dt>
                    <dd>
                      <strong>{policyRow.effective.purchaseLimit}</strong>
                    </dd>
                  </div>
                </dl>
                <details className={outgoingSheetStyles.restrictionsDisclosure} data-testid="partner-sheet-restrictions-details">
                  <summary>Ограничения</summary>
                  <ul>
                    {policyRow.effective.minimumPurchaseAmount != null ? (
                      <li>Минимальная покупка: от {policyRow.effective.minimumPurchaseAmount} ₽</li>
                    ) : null}
                    <li>
                      {policyRow.effective.promotionsCompatible
                        ? "Суммируется с акциями"
                        : "Не суммируется с акциями"}
                    </li>
                    {policyRow.effective.exclusionsText ? <li>{policyRow.effective.exclusionsText}</li> : null}
                  </ul>
                </details>
              </>
            ) : null}
          </div>
        ) : null}
        <div className={outgoingSheetStyles.sheetActions}>
          {partnership.status === "ACTIVE" ? (
            <Link href="/certificates" className={outgoingSheetStyles.createLink} data-testid="partner-sheet-create-certificate">
              Создать сертификат
            </Link>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onCloseRef.current()} data-testid="partner-sheet-close">
            Закрыть
          </Button>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${titleId}-panel-clients`}
        aria-labelledby={`${titleId}-tab-clients`}
        hidden={sheetTab !== "clients"}
        data-testid="partner-sheet-panel-clients"
      >
        {sheetTab === "clients" && receiverClientsHref ? (
          <PartnerOutgoingClientsTab
            partnerName={partnerTitle}
            clientsHref={receiverClientsHref}
            state={outgoingClients.state}
            onRetry={outgoingClients.reload}
          />
        ) : null}
      </div>

      <details className={outgoingSheetStyles.profile} data-testid="partner-sheet-profile">
        <summary>Профиль партнёра, условия и действия</summary>
        <div className={outgoingSheetStyles.profileBody}>{existingBody}</div>
      </details>
    </>
  );

  return (
    <>
    <div
      className={`${sheetStyles.backdrop} ${styles.backdropAlign}`}
      role="presentation"
      onClick={() => onCloseRef.current()}
    >
      <div
        ref={sheetRef}
        className={`${sheetStyles.sheet} ${styles.sheetLayout} ${compactCooperation ? styles.cooperationSheet : ""}${sheetMode ? ` ${outgoingSheetStyles.sheetRoot} ${outgoingSheetStyles.sheet}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="partner-partnership-detail-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          ref={focusStartRef}
          tabIndex={0}
          aria-hidden="true"
          className={styles.focusSentinel}
          data-testid="partner-detail-focus-start"
          onFocus={() => {
            const focusable = sheetRef.current ? getFocusableElements(sheetRef.current) : [];
            focusable[focusable.length - 1]?.focus();
          }}
        />
        <div className={`${styles.headerRow}${sheetMode ? ` ${outgoingSheetStyles.header}` : ""}`}>
          <h2 id={titleId}>{partnerTitle}</h2>
          {sheetMode ? (
            <button
              ref={closeRef}
              type="button"
              className={outgoingSheetStyles.closeIcon}
              aria-label="Закрыть"
              onClick={() => onCloseRef.current()}
              data-testid="partner-detail-close"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <Button
            ref={closeRef}
            type="button"
            variant="secondary"
            className={styles.closeTop}
            onClick={() => onCloseRef.current()}
            data-testid="partner-detail-close"
          >
            Закрыть
            </Button>
          )}
        </div>

        <div className={styles.body} data-testid="partner-detail-body">
          {sheetMode ? sheetBody : existingBody}
        </div>
        <span
          ref={focusEndRef}
          tabIndex={0}
          aria-hidden="true"
          className={styles.focusSentinel}
          data-testid="partner-detail-focus-end"
          onFocus={() => closeRef.current?.focus()}
        />
      </div>
    </div>
    {certificatePolicyEntry && directional ? (
      <CertificatePolicyDialog
        open={policyOpen}
        onClose={() => {
          setPolicyOpen(false);
          loadRowPolicy();
        }}
        canEditSettings={certificatePolicyEntry.canEditSettings}
        viewerUserId={certificatePolicyEntry.viewerUserId}
        onEffectiveTermsChanged={certificatePolicyEntry.onEffectiveTermsChanged}
        initialTab={certificatePolicyEntry.canEditSettings ? policyTab : "incoming"}
        initialScope={policyTab === "settings" ? "individual" : undefined}
        initialPartnershipId={policyTab === "settings" ? partnership.id : null}
        initialPartnerUserId={policyTab === "settings" ? counterpartyId : null}
      />
    ) : null}
    </>
  );
}
