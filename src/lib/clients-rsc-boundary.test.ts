import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const clientsAppDir = path.resolve(__dirname, "../app/clients");

describe("clients pages RSC boundary", () => {
  it("does not pass render-prop functions into OwnerClientsGate", () => {
    for (const rel of ["page.tsx", "[id]/page.tsx"]) {
      const src = readFileSync(path.join(clientsAppDir, rel), "utf8");
      expect(src).not.toMatch(/OwnerClientsGate>\s*\{\s*\(\s*\w+/);
      expect(src).not.toMatch(/children:\s*\(\s*\w+/);
    }
  });

  it("uses client workspaces for serializable RSC children", () => {
    expect(readFileSync(path.join(clientsAppDir, "page.tsx"), "utf8")).toContain(
      "ClientsListWorkspace",
    );
    expect(readFileSync(path.join(clientsAppDir, "[id]/page.tsx"), "utf8")).toContain(
      "ClientDetailWorkspace",
    );
  });
});
