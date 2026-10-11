const CHANNEL = "remcard-session-v1";

export type SessionBroadcastMessage = { type: "sign-out-all" };

export function broadcastSignOutAll(): void {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "sign-out-all" } satisfies SessionBroadcastMessage);
    channel.close();
  } catch {
    // BroadcastChannel unavailable — other tabs recover on next 401/focus fetch
  }
}

export function subscribeSessionBroadcast(onSignOutAll: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<SessionBroadcastMessage>) => {
      if (event.data?.type === "sign-out-all") onSignOutAll();
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}
