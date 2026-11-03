import { describe, expect, it } from "vitest";
import { listCountsFromApi } from "./listCountsFromApi";

describe("listCountsFromApi", () => {
  it("returns null when either count is missing or non-numeric", () => {
    expect(listCountsFromApi({})).toBeNull();
    expect(listCountsFromApi({ activeCount: 0 })).toBeNull();
    expect(listCountsFromApi({ activeCount: 0, archivedCount: undefined })).toBeNull();
    expect(listCountsFromApi({ activeCount: "0", archivedCount: 0 })).toBeNull();
  });

  it("returns finite pair when both counts are numbers", () => {
    expect(listCountsFromApi({ activeCount: 0, archivedCount: 0 })).toEqual({
      active: 0,
      archived: 0,
    });
    expect(listCountsFromApi({ activeCount: 2, archivedCount: 1 })).toEqual({
      active: 2,
      archived: 1,
    });
  });
});
