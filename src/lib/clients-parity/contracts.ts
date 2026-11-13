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

/**
 * K8 navigator canonical module (CANDIDATE — not accepted release).
 * Do not duplicate DTOs in partner-platform; mirror via adapter types only.
 */
export const CLIENTS_K8_SOURCE_OF_TRUTH = {
  status: "DRAFT_K8_CANDIDATE",
  navigatorBranch: "cursor/remcard-k8-acceptance-20261113",
  handoffCommitSha: "16253b84c3d0d35ad0978cb2bde1ccad1d725141",
  schemaCoreCommitSha: "fc33b4fae859fb692757807c3b27696b66d57558",
  canonicalModule: "src/lib/clientAppeals/contract.ts",
  handoffDoc: "src/lib/clientAppeals/HANDOFF.md",
  migrationDraft: "prisma/migrations/20261113203000_client_appeals/migration.sql",
  partnerInventoryPaths: [
    "src/lib/clients-parity/contracts.ts",
    "src/lib/clients-parity/types.ts",
  ],
  auditReconcile: "audit/remcard-parallel-20261113/P2/K8-root-gaps-reconcile-20261113.md",
} as const;

export const CLIENTS_K8_UNRESOLVED_GAPS = [
  {
    id: "GAP-K8-1",
    owner: "K8",
    topic: "Observer auth must match ownerClientsAccess principal agent/specialist, not only BranchEmployee.canViewOwnOperations",
    status: "UNRESOLVED",
  },
  {
    id: "GAP-K8-2",
    owner: "K8",
    topic: "workingStages/refusalReasons/archivedStages persistence missing in fc33 schema",
    status: "UNRESOLVED",
  },
  {
    id: "GAP-K8-3",
    owner: "K8",
    topic: "Active cert appeal predicate + uniqueness (prototype findActiveAppeal vs isActiveCertificateAppealStage + take:5)",
    status: "UNRESOLVED",
  },
  {
    id: "GAP-K8-4",
    owner: "Root+K1",
    topic: "storeCertificateScan.ts hook integration (outside K8 allowlist); idempotent createAppealFromCertificate",
    status: "UNRESOLVED",
  },
  {
    id: "GAP-K8-5",
    owner: "K2",
    topic: "Observer GET DTO must strip privateNotes/clientContact; GET must never write",
    status: "UNRESOLVED",
  },
] as const;

/** Legacy path prefix — superseded by client-appeals/observer/* in K8 handoff. */
export const CLIENTS_DEPRECATED_ROUTE_PREFIX = "/api/pro/referred-appeals";

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
  owner: "K1" | "K2" | "K5" | "P5" | "P6";
  authGate: string;
  notes?: string;
};

export const CLIENTS_CANONICAL_ROUTES: ClientsCanonicalRoute[] = [
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate:
      "GAP-K8-1: align with ownerClientsAccess principal eligibility + referrerProUserId === viewer; resolveAppealAccess observer; read-only",
    notes: "200: appeals[], branches[], personalMeta?, nextCursor. Wire: ObserverClientAppealPublicDto (GAP-K8-5).",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer/:appealId",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate: "referrer row scope; must not write",
    notes: "200: appeal + history[]; strip privateNotes/clientContact.",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer/by-branch/:receivingBranchId",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate: "same as list; branch id not client-supplied partner guess",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/observer/:appealId/personal-meta",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "NOT_IMPLEMENTED",
    owner: "K5",
    authGate: "viewerUserId + appealId; referrer scope",
    notes:
      "Body: alias, tag, note, bucket, beforeTrash, version. Table: PartnerClientAppealPersonalOverlay.",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/observer/personal-batch",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "NOT_IMPLEMENTED",
    owner: "K5",
    authGate: "same as personal-meta",
    notes: "Body: ids[], op set-tag|archive|trash|restore",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/receiving",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "BranchEmployee canManageLeads on receiving branch (forbidden to agent-only observer)",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/receiving",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "Receiving; manualEntry; cert create via GAP-K8-4 hook path",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/receiving/:appealId",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "Receiving; stage transitions per prototype canTransitionTo",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/receiving/batch",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "Receiving owner",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/receiving/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "Receiving branch settings",
    notes: "BLOCKED until GAP-K8-2 schema",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/receiving/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "NOT_IMPLEMENTED",
    owner: "K1",
    authGate: "Receiving branch settings",
    notes: "BLOCKED until GAP-K8-2 schema",
  },
];

export const CLIENTS_DECISIONS = [
  {
    id: "D1",
    topic: "appealId",
    p2Position:
      "Opaque string id in API (K8 candidate: cuid). Dedup natural key (certificateId + receivingBranchId) inside transactions — GAP-K8-3.",
    k8MustPublish: "appeal id + active uniqueness constraint",
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
      "Principal agent/specialist per ownerClientsAccess — NOT only BranchEmployee.canViewOwnOperations (GAP-K8-1). Referrer = referrerProUserId. Receiving uses canManageLeads on branch. No new permission bits.",
    k8MustPublish: "requireClientAppealsObserverContext aligned with existing gates",
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
      "K8 fc33 migration draft only; no K1 HTTP routes; GAP-K8-2 working-stages",
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
      "K8 core lib only; K2 routes missing; fetch-observer-appeals BLOCKED; GAP-K8-1 GAP-K8-5",
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
      "PartnerClientAppealPersonalOverlay in fc33 draft; K5 routes missing; UI notifyPersistenceBlock.",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
];

export function blockerForRequirement(requirementId: string): ContractBlocker | undefined {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.requirementIds.includes(requirementId));
}

export function routesForBlocker(blockerId: string): ClientsCanonicalRoute[] {
  return CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === blockerId);
}
