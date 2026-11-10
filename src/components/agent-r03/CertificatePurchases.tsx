"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CertificatePurchase } from "@/lib/certificate-types";
import { formatMoneyRub } from "@/lib/history-format";
import { orderStatusLabel } from "@/lib/history-labels";
import { PurchaseAccrualReceiptModal } from "./PurchaseAccrualReceiptModal";
import styles from "./certificate-purchases.module.css";

function date(at: string) {
  return new Date(at).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

function PurchaseRow({
  order,
  promoCode,
  onOpen,
}: {
  order: CertificatePurchase;
  promoCode: string;
  onOpen: (order: CertificatePurchase, opener: HTMLElement) => void;
}) {
  const paid = Math.max(0, order.totalAmount - order.discountAmount);
  return (
    <article className={styles.purchase}>
      <div className={styles.rowHead}>
        <div>
          <h3>Покупка от {date(order.createdAt)}</h3>
          <p className={styles.merchant}>
            {order.certificatePartner?.storeName?.trim() || "Название не сохранено"}
          </p>
          <p className={styles.meta}>
            {orderStatusLabel(order.status)} · Оплачено {formatMoneyRub(paid)}
          </p>
        </div>
      </div>
      <button
        type="button"
        className={styles.openReceipt}
        onClick={(event) => onOpen(order, event.currentTarget)}
      >
        Начисление · Подробнее
      </button>
      <Link
        href={`/history/purchases/${encodeURIComponent(order.id)}?promo=${encodeURIComponent(promoCode)}`}
        className={styles.open}
      >
        Полная карточка покупки
      </Link>
    </article>
  );
}

export function CertificatePurchases({ orders, hasPurchases, promoCode, clientName }: {
  orders?: CertificatePurchase[];
  hasPurchases: boolean;
  promoCode: string;
  clientName?: string | null;
}) {
  const [modalOrder, setModalOrder] = useState<CertificatePurchase | null>(null);
  const autoOpened = useRef(false);

  const openReceipt = useCallback((order: CertificatePurchase) => {
    setModalOrder(order);
  }, []);

  const handleOpen = useCallback(
    (order: CertificatePurchase, _opener: HTMLElement) => {
      openReceipt(order);
    },
    [openReceipt],
  );

  const closeReceipt = useCallback(() => {
    setModalOrder(null);
  }, []);

  useEffect(() => {
    if (window.location.hash === "#certificate-purchases") {
      document.getElementById("certificate-purchases")?.scrollIntoView?.({ block: "start" });
    }
  }, [orders]);

  useEffect(() => {
    if (autoOpened.current || !orders?.length) return;
    if (window.location.hash !== "#certificate-purchases") return;
    if (orders.length === 1) {
      autoOpened.current = true;
      openReceipt(orders[0]!);
    }
  }, [orders, openReceipt]);

  return (
    <section id="certificate-purchases" className={styles.root} aria-labelledby="certificate-purchases-title">
      <h2 id="certificate-purchases-title">
        Покупки по сертификату{orders?.length ? ` (${orders.length})` : ""}
      </h2>
      {clientName ? <p>Клиент: {clientName}</p> : null}
      {!orders ? (
        <p role="status">Список покупок недоступен. Обновите страницу или попробуйте позже.</p>
      ) : !orders.length ? (
        <p>
          {hasPurchases
            ? "Есть использования сертификата, но связанные покупки не найдены. Подробности требуют сверки."
            : "По этому сертификату покупок пока нет."}
        </p>
      ) : (
        orders.map((order) => (
          <PurchaseRow key={order.id} order={order} promoCode={promoCode} onOpen={handleOpen} />
        ))
      )}
      {modalOrder ? (
        <PurchaseAccrualReceiptModal
          key={modalOrder.id}
          open
          order={modalOrder}
          promoCode={promoCode}
          clientName={clientName}
          onClose={closeReceipt}
        />
      ) : null}
    </section>
  );
}
