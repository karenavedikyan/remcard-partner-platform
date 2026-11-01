import { describe, expect, it } from "vitest";
import {
  OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF,
  OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF,
} from "./overviewAttentionNavigation";

describe("overviewAttentionNavigation (A20d verified hrefs)", () => {
  it("points partners KPI drill-down to supported registration=active filter", () => {
    expect(OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF).toBe("/admin/partners?registration=active");
    const u = new URL(OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF, "http://local");
    expect(u.pathname).toBe("/admin/partners");
    expect(u.searchParams.get("registration")).toBe("active");
  });

  it("points moderation attention row to pending partner queue filters", () => {
    expect(OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF).toBe(
      "/admin/moderation?status=PENDING&entityKind=user",
    );
    const u = new URL(OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF, "http://local");
    expect(u.pathname).toBe("/admin/moderation");
    expect(u.searchParams.get("status")).toBe("PENDING");
    expect(u.searchParams.get("entityKind")).toBe("user");
  });
});
