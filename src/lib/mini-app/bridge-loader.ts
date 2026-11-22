import type { MiniAppPlatform } from "./types";

const TELEGRAM_BRIDGE = "https://telegram.org/js/telegram-web-app.js";
const MAX_BRIDGE = "https://st.max.ru/js/max-web-app.js";

type BridgeLoadResult = { ok: true } | { ok: false; reason: string };

const loadPromises = new Map<MiniAppPlatform, Promise<BridgeLoadResult>>();

function scriptId(platform: MiniAppPlatform): string {
  return `mini-app-${platform}-bridge`;
}

function existingScript(platform: MiniAppPlatform): HTMLScriptElement | null {
  return document.getElementById(scriptId(platform)) as HTMLScriptElement | null;
}

function waitForExistingScript(
  script: HTMLScriptElement,
  timeoutMs: number,
): Promise<BridgeLoadResult> {
  if (script.dataset.loaded === "1") {
    return Promise.resolve({ ok: true });
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve({ ok: false, reason: "timeout" }), timeoutMs);
    const done = (ok: boolean) => {
      window.clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      resolve(ok ? { ok: true } : { ok: false, reason: "load_error" });
    };
    const onLoad = () => done(true);
    const onError = () => done(false);
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

function injectScript(
  platform: MiniAppPlatform,
  timeoutMs: number,
): Promise<BridgeLoadResult> {
  const src = platform === "telegram" ? TELEGRAM_BRIDGE : MAX_BRIDGE;
  let script = existingScript(platform);

  if (script?.dataset.loaded === "1") {
    return Promise.resolve({ ok: true });
  }

  if (script?.dataset.loading === "1") {
    return waitForExistingScript(script, timeoutMs);
  }

  script = script ?? document.createElement("script");
  script.id = scriptId(platform);
  script.async = true;
  script.dataset.platform = platform;
  script.dataset.loading = "1";

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);

    const finish = (result: BridgeLoadResult) => {
      window.clearTimeout(timer);
      if (result.ok) {
        script!.dataset.loaded = "1";
      }
      delete script!.dataset.loading;
      resolve(result);
    };

    script!.addEventListener(
      "load",
      () => {
        finish({ ok: true });
      },
      { once: true },
    );
    script!.addEventListener(
      "error",
      () => {
        finish({ ok: false, reason: "load_error" });
      },
      { once: true },
    );

    if (!script!.src) {
      script!.src = src;
    }

    if (!script!.parentElement) {
      document.head.appendChild(script);
    }
  });
}

export function loadMessengerBridge(
  platform: MiniAppPlatform,
  opts?: { timeoutMs?: number },
): Promise<BridgeLoadResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, reason: "no_window" });
  }

  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const prior = loadPromises.get(platform);
  if (prior) {
    return prior;
  }

  const promise = injectScript(platform, timeoutMs).finally(() => {
    loadPromises.delete(platform);
  });
  loadPromises.set(platform, promise);
  return promise;
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

/** Test-only reset for bridge load deduplication. */
export function resetMessengerBridgeLoaderForTests(): void {
  loadPromises.clear();
}