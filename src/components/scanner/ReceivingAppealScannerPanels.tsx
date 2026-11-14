"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { receivingAppealReturnHref } from "@/components/clients/receiving/receiving-detail-actions-contract";
import { receivingAppealPurchaseDetailHrefForReturn } from "@/lib/scanner/receiving-appeal-handoff";
import type { ReceivingAppealScannerContext } from "@/lib/scanner/receiving-appeal-handoff";
import type { ReceivingAppealLinkPhase } from "./useReceivingAppealScannerHandoff";
import styles from "./scanner.module.css";

type BannerProps = {
  context: ReceivingAppealScannerContext;
  appealId: string | null;
};

type CertEntryAlertProps = { message: string | null | undefined };

export function ReceivingAppealCertEntryAlert({ message }: CertEntryAlertProps) {
  const text = message?.trim();
  if (!text) return null;
  return (
    <div
      className={styles.card}
      style={{ marginBottom: "var(--space-4)" }}
      role="alert"
      data-testid="ca-scanner-cert-entry-error"
    >
      <p className={styles.meta}>{text}</p>
    </div>
  );
}

export function ReceivingAppealScannerBanner({ context, appealId }: BannerProps) {
  if (context.status === "invalid_param") {
    return (
      <div className={styles.card} role="alert" data-testid="ca-scanner-receiving-context-invalid">
        <p className={styles.meta}>{context.message}</p>
        <Link href="/clients" className={styles.openHistoryLink}>
          К клиентам
        </Link>
      </div>
    );
  }

  if (!appealId) return null;

  if (context.status === "loading") {
    return (
      <p className={styles.meta} data-testid="ca-scanner-receiving-context-loading">
        Загружаем обращение…
      </p>
    );
  }

  if (context.status === "ready") {
    return (
      <div className={styles.card} style={{ marginBottom: "var(--space-4)" }} data-testid="ca-scanner-receiving-context-ready">
        <p className={styles.meta}>
          Оформление покупки для обращения «{context.clientLabel}»
          {context.certificateId ? " — требуется документ этого сертификата." : " — введите или отсканируйте документ клиента."}
        </p>
        {context.purchaseOrderId ? (
          <p className={styles.meta}>
            Заказ уже привязан:{" "}
            <Link
              href={receivingAppealPurchaseDetailHrefForReturn(
                context.purchaseOrderId,
                context.appealId,
              )}
            >
              {context.purchaseOrderId}
            </Link>
          </p>
        ) : null}
        <Link href={receivingAppealReturnHref(context.appealId)} className={styles.openHistoryLink}>
          Вернуться к обращению
        </Link>
      </div>
    );
  }

  const messages: Record<string, string> = {
    forbidden: "Нет доступа к этому обращению.",
    not_found: "Обращение не найдено.",
    blocked: "Сервис обращений недоступен.",
    error: "Не удалось загрузить обращение.",
  };
  const status = context.status;
  const message =
    status in messages ? messages[status] : "Контекст обращения недоступен.";

  return (
    <div
      className={styles.card}
      style={{ marginBottom: "var(--space-4)" }}
      role="alert"
      data-testid="ca-scanner-receiving-context-error"
    >
      <p className={styles.meta}>{context.status === "error" ? context.message : message}</p>
      <Link href="/clients" className={styles.openHistoryLink}>
        К клиентам
      </Link>
    </div>
  );
}

type SuccessLinkProps = {
  appealId: string;
  orderId: string;
  linkPhase: ReceivingAppealLinkPhase;
  linkError: string;
  onRetryLink: () => void;
};

export function ReceivingAppealScannerSuccessLinkPanel({
  appealId,
  orderId,
  linkPhase,
  linkError,
  onRetryLink,
}: SuccessLinkProps) {
  const returnHref = receivingAppealReturnHref(appealId);
  const purchaseHref = receivingAppealPurchaseDetailHrefForReturn(orderId, appealId);

  if (linkPhase === "linked") {
    return (
      <div className={styles.actionsRow} style={{ marginTop: "var(--space-4)" }} data-testid="ca-scanner-receiving-link-linked">
        <p className={styles.meta}>Заказ привязан к обращению.</p>
        <Link href={returnHref} className={styles.openHistoryLink}>
          Вернуться к обращению
        </Link>
        <Link href={purchaseHref} className={styles.openHistoryLink}>
          Открыть покупку
        </Link>
      </div>
    );
  }

  if (linkPhase === "linking" || linkPhase === "pending") {
    return (
      <p className={styles.meta} style={{ marginTop: "var(--space-4)" }} data-testid="ca-scanner-receiving-link-progress">
        Покупка создана. Привязываем заказ к обращению…
      </p>
    );
  }

  if (linkPhase === "failed" || linkPhase === "conflict") {
    return (
      <div style={{ marginTop: "var(--space-4)" }} data-testid="ca-scanner-receiving-link-failed">
        <p className={styles.meta} role="alert">
          Покупка уже создана (заказ {orderId}), но привязка к обращению не выполнена.
          {linkError ? ` ${linkError}` : ""}
        </p>
        <div className={styles.actionsRow}>
          <Button type="button" onClick={onRetryLink}>
            Повторить привязку
          </Button>
          <Link href={returnHref} className={styles.openHistoryLink}>
            К обращению
          </Link>
          <Link href={purchaseHref} className={styles.openHistoryLink}>
            Открыть покупку
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
