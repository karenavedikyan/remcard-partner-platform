export type CertificateStatus =
  | "ACTIVE"
  | "USED_PARTIALLY"
  | "USED_FULLY"
  | "EXPIRED"
  | "CANCELLED"
  | string;

export type CertificateCategory = {
  id?: string;
  category: string;
  categoryLabel: string;
  discountPercent: number;
  issuerPercent?: number;
};

export type CertificatePartner = {
  id: string;
  storeUserId: string;
  storeName: string;
  partnershipId: string | null;
  isSelfScan: boolean;
  categories: CertificateCategory[];
};

export type StoreCertificate = {
  id: string;
  promoCode: string;
  qrCode: string;
  status: CertificateStatus;
  validUntil: string | null;
  maxUsages: number;
  usageCount: number;
  createdAt: string;
  certificateUrl?: string | null;
  discountPercent?: number | null;
  storeNames?: string[] | null;
  partners?: CertificatePartner[];
  clientUser?: { displayName?: string | null; id?: string } | null;
};

export type CertificateListResponse = {
  certificates: StoreCertificate[];
};

export type AvailablePartnerCategory = {
  category: string;
  categoryLabel: string;
  poolPercent?: number;
  discountPercent: number;
  issuerPercent: number;
  isSelfScan?: boolean;
};

export type AvailablePartner = {
  partnershipId: string | null;
  storeUserId: string;
  storeName: string;
  displayName?: string | null;
  city: string | null;
  isSelfScan: boolean;
  categories: AvailablePartnerCategory[];
  programReady?: boolean;
  programMissing?: string[];
};

export type AvailablePartnersResponse = {
  partners: AvailablePartner[];
  selfScanPartner?: AvailablePartner | null;
};

export type CreateCertificatePartnerInput = {
  storeUserId: string;
  storeName: string;
  partnershipId?: string | null;
  isSelfScan: boolean;
  categories: Array<{
    category: string;
    categoryLabel: string;
    discountPercent: number;
    issuerPercent: number;
  }>;
};

export type CreateCertificateBody = {
  clientUserId?: string | null;
  validUntil?: string;
  maxUsages?: number;
  partners: CreateCertificatePartnerInput[];
};

export type PublicCertificatePartner = {
  id: string;
  storeUserId: string;
  publicName?: string;
  name?: string;
  categories: Array<{ categoryLabel: string; discountPercent: number }>;
};

export type PublicCertificatePayload = {
  promoCode: string;
  qrCode: string;
  status: string;
  discountPercent: number;
  storeNames: string[];
  partners: PublicCertificatePartner[];
  validUntil: string | null;
  usageCount: number;
  maxUsages: number;
  usageLabel: string;
  certificateUrl: string;
};
