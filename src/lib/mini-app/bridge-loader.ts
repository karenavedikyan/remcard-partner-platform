import type { MiniAppPlatform } from "./types";

const TELEGRAM_BRIDGE = "https://telegram.org/js/telegram-web-app.js";
const MAX_BRIDGE = "https://st.max.ru/js/max-web-app.js";

function scriptId(platform: MiniAppPlatform): string {
  return `mini-app-${platform}-bridge`;
}

function existingScript(platform: MiniAppPlatform): HTMLScriptElement | null {
  return document.getElementById(scriptId(platform)) as HTMLScriptElement | null;
}

export function loadMessengerBridge(
  platform: MiniAppPlatform,
  opts?: { timeoutMs?: number },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, reason: "no_window" });
  }
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const src = platform === "telegram" ? TELEGRAM_BRIDGE : MAX_BRIDGE;
  const prior = existingScript(platform);
  if (prior?.dataset.loaded === "1") {
    return Promise.resolve({ ok: true });
  }

  return new Promise((resolve) => {
    const script = prior ?? document.createElement("script");
    script.id = scriptId(platform);
    script.src = src;
    script.async = true;
    script.dataset.platform = platform;

    const timer = window.setTimeout(() => {
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);

    script.onload = () => {
      window.clearTimeout(timer);
      script.dataset.loaded = "1";
      resolve({ ok: true });
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      resolve({ ok: false, reason: "load_error" });
    };

    if (!prior) {
      document.head.appendChild(script);
    }
  });
}

export function readQueryPlatform(): MiniAppPlatform | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("platform")?.toLowerCase();
  if (q === "telegram" || q === "tg") return "telegram";
  if (q === "max") return "max";
  return null;
}

export async function ensureMiniAppBridgeReady(): Promise<{
  platform: MiniAppPlatform | null;
  bridgeError: string | null;
}> {
  const forced = readQueryPlatform();
  if (forced) {
    const loaded = await loadMessengerBridge(forced);
    if (!loaded.ok) {
      return { platform: forced, bridgeError: "Не удалось загрузить окружение мессенджера" };
    }
    return { platform: forced, bridgeError: null };
  }

  const tg = await loadMessengerBridge("telegram");
  if (tg.ok && window.Telegram?.WebApp?.initData) {
    return { platform: "telegram", bridgeError: null };
  }
  const max = await loadMessengerBridge("max");
  if (max.ok && window.WebApp?.initData) {
    return { platform: "max", bridgeError: null };
  }
  return {
    platform: null,
    bridgeError:
      !tg.ok && !max.ok
        ? "Не удалось загрузить Telegram или MAX"
        : "Откройте мини-кабинет из Telegram или MAX",
  };
}