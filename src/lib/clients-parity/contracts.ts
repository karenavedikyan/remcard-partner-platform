/**
 * Partner «Клиенты» API/schema contract inventory (P2 coordinator).
 * K8 (`remcard-navigator`) owns implementation drafts; nothing here is READY until
 * routes exist, proxy allowlisted, and prod DB migration applied with user approval.
 */

import { CLIENTS_APPEAL_SYSTEM_STAGE } from "./types";

export const CLIENTS_PARITY_PROTOTYPE_SHA = "3dc31836cd18d9209c20097f18b906dd276f7af6";
export const CLIENTS_PARITY_PRODUCTION_BASE_SHA = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";
export const CLIENTS_NAVIGATOR_PREP_BASE_SHA = "8137ddd1ae5bad880fa28df34bab04e460bf2bdd";
export const CLIENTS_NAVIGATOR_PROFILE_SELECT_SHA = "89fb8e073c39c8dbd329996940b85c6a86751868";

/** K8 publishes backend SoT here (navigator); absent until K8 lands — do not duplicate DTOs elsewhere. */
export const CLIENTS_K8_SOURCE_OF_TRUTH = {
  status: "NOT_PUBLISHED",
  expectedNavigatorPaths: [
    "docs/contracts/partner-clients-k8-core.md",
    "docs/contracts/partner-clients-k8-core.json",
    "prisma/migrations/*_partner_client_appeals_*",
    "src/app/api/pro/referred-appeals/**",
    "src/app/api/pro/client-appeals/**",
    "src/lib/partnerClients/**",
  ],
  partnerInventoryPaths: [
    "src/lib/clients-parity/contracts.ts",
    "src/lib/clients-parity/types.ts",
  ],
} as const;

export type ContractRouteStatus =
  | "NOT_IMPLEMENTED"
  | "DRAFT_K8"
  | "IMPLEMENTED_UNVERIFIED"
  | "READY";

export type ClientsCanonicalRoute = {
  method: string;
  path: string;
  blockerId: string;
  status: ContractRouteStatus;
  owner: "K8" | "P5" | "P6";
  authGate: string;
  notes?: string;
};

export const CLIENTS_CANONICAL_ROUTES: ClientsCanonicalRoute[] = [
  {
    method: "GET",
    path: "/api/pro/referred-appeals",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate:
      "getProfCabinetUser + referrer eligibility (R03 agent / R06 specialist); rows where certificate.referrerUserId === viewer; read-only",
    notes: "Query: q, period, cursor, limit. 200: appeals[], partners[], nextCursor.",
  },
  {
    method: "GET",
    path: "/api/pro/referred-appeals/:id",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Same as list; appeal.referrerPartnerId === viewer.id",
    notes: "200: ObserverReferredAppealDetail incl. history[]",
  },
  {
    method: "GET",
    path: "/api/pro/referred-appeals/by-partner/:partnerId",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Same as list; partnerId is receiving partner User.id",
  },
  {
    method: "PATCH",
    path: "/api/pro/referred-appeals/:id/personal-meta",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Viewer is referrer; scope (viewerUserId, appealId)",
    notes:
      "Body: alias|null max100, tag|null max40, note|null max1000, bucket, beforeTrash. Must not PATCH AgentClient.",
  },
  {
    method: "POST",
    path: "/api/pro/referred-appeals/personal-batch",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Same as personal-meta",
    notes: "Body: ids[], op set-tag|archive|trash|restore, tag? for set-tag",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "PRO receiving partner; rows where receivingPartnerId === viewer",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Receiving partner; manualEntry appeals only",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/:id",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Receiving owner; stage transitions per prototype canTransitionTo rules",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/batch",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Receiving owner",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Receiving partner settings",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K8",
    authGate: "Receiving partner settings",
  },
];

export const CLIENTS_DECISIONS = [
  {
    id: "D1",
    topic: "appealId",
    p2Position:
      "Opaque string UUID in API (Prisma @id @default(uuid())). Natural key (certificateId + receivingPartnerId) only for dedup inside K8, never as client-facing id.",
    k8MustPublish: "appeal id generation + uniqueness constraints",
  },
  {
    id: "D2",
    topic: "stageId",
    p2Position: `System stages MUST use prototype ids: ${Object.values(CLIENTS_APPEAL_SYSTEM_STAGE).join(", ")}. Custom stages: workingStages[].id per receivingPartnerId.`,
    k8MustPublish: "Order/cert → stageId mapping table; no renaming to short new/paid in JSON",
  },
  {
    id: "D3",
    topic: "observer read auth",
    p2Position:
      "Reuse existing prof eligibility (agent R03 / specialist R06) without new roles. Authorization = referrer on Certificate/appeal row, read-only. Not requireOwnerClientsContext (CRM owner). Org workplace context rejected for overlay writes (same as agent-clients mutations).",
    k8MustPublish: "requireReferredAppealsListContext handler",
  },
  {
    id: "D4",
    topic: "personal overlay",
    p2Position:
      "Dedicated store keyed (viewerUserId, appealId). Fields match observer-personal-list.js incl. beforeTrash. No AgentClient PATCH substitute.",
    k8MustPublish: "Prisma model + PATCH/batch routes (migration draft only until prod approval)",
  },
  {
    id: "D5",
    topic: "receiving client-appeals",
    p2Position:
      "Separate resource from /api/leads and /api/pro/requests; includes workingStages + history append semantics from client-appeals.js.",
    k8MustPublish: "client-appeals CRUD + working-stages",
  },
  {
    id: "D6",
    topic: "partner proxy",
    p2Position: "P5/P6 add remcard-proxy allowlist + adapters after K8 routes exist.",
    k8MustPublish: null,
  },
  {
    id: "D7",
    topic: "forbidden wiring",
    p2Position:
      "Never map personal-meta save or observer list to GET/PATCH /api/pro/agent-clients* or partnership-list-preferences.",
    k8MustPublish: "contract tests rejecting owner CRM paths for observer overlay",
  },
] as const;

export const CLIENTS_FORBIDDEN_SUBSTITUTES = [
  "PATCH /api/pro/agent-clients/:id",
  "POST /api/pro/agent-clients/batch",
  "PATCH /api/certificate/:code/alias",
  "GET/PATCH /api/pro/partnership-list-preferences/:partnershipId",
  "GET /api/leads",
  "GET /api/pro/requests",
] as const;

export type ContractBlocker = {
  id: string;
  requirementIds: string[];
  summary: string;
  missingApi: string[];
  evidence: string;
  implementationStatus: "NOT_IMPLEMENTED" | "PREP_AUTHORIZED_20261113";
};

export const CLIENTS_CONTRACT_BLOCKERS: ContractBlocker[] = [
  {
    id: "BLK-RECEIVING-APPEALS",
    requirementIds: [
      "C07",
      "C08",
      "C09",
      "C10",
      "C11",
      "C12",
      "C13",
      "C14",
      "C15",
      "C16",
      "C17",
      "C18",
      "C19",
      "C20",
      "C21",
      "C22",
      "C23",
      "C24",
    ],
    summary: "Принимающий CRM «Клиенты у меня» (обращения, этапы, аналитика, покупка).",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === "BLK-RECEIVING-APPEALS").map(
      (r) => `${r.method} ${r.path}`,
    ),
    evidence:
      "Navigator 8137/89fb8e0: no client-appeals routes; partner remcard-proxy unwired.",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
  {
    id: "BLK-OBSERVER-REFERRED",
    requirementIds: [
      "C26",
      "C27",
      "C28",
      "C29",
      "C30",
      "C31",
      "C32",
      "C33",
      "C34",
      "C39",
      "C40",
      "C41",
    ],
    summary: "«Мои клиенты у партнёров»: направленные обращения, партнёрские сводки и деталь.",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === "BLK-OBSERVER-REFERRED").map(
      (r) => `${r.method} ${r.path}`,
    ),
    evidence:
      "Prototype ownReferredAppeals(); navigator has no referred-appeals; fetch-observer-appeals BLOCKED.",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
  {
    id: "BLK-OBSERVER-PERSONAL-PERSIST",
    requirementIds: ["C35", "C36", "C37", "C38"],
    summary: "Личные alias/метка/заметка/корзина наблюдателя с сохранением после reload.",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter(
      (r) => r.blockerId === "BLK-OBSERVER-PERSONAL-PERSIST",
    ).map((r) => `${r.method} ${r.path}`),
    evidence:
      "No overlay schema at 8137; UI uses notifyPersistenceBlock.",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
];

export function blockerForRequirement(requirementId: string): ContractBlocker | undefined {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.requirementIds.includes(requirementId));
}

export function routesForBlocker(blockerId: string): ClientsCanonicalRoute[] {
  return CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === blockerId);
}
