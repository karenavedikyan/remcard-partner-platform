/**
 * User-visible copy for receiving appeal detail (prototype @ 3dc31836).
 * Technical contracts live in `receiving-detail-actions-contract.ts` / audit only.
 */

/** prototype notes textarea placeholder */
export const RECEIVING_DETAIL_NOTES_PLACEHOLDER = "Только для вашей команды";

export const RECEIVING_DETAIL_NOTES_SAVE_LABEL = "Сохранить";

export const RECEIVING_DETAIL_PURCHASE_HEADING = "Покупка";

/** prototype `renderPurchaseSideCard` */
export const RECEIVING_DETAIL_PURCHASE_MORE_LABEL = "Подробнее о покупке";

/** prototype `renderNextStepCard` — opens pay panel, not direct stage paid */
export const RECEIVING_DETAIL_MARK_PAID_LABEL = "Отметить оплату";

export const RECEIVING_DETAIL_STAGE_SHIPPED_LABEL = "Отметить отгрузку";

export const RECEIVING_DETAIL_STAGE_APPLY_LABEL = "Перевести";

export const RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL = "Обновить карточку";

/** When host did not wire order/scanner navigation yet */
export const RECEIVING_DETAIL_MARK_PAID_UNAVAILABLE =
  "Оплата отмечается в кошельке при оформлении покупки — не из этой карточки.";

export const RECEIVING_DETAIL_PURCHASE_UNAVAILABLE =
  "Покупка появится здесь после оформления оплаты в кошельке.";

export const RECEIVING_DETAIL_PURCHASE_LINK_PENDING =
  "Покупка привязана к заказу. Откройте её из раздела покупок в кошельке.";

/** K1 message surfaced to user (stageRules shipped guard) */
export const RECEIVING_DETAIL_SHIPPED_UNAVAILABLE =
  "Сначала зафиксируйте оплату — покупка в кошельке.";

export const RECEIVING_DETAIL_MANUAL_CERT_NOTE =
  "Без сертификата — направившего и скидки нет.";
