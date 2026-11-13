import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLIENTS_CONTRACT_BLOCKERS, blockerForRequirement } from "@/lib/clients-parity/contracts";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const proxySource = readFileSync(path.join(repoRoot, "src/lib/remcard-proxy.ts"), "utf8");

describe("P2 contract verification (read-only audit)", () => {
  it("confirms referred-appeals routes absent from remcard-proxy allowlist", () => {
    expect(proxySource.includes("referred-appeals")).toBe(false);
    expect(proxySource.includes("client-appeals")).toBe(false);
  });

  it("maps observer requirements to expected blockers", () => {
    expect(blockerForRequirement("C27")?.id).toBe("BLK-OBSERVER-REFERRED");
    expect(blockerForRequirement("C35")?.id).toBe("BLK-OBSERVER-PERSONAL-PERSIST");
    expect(blockerForRequirement("C38")?.id).toBe("BLK-OBSERVER-PERSONAL-PERSIST");
  });

  it("fetchObserverReferredAppeals never reports ok:true", async () => {
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
      expect(res.missingRoutes).toEqual(
        CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-OBSERVER-REFERRED")?.missingApi,
      );
    }
  });

  it("agent-clients routes exist but personal-meta routes do not", () => {
    expect(proxySource).toMatch(/\/api\/pro\/agent-clients/);
    expect(proxySource).not.toMatch(/personal-meta/);
  });
});
