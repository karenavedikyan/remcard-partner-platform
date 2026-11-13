import {
  linkReceivingAppealOrder,
  type LinkReceivingAppealOrderInput,
  type LinkReceivingAppealOrderSuccess,
  type OrderLinkRepository,
} from "./orderLink";
import { OrderLinkError } from "./orderLink.types";

export type OrderLinkRequestBody = {
  orderId?: unknown;
  expectedRevision?: unknown;
};

export type OrderLinkTrustedGate = Omit<
  LinkReceivingAppealOrderInput,
  "appealId" | "orderId" | "expectedRevision"
>;

export function parseOrderLinkRequestBody(raw: unknown): { orderId: string; expectedRevision: number } {
  if (!raw || typeof raw !== "object") {
    throw new OrderLinkError(400, "VALIDATION", "Некорректное тело запроса.");
  }
  const body = raw as OrderLinkRequestBody;
  if (typeof body.orderId !== "string" || !body.orderId.trim()) {
    throw new OrderLinkError(400, "VALIDATION", "orderId обязателен.");
  }
  if (typeof body.expectedRevision !== "number" || !Number.isFinite(body.expectedRevision)) {
    throw new OrderLinkError(400, "VALIDATION", "expectedRevision обязателен.");
  }
  return { orderId: body.orderId.trim(), expectedRevision: body.expectedRevision };
}

/** K1 handler surface (source-only). Wire to navigator route; no DB in this export. */
export async function handleReceivingAppealOrderLinkPost(
  appealId: string,
  rawBody: unknown,
  gate: OrderLinkTrustedGate,
  repo: OrderLinkRepository,
): Promise<
  | { ok: true; status: 200; body: LinkReceivingAppealOrderSuccess }
  | { ok: false; status: number; body: { error: string; code: string } }
> {
  try {
    const { orderId, expectedRevision } = parseOrderLinkRequestBody(rawBody);
    const trimmedAppealId = appealId.trim();
    if (!trimmedAppealId) {
      throw new OrderLinkError(400, "VALIDATION", "appealId обязателен.");
    }
    const result = await linkReceivingAppealOrder(
      {
        appealId: trimmedAppealId,
        orderId,
        expectedRevision,
        ...gate,
      },
      repo,
    );
    return { ok: true, status: 200, body: result };
  } catch (err) {
    if (err instanceof OrderLinkError) {
      return { ok: false, status: err.status, body: err.toBody() };
    }
  }
  return {
    ok: false,
    status: 500,
    body: { error: "Internal error", code: "INTERNAL" },
  };
}
