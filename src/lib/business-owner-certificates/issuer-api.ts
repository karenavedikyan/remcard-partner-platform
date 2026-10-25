import {
  batchBusinessOwnerCertificates,
  deleteBusinessOwnerCertificate,
  fetchBusinessOwnerCertificate,
  patchBusinessOwnerCertificate,
} from "./api";
import {
  batchSpecialistIssuerCertificates,
  deleteSpecialistIssuerCertificate,
  fetchSpecialistIssuerCertificate,
  patchSpecialistIssuerCertificate,
} from "@/lib/specialist-certificates/api";

export type IssuerCertificatesApiMode = "specialist" | "business";

export function issuerCertificatesApi(mode: IssuerCertificatesApiMode) {
  if (mode === "business") {
    return {
      fetchCertificate: fetchBusinessOwnerCertificate,
      patchCertificate: patchBusinessOwnerCertificate,
      deleteCertificate: deleteBusinessOwnerCertificate,
      batchCertificates: batchBusinessOwnerCertificates,
    };
  }
  return {
    fetchCertificate: fetchSpecialistIssuerCertificate,
    patchCertificate: patchSpecialistIssuerCertificate,
    deleteCertificate: deleteSpecialistIssuerCertificate,
    batchCertificates: batchSpecialistIssuerCertificates,
  };
}
