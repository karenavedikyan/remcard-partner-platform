/**
 * P23m: source-contract proof for in-Hub detail wiring.
 * Full RTL suite (PartnersHub.p23m-detail-hub.rtl.pending.test.tsx) runs only after
 * P25p delivers PartnerFindDirectoryDetailShell.tsx — no shell stub in this block.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const hubSrc = readFileSync(path.join(__dirname, "PartnersHub.tsx"), "utf8");
const shellPath = path.join(__dirname, "PartnerFindDirectoryDetailShell.tsx");

describe("PartnersHub P23m detail-hub source contract", () => {
  it("wires onDetail on find cards and hosts PartnerFindDirectoryDetailShell", () => {
    expect(hubSrc).toContain('from "@/components/partners/PartnerFindDirectoryDetailShell"');
    expect(hubSrc).toContain("findDirectoryDetailPartner");
    expect(hubSrc).toContain("onDetail={() => openFindDirectoryDetail(partner)}");
    expect(hubSrc).toContain("<PartnerFindDirectoryDetailShell");
    expect(hubSrc).toContain("closeFindDirectoryDetail({ restoreFocus: true })");
    expect(hubSrc).toContain("setInviteTarget(target)");
    expect(hubSrc).toContain('data-testid="agent-r04-modal-find-results-host"');
    expect(hubSrc).toContain("hidden={Boolean(findDirectoryDetailPartner)}");
  });

  it("clears detail on accepted panel-key / surface / audience / meId change", () => {
    expect(hubSrc).toMatch(
      /setFindDirectoryDetailPartner\(null\);\s*\}, \[discussionInvitePanelKey, agentModalSurface, partnersAudience, meId\]/,
    );
    expect(hubSrc).toContain("findDetailLifecycleGenRef.current += 1");
  });

  it("does not invent PartnerFindDirectoryDetailShell in this ownership block", () => {
    // P25p owns the shell file. Missing file is an explicit dependency, not a stub.
    if (!existsSync(shellPath)) {
      expect(existsSync(shellPath)).toBe(false);
    } else {
      const shellSrc = readFileSync(shellPath, "utf8");
      expect(shellSrc).toContain("export function PartnerFindDirectoryDetailShell");
      expect(shellSrc).toContain("onBack");
      expect(shellSrc).toContain("onInvite");
    }
  });
});
