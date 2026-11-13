import {
  LinkReceivingAppealOrderInput,
  LinkReceivingAppealOrderSuccess,
  OrderLinkError,
  OrderLinkRepository,
  type ReceivingAppealWriteRow,
} from "./orderLink.types";

function assertScopeMatch(
  input: LinkReceivingAppealOrderInput,
  appealPartnerUserId: string,
  orderPartnerUserId: string,
): void {
  if (input.receivingPartnerUserId !== appealPartnerUserId) {
    throw new OrderLinkError(403, "FORBIDDEN_SCOPE", "Нет доступа к обращению.");
  }
  if (orderPartnerUserId !== input.receivingPartnerUserId) {
    throw new OrderLinkError(403, "FORBIDDEN_ORDER_SCOPE", "Заказ вне контекста принимающей стороны.");
  }
}

function assertAppealLinkable(lifecycle: ReceivingAppealWriteRow["lifecycle"]): void {
  if (lifecycle === "trash" || lifecycle === "closed") {
    throw new OrderLinkError(400, "INVALID_APPEAL_STATE", "Нельзя связать заказ с архивным или удалённым обращением.");
  }
}

function assertCertificateMatch(appealCert: string | null, orderCert: string | null): void {
  if (!appealCert) return;
  const normalizedAppeal = appealCert.trim();
  if (!normalizedAppeal) return;
  if (!orderCert || orderCert.trim() !== normalizedAppeal) {
    throw new OrderLinkError(
      400,
      "CERTIFICATE_MISMATCH",
      "Сертификат заказа не совпадает с обращением.",
    );
  }
}

/**
 * K8 core: CAS link appeal.orderId + history in one repository transaction.
 * K1 passes trusted receiving write scope; never reads scope from POST body.
 */
export async function linkReceivingAppealOrder(
  input: LinkReceivingAppealOrderInput,
  repo: OrderLinkRepository,
): Promise<LinkReceivingAppealOrderSuccess> {
  const appealId = input.appealId.trim();
  const orderId = input.orderId.trim();
  if (!appealId || !orderId) {
    throw new OrderLinkError(400, "VALIDATION", "appealId и orderId обязательны.");
  }
  if (!Number.isFinite(input.expectedRevision) || input.expectedRevision < 0) {
    throw new OrderLinkError(400, "VALIDATION", "expectedRevision обязателен.");
  }

  const appeal = await repo.loadAppealForWrite(appealId);
  if (!appeal) {
    throw new OrderLinkError(404, "NOT_FOUND", "Обращение не найдено.");
  }

  assertScopeMatch(input, appeal.receivingPartnerUserId, appeal.receivingPartnerUserId);
  assertAppealLinkable(appeal.lifecycle);

  if (appeal.revision !== input.expectedRevision) {
    throw new OrderLinkError(409, "REVISION_CONFLICT", "Версия обращения изменилась. Обновите карточку.");
  }

  if (appeal.orderId) {
    if (appeal.orderId === orderId) {
      return {
        appealId,
        orderId,
        revision: appeal.revision,
        alreadyLinked: true,
      };
    }
    throw new OrderLinkError(
      409,
      "ORDER_ALREADY_LINKED",
      "Обращение уже связано с другим заказом.",
    );
  }

  const order = await repo.loadOrder(orderId);
  if (!order) {
    throw new OrderLinkError(404, "ORDER_NOT_FOUND", "Заказ не найден.");
  }

  assertScopeMatch(input, appeal.receivingPartnerUserId, order.receivingPartnerUserId);
  assertCertificateMatch(appeal.certificateId, order.certificateId);

  return repo.linkAppealOrder({
    appeal,
    order,
    expectedRevision: input.expectedRevision,
    actorUserId: input.actorUserId,
  });
}

export type { LinkReceivingAppealOrderInput, LinkReceivingAppealOrderSuccess, OrderLinkRepository };
