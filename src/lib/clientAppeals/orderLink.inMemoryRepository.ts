import type {
  LinkReceivingAppealOrderSuccess,
  OrderLinkRepository,
  ReceivingAppealWriteRow,
  ReceivingOrderRow,
} from "./orderLink.types";

/** Synthetic QA repository only — not for production DB. */
export function createInMemoryOrderLinkRepository(seed: {
  appeals: Record<string, ReceivingAppealWriteRow>;
  orders: Record<string, ReceivingOrderRow>;
}): {
  repo: OrderLinkRepository;
  appeals: Record<string, ReceivingAppealWriteRow>;
} {
  const appeals = structuredClone(seed.appeals);
  const orders = structuredClone(seed.orders);

  const repo: OrderLinkRepository = {
    async loadAppealForWrite(appealId) {
      return appeals[appealId] ?? null;
    },
    async loadOrder(orderId) {
      return orders[orderId] ?? null;
    },
    async linkAppealOrder({ appeal, order, expectedRevision }) {
      const current = appeals[appeal.appealId];
      if (!current || current.revision !== expectedRevision) {
        throw new Error("unexpected revision in tx");
      }
      if (current.orderId === order.orderId) {
        return {
          appealId: current.appealId,
          orderId: order.orderId,
          revision: current.revision,
          alreadyLinked: true,
        };
      }
      const nextRevision = current.revision + 1;
      appeals[appeal.appealId] = {
        ...current,
        orderId: order.orderId,
        revision: nextRevision,
      };
      const body: LinkReceivingAppealOrderSuccess = {
        appealId: appeal.appealId,
        orderId: order.orderId,
        revision: nextRevision,
        alreadyLinked: false,
      };
      return body;
    },
  };

  return { repo, appeals };
}
