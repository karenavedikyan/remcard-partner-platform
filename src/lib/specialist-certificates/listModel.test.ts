import { describe, expect, it } from "vitest";
import type { StoreCertificate } from "@/lib/certificate-types";
import {
  countActiveArchived,
  filterStoreCertificates,
  isStoreCertificateArchived,
} from "./listModel";

function cert(partial: Partial<StoreCertificate> & Pick<StoreCertificate, "id" | "status">): StoreCertificate {
  return {
    promoCode: "RC-1",
    qrCode: "q",
    maxUsages: 1,
    usageCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("specialist store certificate list model", () => {
  it("treats cancelled and expired as archived", () => {
    expect(isStoreCertificateArchived(cert({ id: "1", status: "ACTIVE" }))).toBe(false);
    expect(isStoreCertificateArchived(cert({ id: "2", status: "CANCELLED" }))).toBe(true);
    expect(isStoreCertificateArchived(cert({ id: "3", status: "EXPIRED" }))).toBe(true);
  });

  it("filters by archive bucket and search", () => {
    const items = [
      cert({ id: "a", status: "ACTIVE", promoCode: "ALPHA" }),
      cert({ id: "b", status: "CANCELLED", promoCode: "BETA" }),
    ];
    expect(filterStoreCertificates(items, { archived: false, q: "", statusFilter: "" })).toHaveLength(1);
    expect(
      filterStoreCertificates(items, { archived: false, q: "alpha", statusFilter: "" }).map((c) => c.id),
    ).toEqual(["a"]);
    expect(countActiveArchived(items)).toEqual({ activeCount: 1, archivedCount: 1 });
  });
});
