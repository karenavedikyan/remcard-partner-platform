import { describe, expect, it } from "vitest";
import {
  blockerForRequirement,
  CLIENTS_CANONICAL_ROUTES,
  CLIENTS_CONTRACT_BLOCKERS,
  CLIENTS_DECISIONS,
  CLIENTS_K8_SOURCE_OF_TRUTH,
  CLIENTS_K8_UNRESOLVED_GAPS,
  routesForBlocker,
} from "./contracts";
import { fetchObserverReferredAppeals } from "./fetch-observer-appeals";
import { CLIENTS_APPEAL_SYSTEM_STAGE } from "./types";

describe("clients parity contracts", () => {
  it("maps C07 to receiving blocker", () => {
    expect(blockerForRequirement("C07")?.id).toBe("BLK-RECEIVING-APPEALS");
  });

  it("fetch observer returns blocked", async () => {
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.blockerId).toBe("BLK-OBSERVER-REFERRED");
      expect(res.missingRoutes.length).toBeGreaterThan(0);
    }
  });

  it("has three contract blockers", () => {
    expect(CLIENTS_CONTRACT_BLOCKERS).toHaveLength(3);
  });

  it("inventory routes stay NOT_IMPLEMENTED until K1/K2/K5 HTTP lands", () => {
    expect(CLIENTS_K8_SOURCE_OF_TRUTH.status).toBe("DRAFT_K8_CANDIDATE");
    expect(CLIENTS_K8_SOURCE_OF_TRUTH.schemaCoreCommitSha).toMatch(/^fc33b4f/);
    expect(CLIENTS_CANONICAL_ROUTES.every((r) => r.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(routesForBlocker("BLK-OBSERVER-REFERRED")).toHaveLength(3);
    expect(CLIENTS_K8_UNRESOLVED_GAPS).toHaveLength(5);
    expect(CLIENTS_DECISIONS).toHaveLength(7);
  });

  it("system stage ids match frozen prototype", () => {
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.NEW).toBe("sys_new");
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.PAID).toBe("sys_paid");
  });
});
