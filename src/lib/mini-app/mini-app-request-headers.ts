import type { MiniAppPlatform } from "./types";
import {
  MINI_APP_EMBEDDED_HEADER,
  MINI_APP_LAUNCH_HEADER,
  type MiniAppEmbeddedContext,
} from "./embedded-context";
import { getMiniAppLaunchPayload } from "./launch-session";
import { miniAppUsesEmbeddedSession } from "./embedded-context";

export function buildMiniAppExtraHeaders(
  platform: MiniAppPlatform,
  embeddedContext: MiniAppEmbeddedContext,
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-remcard-mini-app-platform": platform,
  };
  if (miniAppUsesEmbeddedSession(embeddedContext)) {
    headers[MINI_APP_EMBEDDED_HEADER] = "1";
    const launch = getMiniAppLaunchPayload();
    if (launch) {
      headers[MINI_APP_LAUNCH_HEADER] = launch;
    }
  }
  return headers;
}