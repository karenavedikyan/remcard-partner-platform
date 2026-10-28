export type {
  ModerationQueueItem,
  ModerationQueueResponse,
  ModerationPublicPreviewRequest,
} from "../../../src/lib/prof-admin-moderation-api";

import * as real from "../../../src/lib/prof-admin-moderation-api";
import { moderationQueue, sampleOrgDetail, samplePartnerDetail } from "./fixtures";

export const buildModerationOrgPreviewRevisionQuery = real.buildModerationOrgPreviewRevisionQuery;
export const moderationOrgPreviewRevisionFetchKey = real.moderationOrgPreviewRevisionFetchKey;
export const moderationPartnerPreviewRevisionFetchKey = real.moderationPartnerPreviewRevisionFetchKey;

export async function fetchModerationQueue() {
  return moderationQueue;
}

export async function fetchModerationPartner(_userId: string) {
  return { partner: samplePartnerDetail };
}

export async function fetchModerationOrganization(_orgId: string) {
  return { organization: sampleOrgDetail };
}

export async function fetchModerationOrganizationPublicPreview() {
  return {
    organizationRevisionToken: "rev-org-harness",
    branchRevisions: {},
    organization: { publicContacts: [] },
    branches: [],
  };
}

export async function fetchModerationPartnerPublicPreview() {
  return {
    partnerRevisionToken: "rev-partner-harness",
    partner: { publicContacts: [] },
    services: [],
    portfolioItems: [],
  };
}

export async function moderationPartnerAction() {
  return { ok: true };
}

export async function moderationOrganizationAction() {
  return { ok: true };
}

export async function moderationBranchAction() {
  return { ok: true };
}
