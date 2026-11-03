import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CABINET_ROOT = path.join(process.cwd(), "src/app/(cabinet)");

const EXPECTED_ROUTE_FILES = [
  "page.tsx",
  "partners/page.tsx",
  "partners/agent-terms/page.tsx",
  "clients/page.tsx",
  "clients/[id]/page.tsx",
  "certificates/page.tsx",
  "certificates/new/page.tsx",
  "certificates/[id]/page.tsx",
  "history/page.tsx",
  "history/accruals/[id]/page.tsx",
  "history/purchases/[id]/page.tsx",
  "notifications/page.tsx",
  "profile/page.tsx",
  "recommendations/page.tsx",
  "recommendations/new/page.tsx",
  "recommendations/[id]/page.tsx",
  "scanner/page.tsx",
  "settlements/page.tsx",
];

function walkPageFiles(dir: string, base = ""): string[] {
  const entries = readdirSync(dir);
  const pages: string[] = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry}` : entry;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      pages.push(...walkPageFiles(full, rel));
      continue;
    }
    if (entry === "page.tsx") {
      pages.push(rel);
    }
  }
  return pages.sort();
}

describe("(cabinet) routing contract", () => {
  it("contains exactly the 18 moved routes and no extra page.tsx files", () => {
    const pages = walkPageFiles(CABINET_ROOT);
    expect(pages).toEqual([...EXPECTED_ROUTE_FILES].sort());
  });

  it("wraps every page body in CabinetShell (fresh identity on soft nav)", () => {
    for (const rel of EXPECTED_ROUTE_FILES) {
      const src = readFileSync(path.join(CABINET_ROOT, rel), "utf8");
      expect(src, rel).toMatch(/CabinetShell/);
      expect(src, rel).toMatch(/returnTo=/);
    }
  });

  it("does not define a route-group template (Next skips it on sibling soft nav)", () => {
    const templatePath = path.join(CABINET_ROOT, "template.tsx");
    expect(() => readFileSync(templatePath)).toThrow();
  });

  it("keeps a server guard on every page except home (custom guest flow)", () => {
    for (const rel of EXPECTED_ROUTE_FILES) {
      const src = readFileSync(path.join(CABINET_ROOT, rel), "utf8");
      if (rel === "page.tsx") {
        expect(src).toMatch(/getSessionUser/);
        continue;
      }
      expect(src, rel).toMatch(/requireProPageUser/);
    }
  });

  it("defines a persistent layout with peekCabinetSession", () => {
    const layout = readFileSync(path.join(CABINET_ROOT, "layout.tsx"), "utf8");
    expect(layout).toMatch(/peekCabinetSession/);
    expect(layout).not.toMatch(/\bredirect\s*\(/);
  });
});
