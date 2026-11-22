import { describe, expect, it } from "vitest";
import {
  buildSettlementsReturnPath,
  parseSettlementsPayoutSearchParams,
  sanitizePayoutFocusToken,
  settlementsConsentReturnSearchParams,
} from "./settlements-return-path";
import { sanitizeReturnTo } from "@/lib/auth-flow";

describe("buildSettlementsReturnPath", () => {
  it("defaults to /settlements without payout focus", () => {
    expect(buildSettlementsReturnPath({})).toBe("/settlements");
    expect(buildSettlementsReturnPath({ tab: "settlements" })).toBe("/settlements");
  });

  it("preserves payout tab and allowlisted focus params for deep links", () => {
    const path = buildSettlementsReturnPath({
      tab: "payouts",
      counterparty: "qa-partner",
      receipt: "qa-receipt",
    });
    expect(path).toBe("/settlements?tab=payouts&counterparty=qa-partner&receipt=qa-receipt");
    expect(sanitizeReturnTo(path)).toBe(path);
  });

  it("adds tab=payouts when focus ids are present without tab", () => {
    expect(
      buildSettlementsReturnPath({
        counterparty: "cp-1",
        request: "req-abc",
      }),
    ).toBe("/settlements?tab=payouts&counterparty=cp-1&request=req-abc");
  });

  it("drops invalid tokens and unrelated injection attempts", () => {
    expect(
      buildSettlementsReturnPath({
        tab: "payouts",
        counterparty: "good",
        receipt: "/evil",
      }),
    ).toBe("/settlements?tab=payouts&counterparty=good");
    expect(buildSettlementsReturnPath({ counterparty: "https://evil" })).toBe("/settlements");
  });

  it("does not forward unknown query keys", () => {
    const path = buildSettlementsReturnPath({
      tab: "payouts",
      counterparty: "qa-partner",
    });
    expect(path.includes("branchId")).toBe(false);
  });
});

describe("sanitizePayoutFocusToken", () => {
  it("accepts qa smoke ids", () => {
    expect(sanitizePayoutFocusToken("qa-receipt")).toBe("qa-receipt");
  });
});

describe("parseSettlementsPayoutSearchParams duplicate keys", () => {
  it("uses first scalar when tab is duplicated", () => {
    const payout = parseSettlementsPayoutSearchParams({
      tab: ["payouts", "payouts"],
      receipt: "qa-one",
    });
    expect(payout.tab).toBe("payouts");
    expect(payout.receipt).toBe("qa-one");
    expect(buildSettlementsReturnPath({ tab: ["payouts", "payouts"], receipt: "qa-one" })).toBe(
      "/settlements?tab=payouts&receipt=qa-one",
    );
  });

  it("drops later receipt values and keeps first valid focus field", () => {
    const payout = parseSettlementsPayoutSearchParams({
      tab: "payouts",
      receipt: ["qa-one", "qa-two"],
    });
    expect(payout.receipt).toBe("qa-one");
    expect(buildSettlementsReturnPath({ tab: "payouts", receipt: ["qa-one", "qa-two"] })).toBe(
      "/settlements?tab=payouts&receipt=qa-one",
    );
  });

  it("normalizes duplicated counterparty and request", () => {
    expect(
      parseSettlementsPayoutSearchParams({
        counterparty: ["cp-a", "cp-b"],
        request: ["req-1", "req-2"],
      }),
    ).toEqual({
      tab: "payouts",
      counterparty: "cp-a",
      request: "req-1",
      receipt: null,
    });
  });
});

describe("settlements session and consent return behavior", () => {
  it("builds consent redirect preserving payout receipt deep link", () => {
    const qs = settlementsConsentReturnSearchParams({
      tab: "payouts",
      counterparty: "qa-partner",
      receipt: "qa-receipt",
    });
    expect(qs.get("step")).toBe("consents");
    expect(qs.get("returnTo")).toBe(
      "/settlements?tab=payouts&counterparty=qa-partner&receipt=qa-receipt",
    );
  });

  it("signed-out SessionGate returnTo uses the same path as requireProPageUser", () => {
    const input = {
      tab: "payouts",
      counterparty: "qa-partner",
      receipt: "qa-receipt",
    };
    const returnPath = buildSettlementsReturnPath(input);
    expect(returnPath).not.toBe("/settlements");
    expect(sanitizeReturnTo(returnPath)).toBe(returnPath);
  });
});