import { describe, expect, it } from "vitest";
import { mergeObserverPersonalAfterGet } from "./observer-personal-merge";

describe("mergeObserverPersonalAfterGet", () => {
  it("keeps local meta when overlay version is newer than GET", () => {
    const { meta, versions } = mergeObserverPersonalAfterGet(
      { a1: { alias: "saved", bucket: "archived" } },
      { a1: { alias: "stale", bucket: "active" } },
      { a1: 3 },
      { a1: 2 },
    );
    expect(meta.a1?.alias).toBe("saved");
    expect(meta.a1?.bucket).toBe("archived");
    expect(versions.a1).toBe(3);
  });

  it("accepts server row when server version is newer", () => {
    const { meta } = mergeObserverPersonalAfterGet(
      { a1: { alias: "local" } },
      { a1: { alias: "server" } },
      { a1: 1 },
      { a1: 5 },
    );
    expect(meta.a1?.alias).toBe("server");
  });
});
