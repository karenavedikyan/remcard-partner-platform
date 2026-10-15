import { describe, expect, it } from "vitest";
import {
  buildClientShareLines,
  DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES,
} from "./clientContactShare";

describe("clientContactShare", () => {
  const client = {
    displayName: "Anna Client",
    phone: "89001234567",
    email: "anna@example.test",
    city: "Krasnodar",
  };

  it("defaults to display name only", () => {
    const lines = buildClientShareLines(client, DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES);
    expect(lines).toEqual(["Anna Client"]);
  });

  it("includes opted-in contact fields", () => {
    const lines = buildClientShareLines(client, { phone: true, email: true, city: false });
    expect(lines[0]).toBe("Anna Client");
    expect(lines.some((l) => l.includes("900"))).toBe(true);
    expect(lines).toContain("anna@example.test");
    expect(lines).not.toContain("Krasnodar");
  });

  it("does not export note or internal ids", () => {
    const lines = buildClientShareLines(
      { ...client, note: "secret" } as typeof client & { note: string },
      { phone: true, email: true, city: true },
    );
    expect(lines.join("\n")).not.toMatch(/secret/i);
    expect(lines.join("\n")).not.toMatch(/certificateCount|clientId/i);
  });
});
