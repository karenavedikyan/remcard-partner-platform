import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const detailPath = path.join(repoRoot, "src/components/clients/ClientDetailWorkspace.tsx");
const PRODUCTION_BASE = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";

const detailSource = readFileSync(detailPath, "utf8");

describe("P1 ClientDetailWorkspace production compatibility", () => {
  it("is byte-identical to production 57ca4680 (no cherry-pick delta)", () => {
    const prodSource = execFileSync(
      "git",
      ["show", `${PRODUCTION_BASE}:src/components/clients/ClientDetailWorkspace.tsx`],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(detailSource).toBe(prodSource);
  });

  it("does not import observer/direction parity shell", () => {
    expect(detailSource).not.toContain("ClientsDirectionWorkspace");
    expect(detailSource).not.toContain("ObserverPartnersWorkspace");
    expect(detailSource).toContain("AgentClientDetail");
  });

  it("wraps detail body in OwnerClientsGate without page-level history prop", () => {
    expect(detailSource).toMatch(/<OwnerClientsGate>\s*\n\s*<ClientDetailBody/);
    expect(detailSource).not.toContain("canLinkOnboardingHistory");
  });
});
