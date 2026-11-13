import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(
  path.resolve(__dirname, "ClientsListWorkspace.tsx"),
  "utf8",
);

describe("ClientsListWorkspace production patch", () => {
  it("forwards canLinkOnboardingHistory into gate render", () => {
    expect(workspaceSource).toMatch(
      /canLinkOnboardingHistory=\{canLinkOnboardingHistory\}/,
    );
  });

  it("snippet for 57ca4680 uses direct OwnerClientsGate forward", () => {
    const snippet = readFileSync(
      path.resolve(__dirname, "../../lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt"),
      "utf8",
    );
    expect(snippet).toContain(
      "<OwnerClientsGate canLinkOnboardingHistory={canLinkOnboardingHistory}>",
    );
  });
});
