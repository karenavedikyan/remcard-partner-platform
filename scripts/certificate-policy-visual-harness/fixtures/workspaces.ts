import { emptyCertificatePolicyTerms } from "@/lib/certificate-policy/defaults";
import type {
  CertificatePolicyPatchBody,
  CertificatePolicyWorkspace,
  CertificatePolicyPublicSummary,
} from "@/lib/certificate-policy/types";
import type { StoreCertificate } from "@/lib/certificate-types";
import { getHarnessActiveSceneId } from "../harness-state";

const rates = [
  { category: "doors", categoryLabel: "Двери", poolPercent: 15 },
  { category: "floor", categoryLabel: "Напольные покрытия", poolPercent: 12.5 },
];

export const FIXTURE_GENERAL = emptyCertificatePolicyTerms(rates);

export function buildWorkspaceSuccess(): CertificatePolicyWorkspace {
  return {
    general: {
      scope: "general",
      effective: { ...FIXTURE_GENERAL, validityDays: 30, purchaseLimit: 2 },
      version: 3,
      categoryRatesRevision: "doors:15.0|floor:12.5",
    },
    counterparties: [
      {
        userId: "cp-store-opt",
        displayName: "Оптовик «Дом»",
        roleLabel: "Магазин",
        initials: "ОД",
        status: "general",
        partnershipId: "p-1",
        effective: { ...FIXTURE_GENERAL, validityDays: 30, purchaseLimit: 2 },
        individualVersion: null,
        pendingProposal: null,
      },
      {
        userId: "cp-master-ivan",
        displayName: "Иван Мастеров",
        roleLabel: "Специалист",
        initials: "ИМ",
        status: "individual",
        partnershipId: "p-2",
        effective: {
          ...FIXTURE_GENERAL,
          validityDays: 45,
          purchaseLimit: 1,
        },
        individualVersion: 2,
        pendingProposal: null,
      },
    ],
    incomingProposals: [],
  };
}

export function buildWorkspaceWithIncoming(viewerId: string): CertificatePolicyWorkspace {
  const base = buildWorkspaceSuccess();
  const proposal = {
    id: "prop-1",
    version: 1,
    proposerUserId: "cp-store-opt",
    receiverUserId: viewerId,
    createdAt: "2026-01-10T10:00:00.000Z",
    effective: { ...FIXTURE_GENERAL, validityDays: 30, purchaseLimit: 2 },
    proposed: {
      ...FIXTURE_GENERAL,
      validityDays: 60,
      purchaseLimit: 3,
      minimumPurchaseAmount: 5000,
    },
  };
  return {
    ...base,
    incomingProposals: [proposal],
    counterparties: base.counterparties.map((c) =>
      c.userId === "cp-store-opt"
        ? { ...c, status: "pending_outgoing" as const, pendingProposal: proposal }
        : c,
    ),
  };
}

export function buildWorkspacePendingOutgoing(): CertificatePolicyWorkspace {
  const base = buildWorkspaceSuccess();
  const proposal = {
    id: "prop-out",
    version: 2,
    proposerUserId: "viewer-store",
    receiverUserId: "cp-master-ivan",
    createdAt: "2026-01-11T11:00:00.000Z",
    effective: base.counterparties[1]!.effective,
    proposed: {
      ...base.counterparties[1]!.effective,
      validityDays: 90,
      purchaseLimit: 1,
    },
  };
  return {
    ...base,
    counterparties: base.counterparties.map((c) =>
      c.userId === "cp-master-ivan"
        ? {
            ...c,
            status: "pending_outgoing" as const,
            pendingProposal: proposal,
          }
        : c,
    ),
  };
}

export const harnessWorkspace = buildWorkspaceSuccess();

export function harnessWorkspaceForScene(sceneId: string): CertificatePolicyWorkspace {
  switch (sceneId) {
    case "settings-individual":
      return buildWorkspacePendingOutgoing();
    case "incoming-agent":
      return buildWorkspaceWithIncoming("viewer-agent");
    default:
      return buildWorkspaceSuccess();
  }
}

export function harnessWorkspaceAfterPatch(
  body: CertificatePolicyPatchBody,
  base: CertificatePolicyWorkspace = buildWorkspaceSuccess(),
): CertificatePolicyWorkspace {
  const next = structuredClone(base);
  if (body.action === "save_general" && body.terms) {
    next.general = {
      ...next.general,
      effective: body.terms,
      version: next.general.version + 1,
    };
    return next;
  }

  if (body.action === "approve_proposal" && body.proposalId) {
    const proposal = next.incomingProposals.find((p) => p.id === body.proposalId);
    next.incomingProposals = next.incomingProposals.filter((p) => p.id !== body.proposalId);
    if (proposal) {
      next.counterparties = next.counterparties.map((c) =>
        c.userId === proposal.proposerUserId
          ? {
              ...c,
              status: "individual",
              effective: { ...proposal.proposed },
              individualVersion: (c.individualVersion ?? 0) + 1,
              pendingProposal: null,
            }
          : c,
      );
    }
    return next;
  }

  if (body.action === "reject_proposal" && body.proposalId) {
    const proposal = next.incomingProposals.find((p) => p.id === body.proposalId);
    next.incomingProposals = next.incomingProposals.filter((p) => p.id !== body.proposalId);
    if (proposal) {
      next.counterparties = next.counterparties.map((c) =>
        c.userId === proposal.proposerUserId
          ? {
              ...c,
              status: "rejected_outgoing",
              pendingProposal: null,
              lastRejectedAt: new Date().toISOString(),
            }
          : c,
      );
    }
    return next;
  }

  if (body.action === "propose_individual" && body.counterpartyUserId && body.terms) {
    const sceneId = getHarnessActiveSceneId();
    const viewerUserId =
      workspaces.find((w) => w.id === sceneId)?.viewerUserId ?? "viewer-store";
    const counterparty = next.counterparties.find((c) => c.userId === body.counterpartyUserId);
    const effective = counterparty?.effective ?? next.general.effective;
    const proposal = {
      id: `prop-harness-${body.counterpartyUserId}`,
      version: 1,
      proposerUserId: viewerUserId,
      receiverUserId: body.counterpartyUserId,
      createdAt: new Date().toISOString(),
      effective,
      proposed: body.terms,
    };
    next.counterparties = next.counterparties.map((c) =>
      c.userId === body.counterpartyUserId
        ? { ...c, status: "pending_outgoing" as const, pendingProposal: proposal }
        : c,
    );
    return next;
  }

  return next;
}

export type HarnessScene = {
  id: string;
  label: string;
  kind:
    | "settings"
    | "profile-entry"
    | "public-catalog"
    | "catalog-details"
    | "issued-dark"
    | "issued-split"
    | "issued-legacy";
  certificate?: StoreCertificate;
  viewerUserId: string;
  canEditSettings: boolean;
  initialTab?: "settings" | "incoming";
  initialScope?: "general" | "individual";
  initialPartnerUserId?: string;
  publicSummary?: CertificatePolicyPublicSummary;
};

export const issuedCertificateSplit: StoreCertificate = {
  id: "cert-split",
  promoCode: "А-RC-SPLIT",
  qrCode: "qr-split",
  status: "EXPIRED",
  validUntil: "2020-01-01T00:00:00.000Z",
  maxUsages: 1,
  usageCount: 1,
  createdAt: "2026-01-01T09:00:00.000Z",
  discountPercent: 12,
  certificateUrl: "https://example.test/cert/split",
  partners: [
    {
      id: "cpA",
      storeUserId: "store-a",
      storeName: "Store A (истёк)",
      partnershipId: "p-a",
      isSelfScan: false,
      categories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 3 }],
      recipientPolicy: {
        validityDays: 30,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        policySource: "general",
        validUntil: "2026-01-01T00:00:00.000Z",
        consumedUses: 0,
        remainingPurchases: 1,
      },
    },
    {
      id: "cpB",
      storeUserId: "store-b",
      storeName: "Store B (активен)",
      partnershipId: "p-b",
      isSelfScan: false,
      categories: [{ category: "floor", categoryLabel: "Пол", discountPercent: 12, issuerPercent: 4 }],
      recipientPolicy: {
        validityDays: 60,
        purchaseLimit: 2,
        minimumPurchaseAmount: null,
        promotionsCompatible: true,
        exclusionsText: null,
        policySource: "individual",
        validUntil: "2026-12-01T00:00:00.000Z",
        consumedUses: 0,
        remainingPurchases: 2,
      },
    },
  ],
};

export const issuedCertificateLegacy: StoreCertificate = {
  id: "cert-legacy",
  promoCode: "А-RC-LEG",
  qrCode: "qr-leg",
  status: "ACTIVE",
  validUntil: "2027-01-01T00:00:00.000Z",
  maxUsages: 0,
  usageCount: 0,
  createdAt: "2026-01-01T09:00:00.000Z",
  discountPercent: 10,
  certificateUrl: "https://example.test/cert/legacy",
  partners: [
    {
      id: "cpL",
      storeUserId: "legacy-store",
      storeName: "Legacy store",
      partnershipId: "p-l",
      isSelfScan: false,
      categories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 3 }],
    },
  ],
};

export const issuedCertificate: StoreCertificate = {
  id: "cert-fixture",
  promoCode: "А-RC-FIXTURE",
  qrCode: "qr-fixture",
  status: "USED_PARTIALLY",
  validUntil: null,
  maxUsages: 0,
  usageCount: 1,
  createdAt: "2026-01-01T09:00:00.000Z",
  discountPercent: 15,
  partners: [
    {
      id: "cp1",
      storeUserId: "cp-store-opt",
      storeName: "Оптовик «Дом»",
      partnershipId: "p-1",
      isSelfScan: false,
      categories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 15, issuerPercent: 5 }],
      recipientPolicy: {
        validityDays: 30,
        purchaseLimit: 2,
        minimumPurchaseAmount: 3000,
        promotionsCompatible: false,
        exclusionsText: "Распродажа",
        policySource: "general",
        validUntil: "2026-01-30T20:59:59.999Z",
        consumedUses: 1,
        remainingPurchases: 1,
      },
    },
    {
      id: "cp2",
      storeUserId: "cp-master-ivan",
      storeName: "Иван Мастеров",
      partnershipId: "p-2",
      isSelfScan: false,
      categories: [{ category: "floor", categoryLabel: "Напольные покрытия", discountPercent: 12.5, issuerPercent: 4 }],
      recipientPolicy: {
        validityDays: 45,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: true,
        exclusionsText: null,
        policySource: "individual",
        validUntil: "2026-02-14T20:59:59.999Z",
        consumedUses: 0,
        remainingPurchases: 1,
      },
    },
    {
      id: "cp3",
      storeUserId: "cp-legacy",
      storeName: "Legacy limit store",
      partnershipId: "p-3",
      isSelfScan: false,
      categories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 3 }],
    },
  ],
};

export const workspaces: HarnessScene[] = [
  {
    id: "settings-general",
    label: "Settings · general",
    kind: "settings",
    viewerUserId: "viewer-store",
    canEditSettings: true,
    initialTab: "settings",
  },
  {
    id: "settings-individual",
    label: "Settings · individual pending",
    kind: "settings",
    viewerUserId: "viewer-store",
    canEditSettings: true,
    initialTab: "settings",
    initialScope: "individual",
    initialPartnerUserId: "cp-master-ivan",
  },
  {
    id: "incoming-agent",
    label: "Incoming · agent readonly",
    kind: "settings",
    viewerUserId: "viewer-agent",
    canEditSettings: false,
    initialTab: "incoming",
  },
  {
    id: "profile-owner",
    label: "Profile entry · owner",
    kind: "profile-entry",
    viewerUserId: "viewer-store",
    canEditSettings: true,
  },
  {
    id: "public-catalog",
    label: "Public catalog chips",
    kind: "public-catalog",
    viewerUserId: "viewer-store",
    canEditSettings: false,
    publicSummary: {
      validityDays: 30,
      purchaseLimit: 2,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
      items: rates.map((r) => ({ ...r, poolPercent: r.poolPercent })),
    },
  },
  {
    id: "catalog-details",
    label: "Catalog Details (policy + pools)",
    kind: "catalog-details",
    viewerUserId: "viewer-store",
    canEditSettings: false,
    publicSummary: {
      validityDays: 30,
      purchaseLimit: 2,
      minimumPurchaseAmount: 5000,
      promotionsCompatible: true,
      exclusionsText: "Не действует на распродажу",
      items: rates.map((r) => ({ ...r })),
    },
  },
  {
    id: "issued-dark",
    label: "Issued certificate (dark)",
    kind: "issued-dark",
    viewerUserId: "viewer-master",
    canEditSettings: false,
  },
  {
    id: "issued-split",
    label: "Issued A expired / B valid",
    kind: "issued-split",
    viewerUserId: "viewer-master",
    canEditSettings: false,
    certificate: issuedCertificateSplit,
  },
  {
    id: "issued-legacy",
    label: "Issued legacy red card",
    kind: "issued-legacy",
    viewerUserId: "viewer-master",
    canEditSettings: false,
    certificate: issuedCertificateLegacy,
  },
];