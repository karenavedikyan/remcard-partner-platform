import { emptyLinkInviteList } from "./link-invite-list";

/** Stable empty GET /api/partnership/link-invite payload (v2 opt-in). */
export function mockEmptyPartnershipLinkInviteListV2() {
  return emptyLinkInviteList();
}

/** Stable legacy GET /api/partnership/link-invite payload. */
export function mockEmptyPartnershipLinkInviteListLegacy() {
  return { invites: [] as const };
}