import { remcardFetch } from "@/lib/api-client";
import type { ReceivingClientLinkSnapshot } from "@/lib/history-types";

export function patchStoreOrderReceivingClient(
  orderId: string,
  body:
    | { action: "link"; agentClientId: string; expectedVersion: number }
    | { action: "unlink"; expectedVersion: number },
) {
  return remcardFetch<{
    receivingClient: ReceivingClientLinkSnapshot | null;
    receivingLinkRevision: number;
  }>(
    `/api/store/orders/${encodeURIComponent(orderId)}/receiving-client`,
    { method: "PATCH", body },
  );
}
