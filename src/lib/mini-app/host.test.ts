import { afterEach, describe, expect, it } from "vitest";
import { detectMiniAppHost } from "./host";

describe("detectMiniAppHost", () => {
  afterEach(() => {
    delete (window as { Telegram?: unknown }).Telegram;
    delete (window as { WebApp?: unknown }).WebApp;
  });

  it("detects telegram after bridge globals exist", () => {
    window.Telegram = {
      WebApp: {
        initData: "query_id=1&user=%7B%22id%22%3A1%7D",
        ready: () => undefined,
        expand: () => undefined,
        BackButton: {
          show: () => undefined,
          hide: () => undefined,
          onClick: () => undefined,
          offClick: () => undefined,
        },
        openTelegramLink: () => undefined,
        openLink: () => undefined,
      },
    };
    const host = detectMiniAppHost("telegram");
    expect(host?.platform).toBe("telegram");
    expect(host?.initData).toContain("query_id");
  });

  it("uses openLink on MAX without throwing when expand is missing", () => {
    let opened = "";
    window.WebApp = {
      initData: "auth_date=1",
      ready: () => undefined,
      openLink: (url: string) => {
        opened = url;
      },
    };
    const host = detectMiniAppHost("max");
    expect(host).not.toBeNull();
    host?.expand();
    host?.openExternalLink("https://prof.remcard.ru/");
    expect(opened).toBe("https://prof.remcard.ru/");
  });
});