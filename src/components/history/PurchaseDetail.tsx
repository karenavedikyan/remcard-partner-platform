"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { displayCategoryLabelFromStored } from "@/lib/category-display";
import { accrualDetailHref } from "@/lib/accrual-type";
import { presentAccrualRow } from "@/lib/history-accrual-display";
import { documentOperationsHref, formatMoneyRub } from "@/lib/history-format";
import {
  bonusStatusLabel,
  bonusStatusTone,
  purchaseOrderStatusLabel,
  purchaseOrderStatusTone,
  purchaseRowDateLabel,
} from "@/lib/history-labels";
import { findAccrualsForPurchase } from "@/lib/history-links";
import { fetchAccrualRows, fetchPurchaseByOrderId } from "@/lib/history-loader";
import type { AccrualRow, PurchaseItemRow, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PurchaseAppealReturnLink } from "@/components/history/PurchaseAppealReturnLink";
import { PurchaseReceivingClientPanel } from "@/components/history/PurchaseReceivingClientPanel";
import { RewardLifecyclePanel } from "@/components/settlements/RewardLifecyclePanel";
import styles from "./PurchaseDetail.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoneyHero(value: number): { amount: string; symbol: string } {
  const hasFraction = Math.abs(value - Math.round(value)) > 1e-9;
  const amount = hasFraction
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString("ru-RU");
  return { amount, symbol: "₽" };
}

function itemIssuerRewardCopy(item: PurchaseItemRow): string | null {
  const issuerPercent = item.issuerPercent;
  const issuerAmount = item.issuerAmount;
  if (
    issuerPercent != null &&
    Number.isFinite(issuerPercent) &&
    issuerAmount != null &&
    Number.isFinite(issuerAmount)
  ) {
    return `${formatMoneyRub(item.amount)} × ${issuerPercent}% = ${formatMoneyRub(issuerAmount)}`;
  }
  if (issuerPercent != null && Number.isFinite(issuerPercent)) {
    return `Ставка ${issuerPercent}%. Сохранённая сумма по категории недоступна.`;
  }
  if (issuerAmount != null && Number.isFinite(issuerAmount)) {
    return `Сохранённая сумма: ${formatMoneyRub(issuerAmount)}`;
  }
  return null;
}

function categoryBreakdownHint(items: PurchaseItemRow[]): string {
  if (!items.length) return "";
  const labels = items.map((item) => displayCategoryLabelFromStored(item.categoryLabel));
  const visible = labels.slice(0, 3).join(", ");
  return labels.length > 3 ? `${visible}…` : visible;
}

function directionLabel(purchase: PurchaseRow): string {
  return purchase.direction === "accepted" ? "Принято у меня" : "По моей рекомендации";
}

function rewardHero(purchase: PurchaseRow): {
  kind: "stored" | "zero" | "unavailable" | "selfScan";
  value?: number;
} {
  if (purchase.isSelfScan) return { kind: "selfScan" };
  if (purchase.proBonus == null || !Number.isFinite(purchase.proBonus)) {
    return { kind: "unavailable" };
  }
  if (purchase.proBonus === 0) return { kind: "zero" };
  return { kind: "stored", value: purchase.proBonus };
}

function ChevronDown() {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m8 10 4 4 4-4" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m-5-5 5 5-5 5"
      />
    </svg>
  );
}

type PurchaseDetailProps = {
  user: AuthUser;
  purchaseId: string;
  promoHint?: string;
};

export function PurchaseDetail({ user, purchaseId, promoHint }: PurchaseDetailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseRow | null>(null);
  const [linkedAccruals, setLinkedAccruals] = useState<AccrualRow[]>([]);
  const [accrualWarning, setAccrualWarning] = useState("");
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    setAccessDenied(false);
    setPurchase(null);
    setLinkedAccruals([]);
    setAccrualWarning("");
    try {
      const row = await fetchPurchaseByOrderId(purchaseId, user);
      if (version !== loadVersion.current) return;
      if (!row) {
        setPurchase(null);
        setLinkedAccruals([]);
        setAccessDenied(true);
        return;
      }

      setPurchase(row);
      try {
        const accruals = await fetchAccrualRows();
        if (version !== loadVersion.current) return;
        setLinkedAccruals(findAccrualsForPurchase(row, accruals));
      } catch {
        if (version !== loadVersion.current) return;
        setAccrualWarning(
          "Покупка загружена, но связанные начисления сейчас недоступны. Суммы покупки не изменены.",
        );
      }
    } catch (caught) {
      if (version !== loadVersion.current) return;
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setAccessDenied(true);
        setPurchase(null);
        setLinkedAccruals([]);
        return;
      }
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить операцию",
      );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [user, purchaseId]);

  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
    };
  }, [load]);

  if (loading) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <Button onClick={() => void load()}>Повторить</Button>
        <PurchaseAppealReturnLink />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className={styles.empty}>
        <p>
          {accessDenied
            ? "Нет доступа к этой покупке или заказ не найден."
            : "Операция не найдена в доступных источниках."}
        </p>
        {promoHint ? (
          <Link href={documentOperationsHref(promoHint)}>
            Все операции по документу {promoHint}
          </Link>
        ) : null}
        <PurchaseAppealReturnLink />
        <Link href="/history">← К истории</Link>
      </div>
    );
  }

  const orderStatus = purchaseOrderStatusLabel(purchase);
  const hero = rewardHero(purchase);
  const breakdownHint = categoryBreakdownHint(purchase.items);
  const documentCode = purchase.promoCode ?? "Документ";
  return (
    <section className={styles.page} aria-labelledby="purchase-detail-title">
      <nav className={styles.pageNav} aria-label="Навигация по истории">
        <Link className={styles.backLink} href="/history">
          ← К истории
        </Link>
        <PurchaseAppealReturnLink linkClassName={styles.backLink} />
      </nav>

      <div className={styles.titleRow}>
        <h1 id="purchase-detail-title">Детали операции</h1>
      </div>

      <p className={styles.document}>
        <strong>{documentCode}</strong>
        <span className={styles.documentSep} aria-hidden="true">
          ·
        </span>
        <span>{directionLabel(purchase)}</span>
        {orderStatus ? (
          <>
            <span className={styles.documentSep} aria-hidden="true">
              ·
            </span>
            <span>{orderStatus}</span>
          </>
        ) : null}
      </p>

      <div className={styles.receipt}>
        <section className={styles.focus} aria-labelledby="purchase-reward-label">
          <h2 id="purchase-reward-label" className={styles.focusLabel}>
            Вознаграждение по операции
          </h2>
          {hero.kind === "stored" && hero.value != null ? (
            <p className={styles.accrualAmount}>
              {formatMoneyHero(hero.value).amount}{" "}
              <span>{formatMoneyHero(hero.value).symbol}</span>
            </p>
          ) : (
            <p className={styles.accrualUnavailable}>
              {hero.kind === "selfScan"
                ? "Начисление по операции не предусмотрено"
                : hero.kind === "zero"
                  ? "Сохранённое начисление: 0 ₽"
                  : "Сохранённое начисление недоступно"}
            </p>
          )}
          <p className={styles.focusNote}>
            {hero.kind === "stored" ? (
              <>
                Начисление сохранено.
                <br />
                Статус выплаты здесь не указан.
              </>
            ) : hero.kind === "selfScan" ? (
              "Самосканирование — без начисления профклиенту."
            ) : hero.kind === "zero" ? (
              "Статус выплаты здесь не указан."
            ) : (
              "Данные о сохранённом начислении не получены."
            )}
          </p>
        </section>

        <p className={styles.purchaseContext}>
          <span>К оплате за покупку</span>
          <strong className={styles.payable}>{formatMoneyRub(purchase.payableAmount)}</strong>
        </p>

        <p className={styles.participants}>
          Партнёр <strong>{purchase.partnerName}</strong>
          {purchase.executorName ? (
            <>
              <span className={styles.participantsDot} aria-hidden="true">
                ·
              </span>
              Исполнитель <strong>{purchase.executorName}</strong>
            </>
          ) : null}
        </p>

        <details className={styles.breakdown}>
          <summary>
            <span>
              <span className={styles.breakdownLabel}>Состав и расчёт</span>
              {breakdownHint ? (
                <span className={styles.breakdownHint}>{breakdownHint}</span>
              ) : null}
            </span>
            <ChevronDown />
          </summary>
          <div className={styles.breakdownBody}>
            <div className={styles.metaBlock}>
              {purchase.orderId ? (
                <p>
                  Заказ №<span className={styles.metaInk}>{purchase.orderId}</span>
                </p>
              ) : (
                <p>Номер заказа недоступен</p>
              )}
              <p>
                {purchaseRowDateLabel(purchase)}:{" "}
                <span className={styles.metaInk}>{formatDate(purchase.createdAt)}</span>
              </p>
              {purchase.clientName ? (
                <p>
                  Клиент документа: <span className={styles.metaInk}>{purchase.clientName}</span>
                </p>
              ) : null}
              {purchase.branchName ? (
                <p>
                  Филиал: <span className={styles.metaInk}>{purchase.branchName}</span>
                </p>
              ) : null}
              {purchase.source === "accepted-bonus" ? (
                <p>
                  Данные из старого формата начислений. Полный статус заказа — в разделе «Принято
                  у меня».
                </p>
              ) : null}
              {orderStatus ? (
                <p>
                  Статус заказа:{" "}
                  <StatusBadge
                    label={orderStatus}
                    tone={purchaseOrderStatusTone(purchase)}
                  />
                </p>
              ) : null}
              {purchase.source === "accepted-bonus" && purchase.bonusStatus ? (
                <p>
                  Статус начисления профклиенту:{" "}
                  <StatusBadge
                    label={bonusStatusLabel(purchase.bonusStatus)}
                    tone={bonusStatusTone(purchase.bonusStatus)}
                  />
                </p>
              ) : null}
            </div>

            {purchase.orderId ? (
              <div className={styles.lifecycleSlot}>
                <RewardLifecyclePanel orderId={purchase.orderId} />
              </div>
            ) : null}

            <dl className={styles.totalLines}>
              <div>
                <dt>До скидки</dt>
                <dd>{formatMoneyRub(purchase.totalAmount)}</dd>
              </div>
              <div>
                <dt>Скидка клиенту</dt>
                <dd>−{formatMoneyRub(purchase.discountAmount)}</dd>
              </div>
            </dl>

            {purchase.items.map((item) => {
              const label = displayCategoryLabelFromStored(item.categoryLabel);
              const issuerCopy = itemIssuerRewardCopy(item);
              return (
                <article key={`${item.categoryLabel}-${item.amount}`} className={styles.item}>
                  <h3>{label}</h3>
                  <div className={styles.calcContent}>
                    <dl>
                      <div>
                        <dt>Сумма до скидки</dt>
                        <dd>{formatMoneyRub(item.amount)}</dd>
                      </div>
                      {item.discountPercent != null && Number.isFinite(item.discountPercent) ? (
                        <div>
                          <dt>Скидка</dt>
                          <dd>{item.discountPercent}%</dd>
                        </div>
                      ) : null}
                      {issuerCopy ? (
                        <div>
                          <dt>Вознаграждение</dt>
                          <dd>{issuerCopy}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </article>
              );
            })}

            {purchase.items.length ? (
              <p className={styles.breakdownNote}>
                Сохранённые суммы и ставки показаны как в данных операции. Статус выплаты здесь
                не указан.
              </p>
            ) : null}

            {linkedAccruals.length ? (
              <div className={styles.linkedSection}>
                <h3>Связанные начисления</h3>
                {linkedAccruals.map((accrual) => {
                  const presentation = presentAccrualRow(accrual);
                  const typeLabel =
                    accrual.accrualType === "agentBonus"
                      ? "Агентский бонус"
                      : "Бонус профклиента";
                  return (
                    <Link
                      key={`${accrual.accrualType}-${accrual.id}`}
                      href={accrualDetailHref(accrual.id, accrual.accrualType)}
                      className={styles.linkedRow}
                    >
                      <span>
                        <span className={styles.metaInk}>
                          {formatMoneyRub(presentation.heroAmount)}
                        </span>
                        <p className={styles.linkedMeta}>
                          {typeLabel} · {formatDate(accrual.createdAt)}
                        </p>
                      </span>
                      <StatusBadge
                        label={presentation.statusLabel}
                        tone={presentation.statusTone}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {purchase.direction === "accepted" && purchase.canManageReceivingClient ? (
              <div className={styles.receivingSlot}>
                <PurchaseReceivingClientPanel
                  purchase={purchase}
                  onReload={() => void load()}
                  onLinked={({
                    orderId: linkedOrderId,
                    receivingClient,
                    receivingLinkRevision,
                  }) => {
                    setPurchase((prev) => {
                      if (!prev || (prev.orderId ?? prev.id) !== linkedOrderId) return prev;
                      return {
                        ...prev,
                        receivingClient,
                        receivingLinkRevision,
                      };
                    });
                  }}
                />
              </div>
            ) : null}
          </div>
        </details>

        {purchase.promoCode && !purchase.isSelfScan ? (
          <div className={styles.summaryActions}>
            <Link
              className={styles.docLink}
              href={documentOperationsHref(purchase.promoCode)}
            >
              Все операции по документу
              <ArrowRight />
            </Link>
          </div>
        ) : null}
      </div>

      {accrualWarning ? (
        <p className={styles.warning} role="status">
          {accrualWarning}
        </p>
      ) : null}
    </section>
  );
}
