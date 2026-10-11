import { describe, expect, it } from "vitest";
import { buildInviteShareMessage, inviteeGreetingLine } from "./invite-share-message";

describe("invite-share-message", () => {
  it("does not guess given name from full name (Жуков Сергей)", () => {
    expect(inviteeGreetingLine(undefined)).toBe("Здравствуйте!");
    expect(
      buildInviteShareMessage({
        inviteeFullName: "Жуков Сергей",
        url: "https://example.com/x",
      }),
    ).toMatch(/^Здравствуйте!/);
  });

  it("does not guess given name from full name (Сергей Жуков)", () => {
    expect(
      buildInviteShareMessage({
        inviteeFullName: "Сергей Жуков",
        url: "https://example.com/x",
      }),
    ).toMatch(/^Здравствуйте!/);
  });

  it("falls back to neutral greeting for empty name", () => {
    expect(inviteeGreetingLine(null)).toBe("Здравствуйте!");
    expect(inviteeGreetingLine("   ")).toBe("Здравствуйте!");
  });

  it("uses explicit given name when provided", () => {
    expect(inviteeGreetingLine("Сергей")).toBe("Сергей, здравствуйте!");
  });

  it("uses inviter display name not viewer", () => {
    const text = buildInviteShareMessage({
      inviteeFullName: "Петров Пётр",
      inviterDisplayName: "Creator One",
      organizationName: "ОПТОВИК",
      url: "https://example.com/invite/accept?token=x",
      scope: "ORGANIZATION",
    });
    expect(text).toContain("Creator One приглашает вас");
    expect(text).toContain("ОПТОВИК");
    expect(text).toContain("https://example.com/invite/accept?token=x");
    expect(text).toMatch(/^Здравствуйте!/);
  });

  it("does not treat OR true sneaky names as inviter", () => {
    const text = buildInviteShareMessage({
      inviterDisplayName: "",
      organizationName: "Сеть",
      url: "https://x/y",
    });
    expect(text).toContain("Команда Сеть приглашает вас");
  });
});
