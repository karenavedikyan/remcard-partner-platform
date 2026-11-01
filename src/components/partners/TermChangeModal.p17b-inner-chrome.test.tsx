import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P17b CSS contract from measured frozen R1 #role-dialog.
 * Shell gutters (19px / min(620,100%)) remain P15.
 */
describe("TermChangeModal P17b inner chrome CSS", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangeModal.module.css"),
    "utf8",
  );

  it("keeps P15 shell gutters and 620 sheet", () => {
    expect(src).toMatch(/padding:\s*19px/);
    expect(src).toMatch(/width:\s*min\(620px,\s*100%\)/);
    expect(src).not.toMatch(/align-items:\s*flex-end/);
  });

  it("matches measured R1 head: 24px pad, no divider, exact 18px title", () => {
    expect(src).toMatch(/\.header\s*\{[^}]*padding:\s*24px\s+24px\s+0/s);
    expect(src).toMatch(/\.header\s*\{[^}]*border-bottom:\s*0/s);
    expect(src).toMatch(/font-size:\s*18px/);
    expect(src).toMatch(/letter-spacing:\s*normal/);
    expect(src).toMatch(/\.body\s*\{[^}]*padding:\s*20px\s+24px\s+24px/s);
    expect(src).not.toMatch(/font-size:\s*1\.125rem/);
  });
});
