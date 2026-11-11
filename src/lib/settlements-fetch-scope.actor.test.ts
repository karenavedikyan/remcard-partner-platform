import { describe, expect, it } from "vitest";
import {
  actorWalletSurfaceScopeKey,
  historyActorScopeKey,
  walletSettlementsFetchScopeKey,
} from "./settlements-fetch-scope";

describe("actorWalletSurfaceScopeKey", () => {
  it("binds scope to actor user id per surface", () => {
    expect(actorWalletSurfaceScopeKey("agent", "user-42")).toBe("agent:user-42");
    expect(actorWalletSurfaceScopeKey("specialist", "user-42")).toBe("specialist:user-42");
    expect(actorWalletSurfaceScopeKey("agent", "user-1")).not.toBe(
      actorWalletSurfaceScopeKey("agent", "user-2"),
    );
  });

  it("builds history actor scope for page remount", () => {
    expect(historyActorScopeKey("user-1", "PRO")).toBe("history:user-1:PRO");
    expect(historyActorScopeKey("user-1", null)).toBe("history:user-1:unknown");
  });

  it("preserves branch suffix on staff ledger scope", () => {
    const base = "STORE:org-1:actor-1";
    expect(walletSettlementsFetchScopeKey(base, ["b2", "b1"])).toBe(
      "STORE:org-1:actor-1:branches:b1,b2",
    );
    expect(walletSettlementsFetchScopeKey(base, null)).toBe(base);
  });
});
