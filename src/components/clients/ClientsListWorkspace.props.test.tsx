import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCTION_CLIENTS_PAGE,
  PRODUCTION_CLIENTS_PAGE_SNIPPET,
  PRODUCTION_GATE,
} from "@/lib/clients-parity/production-compat";

const workspaceSource = readFileSync(
  path.resolve(__dirname, "ClientsListWorkspace.tsx"),
  "utf8",
);

describe("ClientsListWorkspace 57ca4680 compatibility", () => {
  it("accepts canLinkOnboardingHistory prop on workspace", () => {
    expect(workspaceSource).toMatch(/canLinkOnboardingHistory/);
    expect(workspaceSource).toMatch(/type Props = \{/);
  });

  it("documents production-only gate forwarding", () => {
    expect(workspaceSource).toContain("57ca4680");
    expect(workspaceSource).not.toMatch(
      /<OwnerClientsGate canLinkOnboardingHistory=\{canLinkOnboardingHistory\}/,
    );
  });

  it("production route contract references", () => {
    expect(PRODUCTION_CLIENTS_PAGE).toBe("src/app/clients/page.tsx");
    expect(PRODUCTION_GATE).toBe("src/components/clients/OwnerClientsGate.tsx");
    expect(PRODUCTION_CLIENTS_PAGE_SNIPPET).toContain("canLinkOnboardingHistoryFromUserRole");
  });
});
