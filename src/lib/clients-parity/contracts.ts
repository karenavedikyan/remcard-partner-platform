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
  schemaCoreCommitSha: "e11f7e59e6759bf3f67eb1829f7cff0e006de73e",
  priorSchemaCoreCommitSha: "629de67e4ea4737eb7a855e4ee9808bcd8f8d4d8",
  k1ReceivingDoc: "src/lib/clientAppeals/K1_RECEIVING_API.md",
  k2ObserverDoc: "src/lib/clientAppeals/K2_OBSERVER_API.md",
  k2HttpDraftCommitSha: "72193c7853df8291a5b7956059d574b834cdbce7",
  canonicalModule: "src/lib/clientAppeals/contract.ts",
  handoffDoc: "src/lib/clientAppeals/HANDOFF.md",
  migrationDraft: "prisma/migrations/20261113203000_client_appeals/migration.sql",
  partnerInventoryPaths: [
    "src/lib/clients-parity/contracts.ts",
    "src/lib/clients-parity/types.ts",
  ],
  auditReconcile: "audit/remcard-parallel-20261113/P2/K8-e11f7e59-list-response-reconcile-20261113.md",
} as const;

/**
 * One canonical list envelope per layer — no competing `{ appeals }` on K8 lib/receiving HTTP.
 * P5 maps navigator `items` → partner `appeals`; `receivingBranches` → `partners`.
 */
export const CLIENTS_LIST_RESPONSE_CONTRACT = {
  k8LibReceiving: {
    owner: "K1/K8",
    fn: "listReceivingAppeals",
    shape: "{ items: ClientAppealRecord[], nextCursor: string | null }",
    forbiddenAliases: ["appeals"],
    doc: CLIENTS_K8_SOURCE_OF_TRUTH.k1ReceivingDoc,
  },
  k8LibObserver: {
    owner: "K2/K8",
    fn: "listObserverReferrerAppeals",
    shape: "{ items: ClientAppealRecord[], nextCursor: string | null }",
    forbiddenAliases: ["appeals"],
    include: "APPEAL_RECORD_LIST_INCLUDE + mapPartnerClientAppealToRecord",
    doc: CLIENTS_K8_SOURCE_OF_TRUTH.k2ObserverDoc,
  },
  k2HttpObserverTarget: {
    owner: "K2",
    route: "GET /api/pro/client-appeals/observer (canonical)",
    legacyInterimRoute: "/api/pro/referred-appeals",
    shape:
      "{ items: ClientAppealObserverReadDto[], receivingBranches: ObserverBranchPartnerMetaWire[], personalMeta?: Record<string, ObserverPersonalMeta>, page?, limit?, total?, hasMore?, nextCursor? }",
    pagination: "page/limit until K2 converges with lib cursor; then nextCursor primary",
    paidAmountRule:
      "paidAmountKopecks is DTO-only from recordMap.ts (order.totalAmount); not a Prisma column select",
  },
  k2HttpObserverActual72193c78: {
    owner: "K2",
    route: "GET /api/pro/referred-appeals",
    shape: "{ items, page, limit, total, hasMore, empty }",
    missingForP3: ["receivingBranches", "personalMeta", "ClientAppealObserverReadDto allowlist fields"],
    ormGap: "GAP-K8-F: OBSERVER_APPEAL_ROW_SELECT.paidAmountKopecks",
  },
  partnerP3Normalized: {
    owner: "P3 list fetch (+ P5 field rename only)",
    shape: "{ appeals, partners, personalMeta?, nextCursor? }",
    acceptsAliases: {
      personalMeta: ["personalOverlays"],
    },
    mapsFromK2Http72193c78: {
      appeals: "items[] → ObserverReferredAppeal via OBSERVER_APPEAL_ADAPTER_MAP",
      partners:
        "derive distinct receivingBranchId from items + branch display join (K2 list must supply branch meta — not invented defaults)",
      personalMeta:
        "Record<appealId, ObserverPersonalMeta> from K2/K5 embed on list GET only; omit key when server sends none",
      pagination: "page, limit, total, hasMore (not cursor) until K2 converges with k8 lib",
    },
    type: "ObserverAppealsLoadResult ok branch in types.ts",
  },
} as const;

/** Navigator routes that exist in source @ 2026-11-13 — inventory authority over P5/P2 rename drafts. */
export const CLIENTS_NAVIGATOR_ACTUAL_HTTP = {
  k2ListDraftSha: "72193c7853df8291a5b7956059d574b834cdbce7",
  k5PersonalDraftSha: "86ac3e354dc543817c061cb43565d0bf77545ab0",
  observerList: {
    method: "GET",
    path: "/api/pro/referred-appeals",
    owner: "K2",
    response200:
      "{ items: ObserverReferredAppeal[], page, limit, total, hasMore, empty }",
    errors: "401 UNAUTHORIZED; 403 OBSERVER_REFERRER_INELIGIBLE; 400 OBSERVER_LIST_BAD_QUERY; 503 OBSERVER_APPEALS_SCHEMA_UNAVAILABLE",
    notBlockedContract: "Explicit 401/403/404 are HTTP outcomes, not partner BLOCKED_CONTRACT",
  },
  personalMetaPatch: {
    method: "PATCH",
    path: "/api/pro/referred-appeals/:appealId/personal-meta",
    owner: "K5",
    bodyKeys: ["expectedVersion?", "alias?", "tag?", "note?", "action?", "target?"],
    actionValues: "move | restore (field edits when action omitted)",
    targetValues: "archived | trash when action=move",
    response200: "{ meta: PersonalMetaProjection }",
    projectionFields: ["appealId", "alias", "tag", "note", "bucket", "version", "updatedAt"],
    errors:
      "401; 403 CSRF|OBSERVER_PERSONAL_INELIGIBLE; 400 VALIDATION; 404 NOT_FOUND; 409 VERSION_CONFLICT|BUCKET_LOCKED; 503 PERSISTENCE_UNAVAILABLE",
  },
  personalBatch: {
    method: "POST",
    path: "/api/pro/referred-appeals/personal-batch",
    owner: "K5",
    bodyKeys: ["action", "ids", "target?", "tag?", "mode?", "expectedVersions?"],
    actionValues: "move | restore | setTag",
    modeValues: "atomic | best_effort",
    response200:
      "{ action, mode, processedCount, skippedCount, processed: PersonalMetaProjection[], skipped: { appealId, reason }[] }",
  },
  p1ProxyAllowlistOwner: "P1",
  p1MustAllowPatterns: [
    "^/api/pro/referred-appeals$",
    "^/api/pro/referred-appeals/[\\w-]+/personal-meta$",
    "^/api/pro/referred-appeals/personal-batch$",
  ],
  p5WrongPathsReject: [
    "PATCH /api/pro/client-appeals/:appealId/personal-overlay",
    "POST /api/pro/client-appeals/personal-overlay/batch",
  ],
  p5WrongCommit: "518f6dd8c14f43c93354bf00be297e5093abd90f",
} as const;

/** K5 `PersonalMetaProjection` → prototype `ObserverPersonalMeta` (map key = meta.appealId). */
export const OBSERVER_K5_META_PROJECTION_MAP = {
  alias: "alias",
  tag: "tag",
  note: "note",
  bucket: "bucket",
  version: "version",
  updatedAt: "updatedAt",
  beforeTrash: "UNRESOLVED — not in K5 projection JSON (GAP-K5-I)",
} as const;

/** P5 batch `op` names are NOT navigator wire — map to K5 `action` before HTTP. */
export const OBSERVER_P5_TO_K5_BATCH_ACTION = {
  "set-tag": "setTag",
  "set-bucket": "move",
  restore: "restore",
} as const;

export const CLIENTS_SECTION_OWNERS = {
  navigatorK2List: "K2",
  navigatorK5Personal: "K5",
  partnerProxyAllowlist: "P1",
  partnerListFetchAdapter: "P3",
  partnerPersonalHttpClient: "P5",
  partnerUi: "P6",
  contractInventory: "P2",
} as const;

/** Root review @ 629de67e; gaps A–D closed @ e11f7e59 — not accepted production release. */
export const CLIENTS_K8_UNRESOLVED_GAPS = [
  {
    id: "GAP-K8-A",
    owner: "K8",
    topic:
      "repository.ts: P2002 catch + findFirst inside same $transaction after failed INSERT (aborted PG tx)",
    status: "RESOLVED_e11f7e59",
    requiredFix: "resolveCertificateCreateRace outside aborted tx",
  },
  {
    id: "GAP-K8-B",
    owner: "K8",
    topic:
      "eligibility.ts: canObserverListIncludeAppeal uses ownerUserId only; org workplace must require viewerUserId === eligible principal === referrerProUserId",
    status: "RESOLVED_e11f7e59",
  },
  {
    id: "GAP-K8-C",
    owner: "K8",
    topic:
      "resolveAppealAccess: optional options default principalAgentObserverOnly=false — receiving must not silently grant when context omitted",
    status: "RESOLVED_e11f7e59",
    requiredFix: "TrustedAppealAccessContext required (access.ts)",
  },
  {
    id: "GAP-K8-D",
    owner: "K8",
    topic:
      "dto.ts: Omit/spread blacklist; need explicit observer allowlist matching ObserverAppealK2WireDto in types.ts",
    status: "RESOLVED_e11f7e59",
    requiredFix: "ClientAppealObserverReadDto + toObserverAppealDto allowlist",
  },
  {
    id: "GAP-K8-E",
    owner: "K8+K1",
    topic:
      "PartnerClientAppealPartnerSettings keyed by organizationId vs prototype partnerSettings[receivingPartnerId] (branch)",
    status: "UNRESOLVED",
    p2AdapterRule:
      "UI group by receivingBranchId; settings API keyed by org until product decides branch-level override",
  },
  {
    id: "GAP-K8-F",
    owner: "K2",
    topic:
      "GET /api/pro/referred-appeals @72193c78: Prisma select paidAmountKopecks + count where paidAmountKopecks — column does not exist on PartnerClientAppeal",
    status: "UNRESOLVED",
    requiredFix:
      "Use APPEAL_RECORD_LIST_INCLUDE + mapPartnerClientAppealToRecord or toObserverAppealDto; align with observerList.ts",
  },
  {
    id: "GAP-K8-G",
    owner: "K2+K5",
    topic:
      "K2 HTTP list missing receivingBranches + personalMeta required for P3 ObserverAppealsLoadResult",
    status: "UNRESOLVED",
    requiredFix:
      "Emit CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverTarget fields on canonical observer GET",
  },
  {
    id: "GAP-K8-H",
    owner: "K2",
    topic:
      "Inventory target `/api/pro/client-appeals/observer` vs actual `GET /api/pro/referred-appeals` @72193c78",
    status: "UNRESOLVED",
    requiredFix: "P1 allowlists actual paths now; optional alias route later — do not block on rename",
  },
  {
    id: "GAP-P5-518f6dd8",
    owner: "P5",
    topic:
      "observer-personal-api.ts calls personal-overlay routes and expects `{ overlay }` — paths do not exist on navigator",
    status: "UNRESOLVED",
    requiredFix:
      "Call CLIENTS_NAVIGATOR_ACTUAL_HTTP personal-meta/personal-batch; parse `{ meta }` and batch `processed[]`",
  },
  {
    id: "GAP-K5-I",
    owner: "K5",
    topic: "PATCH 200 `meta` projection omits `beforeTrashBucket` (prototype beforeTrash)",
    status: "UNRESOLVED",
  },
] as const;

export const CLIENTS_K8_OPEN_GAPS = CLIENTS_K8_UNRESOLVED_GAPS.filter(
  (g) => g.status === "UNRESOLVED",
);

export const CLIENTS_PARTNER_SETTINGS_SCOPE = {
  prototype: "partnerSettings[receivingPartnerId] — one pipeline per receiving partner (demo id = branch storefront)",
  k8Candidate629de67: "PartnerClientAppealPartnerSettings.organizationId @unique — shared across org branches",
  p2Decision: "UNRESOLVED (GAP-K8-E): confirm org-wide vs per-branch before K1 working-stages CRUD",
  appealRowAnchor: "receivingBranchId + receivingOrganizationId on PartnerClientAppeal",
} as const;

/** Stable P5/P6 adapter: K2 allowlist DTO → ObserverReferredAppeal (no User.id receiving identity). */
export const OBSERVER_APPEAL_ADAPTER_MAP = {
  id: "id",
  clientDisplayName: "clientName",
  stageKey: "stageId",
  referrerProUserId: "referrerPartnerId",
  receivingBranchId: "receivingPartnerId",
  receivingOrganizationId: "receivingOrganizationId",
  orderId: "purchaseId",
  paidAmountKopecks: "paidAmount",
  createdAt: "referralAt",
  manualSourceKey: "manualEntry",
  originKind: "manualEntry",
} as const;

/** Navigator actual observer + personal routes @ K2/K5 drafts (not a deprecated alias). */
export const CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX = "/api/pro/referred-appeals";

/** @deprecated typo guard — use CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX */
export const CLIENTS_DEPRECATED_ROUTE_PREFIX = CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX;

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
    notes:
      "200: CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverTarget (items[], receivingBranches[], personalMeta?). P5 → appeals/partners.",
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
    path: "/api/pro/referred-appeals/:appealId/personal-meta",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "DRAFT_K8",
    owner: "K5",
    authGate: "session viewerUserId + CSRF + requireOwnerClientsListContext; row referrerProUserId === viewer",
    notes:
      "Actual @86ac3e35: body expectedVersion?, alias?, tag?, note?, action? move|restore, target?; 200 { meta }. P1 proxy only.",
  },
  {
    method: "POST",
    path: "/api/pro/referred-appeals/personal-batch",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "DRAFT_K8",
    owner: "K5",
    authGate: "same as personal-meta",
    notes:
      "Actual @86ac3e35: action move|restore|setTag, ids[], mode atomic|best_effort, expectedVersions?; 200 processed/skipped counts.",
  },
  {
    method: "GET",
    path: "/api/pro/referred-appeals",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "DRAFT_K8",
    owner: "K2",
    authGate: "requireObserverReferredAppealsRead @72193c78",
    notes:
      "Actual list wire { items, page, limit, total, hasMore }; P3 adapts to appeals/partners/personalMeta. GAP-K8-F/G.",
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
    p2Position:
      "P1 alone edits `remcard-proxy.ts` allowlist for navigator paths. P3 list adapter + P5 HTTP client map wire; not proxy ownership.",
    k8MustPublish: "Stable referred-appeals paths before P1 allowlist merge",
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
