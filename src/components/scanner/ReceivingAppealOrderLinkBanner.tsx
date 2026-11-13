"use client";

import Link from "next/link";
import { receivingAppealReturnHref } from "@/lib/clients-parity/receiving-appeal-routes";
import {
  RECEIVING_ORDER_LINK_ORDER_EXISTS_NOTICE,
  RECEIVING_ORDER_LINK_RETRY_NOTICE,
} from "@/lib/clients-parity/receiving-order-link-client";
import { Button } from "@/components/ui/Button";

type Props = {
  appealId: string;
  orderId: string;
  linking: boolean;
  linkError: string | null;
  linked: boolean;
  onRetryLink: () => void;
};

export function ReceivingAppealOrderLinkBanner({
  appealId,
  orderId,
  linking,
  linkError,
  linked,
  onRetryLink,
}: Props) {
  if (linked) {
    return (
      <div data-testid="ca-receiving-order-link-success" className="scanner-hint">
        <p>Обращение связано с заказом {orderId}.</p>
        <Link href={receivingAppealReturnHref(appealId)} className="btn primary">
          Вернуться к обращению
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="ca-receiving-order-link-panel" className="scanner-hint">
      <p>{RECEIVING_ORDER_LINK_ORDER_EXISTS_NOTICE}</p>
      {linkError ? <p role="alert">{RECEIVING_ORDER_LINK_RETRY_NOTICE}</p> : null}
      {linkError ? (
        <p role="status" data-testid="ca-receiving-order-link-error">
          {linkError}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button
          type="button"
          variant="primary"
          disabled={linking}
          data-testid="ca-receiving-order-link-retry"
          onClick={onRetryLink}
        >
          {linking ? "Привязка…" : "Повторить привязку"}
        </Button>
        <Link href={receivingAppealReturnHref(appealId)} className="btn ghost">
          Вернуться к обращению
        </Link>
      </div>
    </div>
  );
}
