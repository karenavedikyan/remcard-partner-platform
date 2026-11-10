"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { displayCategoryLabelFromStored } from "@/lib/category-display";
import { documentOperationsHref, formatMoneyRub } from "@/lib/history-format";
import {
  accrualScopeLabel,
  bonusStatusLabel,
  bonusStatusTone,
} from "@/lib/history-labels";
import { findPurchaseForAccrual, purchaseDetailHref } from "@/lib/history-links";
import {
  fetchAccrualById,
  fetchPurchaseByOrderId,
  fetchPurchaseRows,
} from "@/lib/history-loader";
import type { AccrualRow, AccrualType, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PayoutRecordModal } from "@/components/payout/PayoutRecordModal";
import { fetchBonusPayoutActions, type SettlementPayoutActions } from "@/lib/payout-record";
import focus from "./history-focus.module.css";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accrual, setAccrual] = useState<AccrualRow | null>(null);
  const [linkedPurchase, setLinkedPurchase] = useState<PurchaseRow | null>(null);
  const [linkedPurchaseState, setLinkedPurchaseState] = useState<"unknown" | "loading" | "found" | "missing">(
    "unknown",
  );
  const [payoutActions, setPayoutActions] = useState<SettlementPayoutActions | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

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
  }, [user, accrualId, accrualType]);

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

  const hero = splitHeroAmount(accrual.amount);
  const storedZero = accrual.amount === 0;

  return (
    <div className={focus.page}>
      <Link href="/history" className={focus.backLink}>
        ← К истории
      </Link>

      <div className={focus.detailHeading}>
        <h1>Детали начисления</h1>
        <StatusBadge label={bonusStatusLabel(accrual.status)} tone={bonusStatusTone(accrual.status)} />
      </div>

      <article className={focus.receipt}>
        <div className={focus.receiptFocus}>
          <p className={focus.receiptFocusLabel}>{accrualFocusLabel(accrual)}</p>
          <p className={focus.heroAmount}>
            {hero.amount} <span>{hero.symbol}</span>
          </p>
          <p className={focus.heroNote}>
            Сохранённая сумма начисления, не сумма покупки.
            {storedZero ? " Нулевая сумма сохранена в данных операции." : null}
          </p>
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

      {payoutActions ? (
        <div className={focus.actionsRow}>
          <Button type="button" onClick={() => setPayoutModalOpen(true)}>
            Зафиксировать выплату
          </Button>
        </div>
      ) : null}

      {payoutModalOpen && payoutActions && accrual ? (
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
