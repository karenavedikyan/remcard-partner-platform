import { describe, expect, it } from "vitest";
import {
  buildProfileSectionHref,
  profileSectionNav,
  resolveProfileSectionFromQuery,
} from "./profile-sections";

describe("profile-sections", () => {
  it("defaults to overview without query", () => {
    expect(resolveProfileSectionFromQuery({})).toBe("overview");
  });

  it("maps moderation legacy section to catalog", () => {
    expect(resolveProfileSectionFromQuery({ section: "moderation" })).toBe("catalog");
  });

  it("opens branches when branchId is present", () => {
    expect(resolveProfileSectionFromQuery({ branchId: "br_1" })).toBe("branches");
  });

  it("treats unknown section as overview on client href builder only", () => {
    expect(resolveProfileSectionFromQuery({ section: "unknown" })).toBe("overview");
  });

  it("builds href without section for overview", () => {
    const href = buildProfileSectionHref("overview", new URLSearchParams("returnTo=%2Fhome"));
    expect(href).toBe("/profile?returnTo=%2Fhome");
  });

  it("preserves returnTo when switching tabs", () => {
    const href = buildProfileSectionHref(
      "basics",
      new URLSearchParams("returnTo=%2Finvite%2Fx"),
    );
    expect(href).toBe("/profile?returnTo=%2Finvite%2Fx&section=basics");
  });

  it("pure agent nav exposes only overview, basics, notifications", () => {
    const nav = profileSectionNav({ pureAgentCompact: true });
    expect(nav.map((item) => item.id)).toEqual(["overview", "basics", "notifications"]);
  });

  it("pure agent resolver normalizes forbidden deep links to overview", () => {
    expect(
      resolveProfileSectionFromQuery(
        { section: "catalog", moderation: "1", branchId: "br_1" },
        { pureAgentCompact: true },
      ),
    ).toBe("overview");
    expect(
      resolveProfileSectionFromQuery({ section: "notifications" }, { pureAgentCompact: true }),
    ).toBe("notifications");
  });
});
