import { afterEach, describe, expect, it } from "vitest";
import { getMaxBotLoginUrl, getTelegramBotLoginUrl } from "@/lib/auth-config";

const originalEnv = process.env;
afterEach(() => { process.env = originalEnv; });

describe("Independent PROF login URL context", () => {
  it("preserves the configured Telegram bot but replaces legacy login payload", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL: "https://t.me/RemCardBot?start=login",
    };
    const url = new URL(getTelegramBotLoginUrl());
    expect(url.pathname).toBe("/RemCardBot");
    expect(url.searchParams.get("start")).toBe("login_prof");
  });
  it("preserves the configured MAX bot but replaces legacy login payload", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_MAX_BOT_URL: "https://max.ru/id230808706225_bot?start=login",
    };
    const url = new URL(getMaxBotLoginUrl());
    expect(url.pathname).toBe("/id230808706225_bot");
    expect(url.searchParams.get("start")).toBe("login_prof");
  });
});
