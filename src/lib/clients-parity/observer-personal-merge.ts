import type { ObserverPersonalMeta } from "./types";

/**
 * After observer GET, keep locally newer personal overlay rows (post-K5 mutation)
 * when server list personalMeta lags (stale page / eventual consistency).
 */
export function mergeObserverPersonalAfterGet(
  previous: Record<string, ObserverPersonalMeta>,
  fromServer: Record<string, ObserverPersonalMeta>,
  previousVersions: Record<string, number>,
  serverVersions: Record<string, number>,
): { meta: Record<string, ObserverPersonalMeta>; versions: Record<string, number> } {
  const meta: Record<string, ObserverPersonalMeta> = { ...fromServer };
  for (const [id, local] of Object.entries(previous)) {
    const localVer = previousVersions[id] ?? 0;
    const serverVer = serverVersions[id] ?? 0;
    if (localVer > serverVer) {
      meta[id] = { ...meta[id], ...local };
    }
  }
  const versions: Record<string, number> = { ...serverVersions };
  for (const [id, localVer] of Object.entries(previousVersions)) {
    if (localVer > (versions[id] ?? 0)) {
      versions[id] = localVer;
    }
  }
  return { meta, versions };
}
