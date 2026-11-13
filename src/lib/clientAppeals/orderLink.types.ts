export type LinkReceivingAppealOrderSuccess = {
  appealId: string;
  orderId: string;
  revision: number;
  alreadyLinked: boolean;
};

export type OrderLinkErrorBody = {
  error: string;
  code: string;
};

export class OrderLinkError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, error: string) {
    super(error);
    this.name = "OrderLinkError";
    this.status = status;
    this.code = code;
  }

  toBody(): OrderLinkErrorBody {
    return { error: this.message, code: this.code };
  }
}

export type ReceivingAppealWriteRow = {
  appealId: string;
  revision: number;
  orderId: string | null;
  certificateId: string | null;
  lifecycle: "open" | "archived" | "trash" | "closed";
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
};

export type ReceivingOrderRow = {
  orderId: string;
  certificateId: string | null;
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
};

export type LinkReceivingAppealOrderInput = {
  appealId: string;
  orderId: string;
  expectedRevision: number;
  actorUserId: string;
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
};

export type OrderLinkRepository = {
  loadAppealForWrite(appealId: string): Promise<ReceivingAppealWriteRow | null>;
  loadOrder(orderId: string): Promise<ReceivingOrderRow | null>;
  linkAppealOrder(args: {
    appeal: ReceivingAppealWriteRow;
    order: ReceivingOrderRow;
    expectedRevision: number;
    actorUserId: string;
  }): Promise<LinkReceivingAppealOrderSuccess>;
};
