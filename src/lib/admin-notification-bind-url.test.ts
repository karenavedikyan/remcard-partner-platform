import { describe, expect, it, vi } from "vitest";
import {
  isTrustedAdminNotificationBindDeepLink,
  openTrustedAdminNotificationBindDeepLink,
} from "./admin-notification-bind-url";

describe("admin-notification-bind-url", () => {
  it("accepts trusted telegram and max https deeplinks only", () => {
    expect(isTrustedAdminNotificationBindDeepLink("https://t.me/RemCardBot?start=nbind_x")).toBe(true);
    expect(isTrustedAdminNotificationBindDeepLink("https://max.ru/id123_bot?start=nbind_x")).toBe(true);
    expect(isTrustedAdminNotificationBindDeepLink("http://t.me/bot")).toBe(false);
    expect(isTrustedAdminNotificationBindDeepLink("https://evil.example/bot")).toBe(false);
  });

  it("reports popup blocked and exposes invalid links", () => {
    vi.stubGlobal("open", vi.fn(() => null));
    expect(openTrustedAdminNotificationBindDeepLink("https://t.me/bot")).toBe("popup_blocked");
    expect(openTrustedAdminNotificationBindDeepLink("https://evil.example/x")).toBe("invalid");
    vi.unstubAllGlobals();
  });
});
