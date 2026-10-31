import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "AgentDiscussionInviteWizard.module.css"), "utf8");
const source = readFileSync(path.join(__dirname, "AgentDiscussionInviteWizard.tsx"), "utf8");

describe("P7/P8a mobile message layout — no sticky footer over textarea", () => {
  it("keeps narrow footer in document flow (not sticky bottom)", () => {
    expect(css).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*?\.footer\s*\{[\s\S]*?position:\s*static/,
    );
    expect(css).not.toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*?\.footer\s*\{[\s\S]*?position:\s*sticky/,
    );
    expect(css).not.toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*?\.footer\s*\{[\s\S]*?bottom:\s*0/,
    );
  });

  it("keeps 44px controls and ensureInScrollport without forced wizard-top jump", () => {
    expect(css).toContain("min-height: 44px");
    expect(source).toContain("ensureInScrollport");
    expect(source).not.toContain("scrollParent.scrollTop += delta");
  });
});
