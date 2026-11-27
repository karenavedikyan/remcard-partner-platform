let activeLaunchPayload: string | null = null;

/** In-memory only — signed WebApp initData, never persisted or logged. */
export function setMiniAppLaunchPayload(initData: string | null): void {
  activeLaunchPayload = initData?.trim() ? initData.trim() : null;
}

export function getMiniAppLaunchPayload(): string | null {
  return activeLaunchPayload;
}

export function clearMiniAppLaunchPayload(): void {
  activeLaunchPayload = null;
}