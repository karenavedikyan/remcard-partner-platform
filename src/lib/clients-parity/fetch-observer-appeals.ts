import { CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import type { ObserverAppealsLoadResult } from "./types";

/**
 * Production load adapter for observer referred appeals.
 * Returns BLOCKED until backend exposes referrer appeal routes (see contracts inventory).
 */
export async function fetchObserverReferredAppeals(): Promise<ObserverAppealsLoadResult> {
  const blocker = CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-OBSERVER-REFERRED");
  return {
    ok: false,
    code: "BLOCKED_CONTRACT",
    blockerId: blocker?.id ?? "BLK-OBSERVER-REFERRED",
    message: blocker?.summary ?? "Нет контракта для списка направленных клиентов.",
    missingRoutes: blocker?.missingApi ?? [],
  };
}
