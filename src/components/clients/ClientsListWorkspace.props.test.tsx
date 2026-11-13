import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(
  path.resolve(__dirname, "ClientsListWorkspace.tsx"),
  "utf8",
);
const pageSource = readFileSync(
  path.resolve(__dirname, "../../app/(cabinet)/clients/page.tsx"),
  "utf8",
);

describe("ClientsListWorkspace 57ca4680 compatibility", () => {
  it("accepts canLinkOnboardingHistory and forwards to OwnerClientsGate", () => {
    expect(workspaceSource).toMatch(/canLinkOnboardingHistory/);
    expect(workspaceSource).toMatch(
      /<OwnerClientsGate canLinkOnboardingHistory=\{canLinkOnboardingHistory\}/,
    );
  });

  it("clients page passes canLinkOnboardingHistoryFromUserRole", () => {
    expect(pageSource).toContain("canLinkOnboardingHistoryFromUserRole");
    expect(pageSource).toMatch(/canLinkOnboardingHistory=\{canLinkOnboardingHistoryFromUserRole/);
  });
});
