import { describe, expect, it } from "vitest";
import { buildInviteShareMessage, inviteeGreetingLine } from "./invite-share-message";

describe("invite-share-message", () => {
  it("uses first name greeting when full name provided", () => {
    expect(inviteeGreetingLine("Иванов Иван")).toBe("Иванов, здравствуйте!");
  });

  it("falls back to neutral greeting", () => {
    expect(inviteeGreetingLine(null)).toBe("Здравствуйте!");
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
