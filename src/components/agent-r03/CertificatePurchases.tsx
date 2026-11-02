"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CertificatePurchase } from "@/lib/certificate-types";
import { formatMoneyRub } from "@/lib/history-format";
import { orderStatusLabel } from "@/lib/history-labels";
import { displayCategoryLabelFromStored } from "@/lib/category-display";
import styles from "./certificate-purchases.module.css";

function date(at: string) {
  return `${new Date(at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`;
}

function Purchase({ order, expanded, promoCode }: {
  order: CertificatePurchase; expanded: boolean; promoCode: string;
}) {
  const href = `/history/purchases/${encodeURIComponent(order.id)}?promo=${encodeURIComponent(promoCode)}`;
  return <article className={styles.purchase}>
    <h3>Покупка от {date(order.createdAt)}</h3>
    <p>Партнёр: {order.certificatePartner?.storeName?.trim() || "Название не сохранено"}</p>
    <p>Статус покупки: {orderStatusLabel(order.status)}</p>
    <p>Сумма после скидки: <strong>{formatMoneyRub(order.totalAmount - order.discountAmount)}</strong></p>
    <details open={expanded}>
      <summary>Подробности покупки</summary>
      <div className={styles.details}>
        <p className={styles.orderId}>Номер покупки: {order.id}</p>
        <dl className={styles.totals}>
          <div><dt>Сумма до скидки</dt><dd>{formatMoneyRub(order.totalAmount)}</dd></div>
          <div><dt>Скидка клиенту</dt><dd>{formatMoneyRub(order.discountAmount)}</dd></div>
          <div><dt>Сумма после скидки</dt><dd>{formatMoneyRub(order.totalAmount - order.discountAmount)}</dd></div>
        </dl>
        {order.isSelfScan ? <p>Самосканирование: вознаграждение не начисляется.</p> : <>
          <p>Сохранённая сумма вознаграждения: <strong>{formatMoneyRub(order.proBonus)}</strong></p>
          <p className={styles.note}>Эта сумма не означает подтверждение или получение денег. Сроки, текущий статус начисления и расчёты доступны в полной карточке покупки.</p>
        </>}
        <h4>Категории и условия на момент покупки</h4>
        {order.items.length ? order.items.map(item => {
          // Mirror the server's historical issuer fallback: pro + agent, not either/or.
          const rate = Math.max(0, Math.min(100, Math.round((item.issuerPercent ??
            ((item.proBonusPercent ?? 0) + (item.agentBonusPercent ?? 0))) * 100) / 100));
          const reward = Math.max(0, Math.round(item.issuerAmount ??
            ((item.proBonusAmount ?? 0) + (item.agentBonusAmount ?? 0))));
          return <section key={item.id} className={styles.line}>
            <h5>{displayCategoryLabelFromStored(item.categoryLabel || item.category)}</h5>
            <p>До скидки: {formatMoneyRub(item.amount)}</p>
            <p>Скидка: {item.discountPercent}% ({formatMoneyRub(item.discountAmount)})</p>
            <p>После скидки: {formatMoneyRub(item.amount - item.discountAmount)}</p>
            {!order.isSelfScan ? <p>Вознаграждение: {rate}% ({formatMoneyRub(reward)})</p> : null}
          </section>;
        }) : <p>Категории этой покупки не сохранены.</p>}
      </div>
    </details>
    <Link href={href} className={styles.open}>Открыть полную карточку покупки</Link>
  </article>;
}

export function CertificatePurchases({ orders, hasPurchases, promoCode, clientName }: {
  orders?: CertificatePurchase[]; hasPurchases: boolean; promoCode: string; clientName?: string | null;
}) {
  useEffect(() => {
    if (window.location.hash === "#certificate-purchases") {
      document.getElementById("certificate-purchases")?.scrollIntoView?.({ block: "start" });
    }
  }, [orders]);
  return <section id="certificate-purchases" className={styles.root} aria-labelledby="certificate-purchases-title">
    <h2 id="certificate-purchases-title">Покупки по сертификату{orders?.length ? ` (${orders.length})` : ""}</h2>
    {clientName ? <p>Клиент: {clientName}</p> : null}
    {!orders ? <p role="status">Список покупок недоступен. Обновите страницу или попробуйте позже.</p>
      : !orders.length ? <p>{hasPurchases
        ? "Есть использования сертификата, но связанные покупки не найдены. Подробности требуют сверки."
        : "По этому сертификату покупок пока нет."}</p>
      : orders.map(order => <Purchase key={order.id} order={order} expanded={orders.length === 1} promoCode={promoCode} />)}
  </section>;
}
