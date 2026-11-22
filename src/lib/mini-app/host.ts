"use client";

import type { MiniAppPlatform } from "./types";
import { readQueryPlatform } from "./bridge-loader";

export type MiniAppHostAdapter = {
  platform: MiniAppPlatform;
  initData: string;
  ready: () => void;
  expand: () => void;
  onBack: (handler: () => void) => void;
  offBack: (handler: () => void) => void;
  shareText: (text: string) => boolean;
  openExternalLink: (url: string) => void;
  copyToClipboard: (text: string) => Promise<boolean>;
};

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand?: () => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  openTelegramLink: (url: string) => void;
  openLink?: (url: string) => void;
};

type MaxWebApp = {
  initData: string;
  ready: () => void;
  expand?: () => void;
  BackButton?: TelegramWebApp["BackButton"];
  openLink?: (url: string) => void;
  openMaxLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
    WebApp?: MaxWebApp;
  }
}

function safeExpand(fn: (() => void) | undefined): void {
  try {
    fn?.();
  } catch {
    /* MAX bridge may not implement expand */
  }
}

export function detectMiniAppHost(forcedPlatform?: MiniAppPlatform | null): MiniAppHostAdapter | null {
  if (typeof window === "undefined") return null;
  const forced = forcedPlatform ?? readQueryPlatform();
  const tg = window.Telegram?.WebApp;
  if ((forced === "telegram" || !forced) && tg?.initData) {
    return {
      platform: "telegram",
      initData: tg.initData,
      ready: () => tg.ready(),
      expand: () => safeExpand(tg.expand),
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
      openExternalLink: (url) => {
        if (url.startsWith("https://t.me/") || url.startsWith("tg://")) {
          tg.openTelegramLink(url);
          return;
        }
        if (typeof tg.openLink === "function") {
          tg.openLink(url);
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      },
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
      expand: () => safeExpand(max.expand),
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
      openExternalLink: (url) => {
        if (typeof max.openLink === "function") {
          max.openLink(url);
          return;
        }
        if (typeof max.openMaxLink === "function") {
          max.openMaxLink(url);
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      },
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