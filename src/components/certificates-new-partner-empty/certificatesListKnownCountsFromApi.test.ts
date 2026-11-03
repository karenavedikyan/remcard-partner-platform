import { describe, expect, it } from "vitest";
import { certificatesListKnownCountsFromApi } from "./certificatesListKnownCountsFromApi";

describe("certificatesListKnownCountsFromApi", () => {
  const trueZero = {
    certificates: [] as const,
    activeCount: 0,
    archivedCount: 0,
    totalCount: 0,
  };

  it("accepts empty array with finite zero counts", () => {
    expect(certificatesListKnownCountsFromApi(trueZero)).toEqual(trueZero);
  });

  it("rejects missing or malformed counts and certificates", () => {
    expect(certificatesListKnownCountsFromApi({ ...trueZero, activeCount: undefined })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, archivedCount: null })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, totalCount: "0" })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, activeCount: -0 })).toEqual(trueZero);
    expect(certificatesListKnownCountsFromApi({ ...trueZero, activeCount: -1 })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, totalCount: NaN })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, certificates: undefined })).toBeNull();
    expect(certificatesListKnownCountsFromApi({ ...trueZero, certificates: null })).toBeNull();
  });

  it("rejects non-zero totals even when the page items array is empty", () => {
    expect(
      certificatesListKnownCountsFromApi({
        certificates: [],
        activeCount: 0,
        archivedCount: 0,
        totalCount: 3,
      }),
    ).toBeNull();
    expect(
      certificatesListKnownCountsFromApi({
        certificates: [],
        activeCount: 2,
        archivedCount: 0,
        totalCount: 0,
      }),
    ).toBeNull();
  });

  it("rejects non-empty certificates array", () => {
    expect(
      certificatesListKnownCountsFromApi({
        ...trueZero,
        certificates: [{ id: "x" }],
      }),
    ).toBeNull();
  });
});
