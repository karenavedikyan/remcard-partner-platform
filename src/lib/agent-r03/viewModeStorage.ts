const PREFIX = "remcard.agent-r03.view.";

export type AgentR03ViewMode = "list" | "cards";

export function readAgentR03ViewMode(section: "certificates" | "clients"): AgentR03ViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${section}`);
    return raw === "list" || raw === "cards" ? raw : null;
  } catch {
    return null;
  }
}

export function writeAgentR03ViewMode(section: "certificates" | "clients", mode: AgentR03ViewMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}${section}`, mode);
  } catch {
    /* ignore quota / private mode */
  }
}
