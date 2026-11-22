import { describe, expect, it } from "vitest";

describe("mini-app fixture matrix", () => {
  const roles = ["agent", "specialist", "store", "company"] as const;
  const hosts = ["telegram", "max"] as const;

  it("covers eight role×host combinations for visual capture", () => {
    const keys = roles.flatMap((r) => hosts.map((h) => `${r}-${h}`));
    expect(keys).toHaveLength(8);
    expect(keys).toContain("company-max");
  });
});