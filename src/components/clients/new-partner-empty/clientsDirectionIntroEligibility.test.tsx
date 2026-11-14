import { describe, expect, it } from "vitest";
import {
  isObserverDirectionIntroEligible,
  isReceivingDirectionIntroEligible,
} from "./clientsDirectionIntroEligibility";

describe("receiving direction intro eligibility", () => {
  const base = {
    phase: "ready" as const,
    listView: "list" as const,
    filters: { q: "", status: "Все статусы", source: "all" as const, bucket: "active" as const },
    appealsLength: 0,
    serverBacked: true,
    listHasMore: false,
    bucketsProof: "all_empty" as const,
  };

  it("allows only genuine active empty list", () => {
    expect(isReceivingDirectionIntroEligible(base)).toBe(true);
  });

  it("rejects when archive/trash proof is not complete", () => {
    expect(isReceivingDirectionIntroEligible({ ...base, bucketsProof: "checking" })).toBe(false);
    expect(isReceivingDirectionIntroEligible({ ...base, bucketsProof: "has_elsewhere" })).toBe(false);
  });

  it("rejects loading, filters, archive, and sub-views", () => {
    expect(isReceivingDirectionIntroEligible({ ...base, phase: "loading" })).toBe(false);
    expect(isReceivingDirectionIntroEligible({ ...base, filters: { ...base.filters, q: "x" } })).toBe(
      false,
    );
    expect(
      isReceivingDirectionIntroEligible({
        ...base,
        filters: { ...base.filters, bucket: "archive" },
      }),
    ).toBe(false);
    expect(isReceivingDirectionIntroEligible({ ...base, listView: "manual" })).toBe(false);
    expect(isReceivingDirectionIntroEligible({ ...base, appealsLength: 2 })).toBe(false);
  });
});

describe("observer direction intro eligibility", () => {
  const base = {
    loadState: "ready" as const,
    dataContract: { status: "ready" as const },
    appealsLength: 0,
    filters: { q: "", period: "all" as const, bucket: "active" as const },
  };

  it("allows dataset empty on active bucket", () => {
    expect(isObserverDirectionIntroEligible(base)).toBe(true);
  });

  it("rejects search, period, blocked, and non-empty", () => {
    expect(isObserverDirectionIntroEligible({ ...base, appealsLength: 1 })).toBe(false);
    expect(isObserverDirectionIntroEligible({ ...base, filters: { ...base.filters, q: "a" } })).toBe(
      false,
    );
    expect(
      isObserverDirectionIntroEligible({
        ...base,
        dataContract: {
          status: "blocked",
          blockerId: "x",
          message: "m",
          missingRoutes: [],
        },
      }),
    ).toBe(false);
  });
});