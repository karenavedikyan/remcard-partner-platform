import { describe, expect, it } from "vitest";

/** Mirrors AgentClientsList load generation guard (newer load wins). */
function applyListLoadResult(
  requestGeneration: number,
  activeGeneration: number,
  apply: () => void,
) {
  if (requestGeneration !== activeGeneration) return;
  apply();
}

describe("clients list load generation guard", () => {
  it("drops stale search response when a newer search started", () => {
    let activeGeneration = 0;
    let items: string[] = [];

    const alphaGen = ++activeGeneration;
    const betaGen = ++activeGeneration;

    applyListLoadResult(betaGen, activeGeneration, () => {
      items = ["beta"];
    });
    applyListLoadResult(alphaGen, activeGeneration, () => {
      items = ["stale-alpha"];
    });

    expect(items).toEqual(["beta"]);
  });
});
