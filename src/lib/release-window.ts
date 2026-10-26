import { remcardFetch } from "@/lib/api-client";

export type ReleaseWindowPhase = "OPEN" | "DRAINING" | "CLOSED" | "UNAVAILABLE";

export type ReleaseWindowStatus = {
  phase: ReleaseWindowPhase;
  stateVersion: number;
  windowId: string;
  updatedAt: string;
};

export function releaseWindowBlocksLogin(phase: ReleaseWindowPhase): boolean {
  return phase === "DRAINING" || phase === "CLOSED" || phase === "UNAVAILABLE";
}

export async function fetchReleaseWindowStatus(): Promise<ReleaseWindowStatus | null> {
  try {
    const data = await remcardFetch<ReleaseWindowStatus>("/api/release-window/status", {
      method: "GET",
    });
    if (!data?.phase) return null;
    return data;
  } catch {
    return { phase: "UNAVAILABLE", stateVersion: 0, windowId: "", updatedAt: new Date().toISOString() };
  }
}
