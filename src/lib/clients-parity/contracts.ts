/**
 * Read-only inventory of production API routes required for Clients parity.
 * No backend edits in REMCLIENTS-PARITY-20261113-V1.
 */

export const CLIENTS_PARITY_PROTOTYPE_SHA = "3dc31836cd18d9209c20097f18b906dd276f7af6";
export const CLIENTS_PARITY_PRODUCTION_BASE_SHA = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";

export type ContractBlocker = {
  id: string;
  requirementIds: string[];
  summary: string;
  missingApi: string[];
  evidence: string;
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
    missingApi: [
      "GET/POST /api/pro/client-appeals (list + create)",
      "PATCH /api/pro/client-appeals/:id",
      "POST /api/pro/client-appeals/batch",
      "GET/POST /api/pro/client-appeals/working-stages",
    ],
    evidence: "src/lib/remcard-proxy.ts allows only /api/pro/agent-clients*; no client-appeals routes.",
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
    missingApi: [
      "GET /api/pro/referred-appeals (or equivalent list for referrer)",
      "GET /api/pro/referred-appeals/:id",
      "GET /api/pro/referred-appeals/by-partner/:partnerId",
    ],
    evidence:
      "Prototype uses in-memory ownReferredAppeals(); production proxy has no referred/observer endpoints.",
  },
  {
    id: "BLK-OBSERVER-PERSONAL-PERSIST",
    requirementIds: ["C35", "C36", "C37", "C38"],
    summary: "Личные alias/метка/заметка/корзина наблюдателя с сохранением после reload.",
    missingApi: [
      "PATCH /api/pro/referred-appeals/:id/personal-meta",
      "POST /api/pro/referred-appeals/personal-batch",
    ],
    evidence: "Only /api/pro/agent-clients PATCH exists; semantics differ (owner CRM, not observer personal layer).",
  },
];

export function blockerForRequirement(requirementId: string): ContractBlocker | undefined {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.requirementIds.includes(requirementId));
}
