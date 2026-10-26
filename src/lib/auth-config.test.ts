import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getMaxBotLoginUrl,
  getTelegramBotLoginUrl,
  normalizeProfBotLoginUrl,
  PROF_BOT_LOGIN_START,
} from "./auth-config";

describe("auth-config PROF bot URLs", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL;
    delete process.env.NEXT_PUBLIC_MAX_BOT_URL;
  });

  afterEach(() => {
    process.env = env;
  });

  it("defaults use login_prof", () => {
    expect(getTelegramBotLoginUrl()).toContain(`start=${PROF_BOT_LOGIN_START}`);
    expect(getMaxBotLoginUrl()).toContain(`start=${PROF_BOT_LOGIN_START}`);
  });

  it("overrides legacy start=login to login_prof", () => {
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL = "https://t.me/RemCardBot?start=login";
    process.env.NEXT_PUBLIC_MAX_BOT_URL = "https://max.ru/id230808706225_bot?start=login&foo=1";
    expect(getTelegramBotLoginUrl()).toBe("https://t.me/RemCardBot?start=login_prof");
    expect(getMaxBotLoginUrl()).toBe(
      "https://max.ru/id230808706225_bot?start=login_prof&foo=1",
    );
  });

  it("normalizeProfBotLoginUrl rejects unsafe schemes", () => {
    expect(normalizeProfBotLoginUrl("ftp://evil.tld/bot")).toBe("ftp://evil.tld/bot");
  });
});
