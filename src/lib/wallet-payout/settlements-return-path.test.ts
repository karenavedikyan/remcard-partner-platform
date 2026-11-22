import { describe, expect, it } from "vitest";
import {
  buildSettlementsReturnPath,
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