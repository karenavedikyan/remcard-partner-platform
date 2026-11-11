"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { displayCategoryLabelFromStored } from "@/lib/category-display";
import { presentAccrualRow } from "@/lib/history-accrual-display";
import { documentOperationsHref, formatMoneyRub } from "@/lib/history-format";
import { accrualScopeLabel } from "@/lib/history-labels";
import { findPurchaseForAccrual, purchaseDetailHref } from "@/lib/history-links";
import {
  fetchAccrualById,
  fetchPurchaseByOrderId,
  fetchPurchaseRows,
} from "@/lib/history-loader";
import type { AccrualRow, AccrualType, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PayoutRecordModal } from "@/components/payout/PayoutRecordModal";
import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import { authorizeSettlementWalletPaymentMutations } from "@/lib/employee-workspace-data/settlement-wallet-read-auth";
import { fetchBonusPayoutActions, type SettlementPayoutActions } from "@/lib/payout-record";
import focus from "./history-focus.module.css";

/**
 * Payout affordance gate for history detail.
 * - `presentation === null`: legacy personal shell (no CabinetPresentationProvider).
 * - Provider present but context pending/invalid: fail closed.
 * - Org workplace: shared payment mutation auth only.
 */
export function deriveCanRecordAccrualPayout(
  user: Pick<AuthUser, "id" | "role">,
  presentation: CabinetPresentationSnapshot | null,
): boolean {
  if (presentation === null) {
    return true;
  }
  if (!presentation.contextReady) {
    return false;
  }
  if (validateProContextSnapshot(presentation.proContext).ok !== true) {
    return false;
  }
  const proContext = presentation.proContext;
  if (!proContext) {
    return false;
  }
  const role = proContext.role?.trim() ?? "";
  if (role === "ORG_OWNER" && user.role === "PRO") {
    return true;
  }
  if (isOrgWorkplaceMemberRole(role) && proContext.organization?.id) {
    return authorizeSettlementWalletPaymentMutations({
      user: user as AuthUser,
      proContext,
      contextReady: true,
    }).allowed;
  }
  return true;
}

function formatDetailDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitHeroAmount(value: number): { amount: string; symbol: string } {
  const hasFraction = Math.abs(value - Math.round(value)) > 1e-9;
  const amount = hasFraction
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString("ru-RU");
  return { amount, symbol: "₽" };
}

function accrualFocusLabel(row: AccrualRow): string {
  if (row.accrualType === "agentBonus") {
    return "Агентское вознаграждение";
  }
  if (row.scope === "payable-to-pros") {
    return "Вознаграждение профклиенту";
  }
  if (row.scope === "earned") {
    return "Начислено мне";
  }
  return accrualScopeLabel(row.scope);
}

function accrualTypeLabel(row: AccrualRow): string {
  if (row.accrualType === "agentBonus") {
    return "Агентский бонус";
  }
  return "Бонус профклиента";
}

type AccrualDetailProps = {
  user: AuthUser;
  accrualId: string;
  accrualType?: AccrualType;
};

export function AccrualDetail({ user, accrualId, accrualType }: AccrualDetailProps) {
  const cabinetPresentation = useCabinetPresentation();
  const canRecordPayout = deriveCanRecordAccrualPayout(user, cabinetPresentation);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accrual, setAccrual] = useState<AccrualRow | null>(null);
  const [linkedPurchase, setLinkedPurchase] = useState<PurchaseRow | null>(null);
  const [linkedPurchaseState, setLinkedPurchaseState] = useState<"unknown" | "loading" | "found" | "missing">(
    "unknown",
  );
  const [payoutActions, setPayoutActions] = useState<SettlementPayoutActions | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  useEffect(() => {
    if (!canRecordPayout) {
      setPayoutActions(null);
      setPayoutModalOpen(false);
    }
  }, [canRecordPayout]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const row = await fetchAccrualById(accrualId, accrualType);
      if (!row) {
        setAccrual(null);
        setLinkedPurchase(null);
        setLinkedPurchaseState("missing");
        return;
      }
      setAccrual(row);
      setPayoutActions(null);
      setPayoutModalOpen(false);

      if (
        canRecordPayout &&
        row.scope === "payable-to-pros" &&
        row.accrualType === "bonus" &&
        row.status !== "PAID" &&
        row.status !== "CANCELLED"
      ) {
        try {
          const actions = await fetchBonusPayoutActions(row.id, row.accrualType);
          if (actions.canRecordCash || actions.canRecordTransfer) {
            setPayoutActions(actions);
          }
        } catch {
          // Payout actions are optional; detail remains read-only.
        }
      }

      setLinkedPurchaseState("loading");
      if (row.orderId) {
        const byOrderId = await fetchPurchaseByOrderId(row.orderId, user);
        setLinkedPurchase(byOrderId);
        setLinkedPurchaseState(byOrderId ? "found" : "missing");
        return;
      }

      const purchaseResult = await fetchPurchaseRows(user);
      const match = findPurchaseForAccrual(row, purchaseResult.purchases);
      setLinkedPurchase(match);
      setLinkedPurchaseState(match ? "found" : "missing");
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить начисление",
      );
    } finally {
      setLoading(false);
    }
  }, [user, accrualId, accrualType, canRecordPayout]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className={focus.loading}>Загрузка…</div>;
  }

  if (error) {
    return (
      <div className={focus.error} role="alert">
        <p>{error}</p>
        <Button onClick={() => void load()}>Повторить</Button>
      </div>
    );
  }

  if (!accrual) {
    return (
      <div className={focus.empty}>
        <p>Начисление не найдено среди доступных записей.</p>
        <Link href="/history" className={focus.backLink}>
          ← К истории
        </Link>
      </div>
    );
  }

  const presentation = presentAccrualRow(accrual);
  const hero = splitHeroAmount(presentation.heroAmount);

  return (
    <div className={focus.page}>
      <Link href="/history" className={focus.backLink}>
        ← К истории
      </Link>

      <div className={focus.detailHeading}>
        <h1>Детали начисления</h1>
        <StatusBadge label={presentation.statusLabel} tone={presentation.statusTone} />
      </div>

      <article className={focus.receipt}>
        <div className={focus.receiptFocus}>
          <p className={focus.receiptFocusLabel}>{accrualFocusLabel(accrual)}</p>
          <p className={focus.heroAmount}>
            {hero.amount} <span>{hero.symbol}</span>
          </p>
          <p className={focus.heroNote}>{presentation.heroNote}</p>
        </div>

        <dl className={focus.receiptMeta}>
          <div>
            <dt>Партнёр</dt>
            <dd>{accrual.counterpartyName}</dd>
          </div>
          {accrual.promoCode ? (
            <div>
              <dt>Сертификат</dt>
              <dd>{accrual.promoCode}</dd>
            </div>
          ) : null}
          <div>
            <dt>Дата начисления</dt>
            <dd>{formatDetailDate(accrual.createdAt)}</dd>
          </div>
          <div>
            <dt>Тип</dt>
            <dd>
              {accrualTypeLabel(accrual)}
              {accrual.scope !== "unknown" ? ` · ${accrualScopeLabel(accrual.scope)}` : null}
            </dd>
          </div>
          {presentation.breakdown?.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
          {accrual.paidAt ? (
            <div>
              <dt>Выплачено</dt>
              <dd>{formatDetailDate(accrual.paidAt)}</dd>
            </div>
          ) : null}
        </dl>

        {accrual.scope === "unknown" ? (
          <p className={focus.heroNote}>
            Не удалось определить тип начисления. Если сумма кажется неверной, обратитесь в поддержку
            RemCard.
          </p>
        ) : null}

        {linkedPurchase ? (
          <Link href={purchaseDetailHref(linkedPurchase)} className={focus.primaryLink}>
            Открыть связанную покупку <span aria-hidden="true">↗</span>
          </Link>
        ) : linkedPurchaseState === "missing" && accrual.promoCode ? (
          <Link href={documentOperationsHref(accrual.promoCode)} className={focus.primaryLink}>
            Все операции по документу <span aria-hidden="true">↗</span>
          </Link>
        ) : linkedPurchaseState === "loading" ? (
          <p className={focus.heroNote}>Проверяем связанную покупку…</p>
        ) : (
          <p className={focus.heroNote}>Связанная покупка недоступна в загруженных данных.</p>
        )}

        {accrual.items.length ? (
          <div className={focus.itemsSection}>
            <h2>Позиции</h2>
            {accrual.items.map((item, index) => (
              <div key={`${item.categoryLabel}-${index}`} className={focus.itemRow}>
                <strong>{displayCategoryLabelFromStored(item.categoryLabel)}</strong>
                <span>
                  {item.bonusPercent}% от {formatMoneyRub(item.amount)} → {formatMoneyRub(item.bonusAmount)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <details className={focus.technical}>
          <summary>Номер начисления</summary>
          <p>{accrual.id}</p>
        </details>
      </article>

      {canRecordPayout && payoutActions ? (
        <div className={focus.actionsRow}>
          <Button type="button" onClick={() => setPayoutModalOpen(true)}>
            Зафиксировать выплату
          </Button>
        </div>
      ) : null}

      {payoutModalOpen && canRecordPayout && payoutActions && accrual ? (
        <PayoutRecordModal
          target={{
            bonusId: accrual.id,
            counterpartyName: accrual.counterpartyName,
            amount: accrual.amount,
            basis: accrual.promoCode
              ? `Сертификат ${accrual.promoCode}`
              : `Начисление ${accrual.id.slice(-8)}`,
            payoutActions,
          }}
          onClose={() => setPayoutModalOpen(false)}
          onSuccess={async () => {
            await load();
            setPayoutModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
