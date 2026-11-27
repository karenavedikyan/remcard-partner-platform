/** Cross-site MAX iframe: third-party / partitioned cookie context. */
export type MiniAppEmbeddedContext = "default" | "cross_site_iframe";

export const MINI_APP_LAUNCH_HEADER = "x-remcard-mini-app-launch";
export const MINI_APP_EMBEDDED_HEADER = "x-remcard-mini-app-embedded";
export const MINI_APP_EMBEDDED_TOKEN_COOKIE = "remcard-mini-app-embedded-token";
export const MINI_APP_EMBEDDED_BIND_COOKIE = "remcard-mini-app-embedded-bind";

export function detectMiniAppEmbeddedContext(platform: "telegram" | "max" | null): MiniAppEmbeddedContext {
  if (typeof window === "undefined") return "default";
  if (platform !== "max") return "default";
  try {
    if (window.self !== window.top) return "cross_site_iframe";
  } catch {
    return "cross_site_iframe";
  }
  return "default";
}

export function miniAppUsesEmbeddedSession(ctx: MiniAppEmbeddedContext): boolean {
  return ctx === "cross_site_iframe";
}