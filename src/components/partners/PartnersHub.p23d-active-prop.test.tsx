/** @vitest-environment jsdom */
/** P23d: overview activeSlot must pass presentationVariant="active" (P28b contract). */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const hubTsx = path.join(__dirname, "PartnersHub.tsx");

describe("PartnersHub P23d active presentationVariant", () => {
  it("overview activeSlot sets presentationVariant active explicitly", () => {
    const src = fs.readFileSync(hubTsx, "utf8");
    const start = src.indexOf("activeSlot={");
    const end = src.indexOf("waitingSlot={", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const slot = src.slice(start, end);
    expect(slot).toContain('presentationVariant="active"');
    expect(slot).not.toContain('presentationVariant="invitations"');
  });

  it("keeps P23c snapshot withdraw helper (not id-lifetime settled)", () => {
    const src = fs.readFileSync(hubTsx, "utf8");
    expect(src).toContain("partnershipInvitationWithdrawSnapshotKey");
    expect(src).toMatch(/partnershipWithdrawSettledRef[\s\S]*snapshot/i);
  });
});
