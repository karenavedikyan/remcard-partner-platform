import { describe, expect, it } from "vitest";
import {
  buildReceivingAppealOrderPipelineHref,
  receivingAppealReturnHref,
  receivingAppealPurchaseDetailHref,
} from "./receiving-detail-actions-contract";

describe("P6 receiving URL builders", () => {
  it("pipeline href carries appealId only", () => {
    expect(buildReceivingAppealOrderPipelineHref("ap/1")).toBe("/scanner?appealId=ap%2F1");
  });

  it("return href is clients receiving tab + appealId", () => {
    expect(receivingAppealReturnHref("ap-99")).toBe(
      "/clients?direction=receiving&appealId=ap-99",
    );
  });

  it("purchase href carries appealId context query", () => {
    expect(receivingAppealPurchaseDetailHref("ord-7")).toBe("/history/purchases/ord-7");
    expect(receivingAppealPurchaseDetailHref("ord-7", "ap-1")).toBe(
      "/history/purchases/ord-7?appealId=ap-1",
    );
  });
});
