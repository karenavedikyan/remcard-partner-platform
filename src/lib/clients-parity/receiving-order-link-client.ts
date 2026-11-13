import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { LinkReceivingAppealOrderSuccess } from "@/lib/clientAppeals/orderLink.types";

export type PostReceivingAppealOrderLinkResult =
  | { ok: true; data: LinkReceivingAppealOrderSuccess }
  | { ok: false; status: number; code: string; message: string };

export async function postReceivingAppealOrderLink(
  appealId: string,
  body: { orderId: string; expectedRevision: number },
): Promise<PostReceivingAppealOrderLinkResult> {
  const trimmed = appealId.trim();
  if (!trimmed) {
    return { ok: false, status: 400, code: "VALIDATION", message: "appealId обязателен." };
  }
  try {
    const data = await remcardFetch<LinkReceivingAppealOrderSuccess>(
      `/api/pro/client-appeals/${encodeURIComponent(trimmed)}/order-link`,
      {
        method: "POST",
        requireCsrf: true,
        body,
      },
    );
    return { ok: true, data };
  } catch (err) {
    if (err instanceof RemcardApiError) {
      const code = err.body?.code?.trim() || "ERROR";
      const message =
        err.body?.error?.trim() || err.body?.message?.trim() || err.message || "Ошибка связи.";
      return { ok: false, status: err.status, code, message };
    }
    return { ok: false, status: 0, code: "NETWORK", message: "Сетевая ошибка." };
  }
}

export const RECEIVING_ORDER_LINK_RETRY_NOTICE =
  "Покупка сохранена, но связь с обращением не выполнена. Повторите только привязку — новый заказ не создаётся.";

export const RECEIVING_ORDER_LINK_ORDER_EXISTS_NOTICE =
  "Заказ уже существует в системе. Нажмите «Повторить привязку», чтобы связать его с обращением.";
