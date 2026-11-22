"use client";

import type { MiniAppPlatform } from "./types";

export type MiniAppHostAdapter = {
  platform: MiniAppPlatform;
  initData: string;
  ready: () => void;
  expand: () => void;
  onBack: (handler: () => void) => void;
  offBack: (handler: () => void) => void;
  shareText: (text: string) => boolean;
  openTelegramLink: (url: string) => void;
  copyToClipboard: (text: string) => Promise<boolean>;
};

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  openTelegramLink: (url: string) => void;
};

type MaxWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  BackButton?: TelegramWebApp["BackButton"];
  openMaxLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
    WebApp?: MaxWebApp;
  }
}

function readQueryPlatform(): MiniAppPlatform | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("platform")?.toLowerCase();
  if (q === "telegram" || q === "tg") return "telegram";
  if (q === "max") return "max";
  return null;
}

export function detectMiniAppHost(): MiniAppHostAdapter | null {
  if (typeof window === "undefined") return null;
  const forced = readQueryPlatform();
  const tg = window.Telegram?.WebApp;
  if ((forced === "telegram" || !forced) && tg?.initData) {
    return {
      platform: "telegram",
      initData: tg.initData,
      ready: () => tg.ready(),
      expand: () => tg.expand(),
      onBack: (h) => {
        tg.BackButton.show();
        tg.BackButton.onClick(h);
      },
      offBack: (h) => {
        tg.BackButton.offClick(h);
        tg.BackButton.hide();
      },
      shareText: (text) => {
        if (typeof navigator.share === "function") {
          void navigator.share({ text });
          return true;
        }
        return false;
      },
      openTelegramLink: (url) => tg.openTelegramLink(url),
      copyToClipboard: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          return false;
        }
      },
    };
  }
  const max = window.WebApp;
  if ((forced === "max" || !forced) && max?.initData) {
    return {
      platform: "max",
      initData: max.initData,
      ready: () => max.ready(),
      expand: () => max.expand(),
      onBack: (h) => {
        max.BackButton?.show();
        max.BackButton?.onClick(h);
      },
      offBack: (h) => {
        max.BackButton?.offClick(h);
        max.BackButton?.hide();
      },
      shareText: (text) => {
        if (typeof navigator.share === "function") {
          void navigator.share({ text });
          return true;
        }
        return false;
      },
      openTelegramLink: (url) => max.openMaxLink?.(url),
      copyToClipboard: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          return false;
        }
      },
    };
  }
  return null;
}