const RECIPIENT_KEY = "remcard.linkInvite.recipientLabel.v1";
const PERSONAL_KEY = "remcard.linkInvite.personalLabel.v1";

type LabelMap = Record<string, string>;

function readMap(key: string): LabelMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LabelMap;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: LabelMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(map));
}

export function readLinkInviteRecipientLabel(inviteId: string): string | null {
  const value = readMap(RECIPIENT_KEY)[inviteId]?.trim();
  return value || null;
}

export function rememberLinkInviteRecipientLabel(inviteId: string, recipientLabel: string) {
  const trimmed = recipientLabel.trim();
  if (!trimmed) return;
  const map = readMap(RECIPIENT_KEY);
  map[inviteId] = trimmed;
  writeMap(RECIPIENT_KEY, map);
}

export function readLinkInvitePersonalLabel(inviteId: string): string | null {
  const value = readMap(PERSONAL_KEY)[inviteId]?.trim();
  return value || null;
}

export function rememberLinkInvitePersonalLabel(inviteId: string, personalLabel: string | null) {
  const map = readMap(PERSONAL_KEY);
  const trimmed = personalLabel?.trim() ?? "";
  if (trimmed) map[inviteId] = trimmed;
  else delete map[inviteId];
  writeMap(PERSONAL_KEY, map);
}