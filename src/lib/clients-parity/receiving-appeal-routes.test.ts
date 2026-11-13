import { describe, expect, it } from "vitest";
import {
  buildReceivingAppealOrderPipelineHref,
  parseReceivingAppealIdFromSearch,
  receivingAppealPurchaseDetailHrefWithReturn,
  receivingAppealReturnHref,
} from "./receiving-appeal-routes";

describe("receiving-appeal-routes", () => {
  it("buildReceivingAppealOrderPipelineHref encodes appealId", () => {
    expect(buildReceivingAppealOrderPipelineHref("ap/1")).toBe(
      "/scanner?appealId=ap%2F1",
    );
  });

  it("receivingAppealReturnHref uses receiving direction", () => {
    expect(receivingAppealReturnHref("ap-9")).toBe(
      "/clients?direction=receiving&appealId=ap-9",
    );
  });

  it("parseReceivingAppealIdFromSearch", () => {
    const params = new URLSearchParams("appealId= x ");
    expect(parseReceivingAppealIdFromSearch(params)).toBe("x");
  });

  it("purchase detail carries receivingAppealId return context", () => {
    expect(receivingAppealPurchaseDetailHrefWithReturn("ord-1", "ap-1")).toBe(
      "/history/purchases/ord-1?receivingAppealId=ap-1",
    );
  });
});
