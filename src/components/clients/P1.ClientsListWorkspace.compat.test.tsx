import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workspacePath = path.join(repoRoot, "src/components/clients/ClientsListWorkspace.tsx");
const manifestPath = path.join(
  repoRoot,
  "src/lib/clients-parity/patch-manifest-57ca4680.json",
);
const snippetPath = path.join(
  repoRoot,
  "src/lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt",
);

const PRODUCTION_BASE = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";

const workspaceSource = readFileSync(workspacePath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;

describe("P1 ClientsListWorkspace build & production wiring", () => {
  it("pins manifest baseSha to production 57ca4680", () => {
    expect(manifest.baseSha).toBe(PRODUCTION_BASE);
  });

  it("mounts direction shell instead of direct AgentClientsList", () => {
    expect(workspaceSource).toContain("ClientsDirectionWorkspace");
    expect(workspaceSource).not.toMatch(/<AgentClientsList\b/);
  });

  it("forwards canLinkOnboardingHistory at the workspace export boundary", () => {
    expect(workspaceSource).toMatch(
      /canLinkOnboardingHistory=\{canLinkOnboardingHistory\}/,
    );
    expect(workspaceSource).toMatch(/canLinkOnboardingHistory\?: boolean/);
  });

  it("uses direct OwnerClientsGate export (no compatibility cast)", () => {
    expect(workspaceSource).not.toContain("ProductionOwnerClientsGate");
    expect(workspaceSource).toMatch(
      /<OwnerClientsGate canLinkOnboardingHistory=\{canLinkOnboardingHistory\}>/,
    );
    const snippet = readFileSync(snippetPath, "utf8");
    expect(snippet).toContain(
      "<OwnerClientsGate canLinkOnboardingHistory={canLinkOnboardingHistory}>",
    );
    expect(snippet).not.toContain("ProductionOwnerClientsGate");
  });

  it("production gate at base accepts canLinkOnboardingHistory prop", () => {
    const prodGate = execFileSync(
      "git",
      ["show", `${PRODUCTION_BASE}:src/components/clients/OwnerClientsGate.tsx`],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(prodGate).toMatch(/canLinkOnboardingHistory\?: boolean/);
  });

  it("manifest exclude list keeps production gate, routes, and history helper read-only", () => {
    const exclude = manifest.excludeFromCherryPick as string[];
    expect(exclude).toEqual(
      expect.arrayContaining([
        "src/components/clients/OwnerClientsGate.tsx",
        "src/app/(cabinet)/clients/page.tsx",
        "src/lib/onboarding-step/history-link-eligibility.ts",
      ]),
    );
  });
});
