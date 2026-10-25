export type IssuerCertificatesApiMode = "specialist" | "business";

export async function fetchIssuerCertificate(mode: IssuerCertificatesApiMode, id: string) {
  if (mode === "business") {
    const { fetchBusinessOwnerCertificate } = await import("./api");
    return fetchBusinessOwnerCertificate(id);
  }
  const { fetchSpecialistIssuerCertificate } = await import("@/lib/specialist-certificates/api");
  return fetchSpecialistIssuerCertificate(id);
}

export async function patchIssuerCertificate(
  mode: IssuerCertificatesApiMode,
  id: string,
  body: Record<string, unknown>,
) {
  if (mode === "business") {
    const { patchBusinessOwnerCertificate } = await import("./api");
    return patchBusinessOwnerCertificate(id, body);
  }
  const { patchSpecialistIssuerCertificate } = await import("@/lib/specialist-certificates/api");
  return patchSpecialistIssuerCertificate(id, body);
}

export async function deleteIssuerCertificate(mode: IssuerCertificatesApiMode, id: string) {
  if (mode === "business") {
    const { deleteBusinessOwnerCertificate } = await import("./api");
    return deleteBusinessOwnerCertificate(id);
  }
  const { deleteSpecialistIssuerCertificate } = await import("@/lib/specialist-certificates/api");
  return deleteSpecialistIssuerCertificate(id);
}

export async function batchIssuerCertificates(
  mode: IssuerCertificatesApiMode,
  body: { action: "archive" | "restore" | "delete"; ids: string[] },
) {
  if (mode === "business") {
    const { batchBusinessOwnerCertificates } = await import("./api");
    return batchBusinessOwnerCertificates(body);
  }
  const { batchSpecialistIssuerCertificates } = await import("@/lib/specialist-certificates/api");
  return batchSpecialistIssuerCertificates(body);
}
