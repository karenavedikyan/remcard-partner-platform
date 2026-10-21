import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { RemcardApiError } from "@/lib/api-client";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";

export async function promptAndPatchSpecialistCertificateDiscounts(cert: AgentCertificateRow) {
  if (cert.hasOrders) {
    window.alert("Нельзя изменить условия сертификата с покупками или использованиями.");
    return false;
  }
  const offer = cert.partnerOffers?.[0];
  const cat = offer?.categories?.[0];
  const term = cert.terms?.[0];
  if (!offer?.storeUserId || !cat?.category || !term) {
    window.alert("Нет категорий для редактирования.");
    return false;
  }
  const next = window.prompt(
    `Скидка клиенту для «${term.categoryName}» (%)`,
    String(term.discountPercent),
  );
  if (next == null) return false;
  const discountPercent = Number(String(next).replace(",", "."));
  if (!Number.isFinite(discountPercent)) {
    window.alert("Укажите число.");
    return false;
  }
  try {
    await patchSpecialistIssuerCertificate(cert.id, {
      action: "updateDiscounts",
      updates: [{ storeUserId: offer.storeUserId, category: cat.category, discountPercent }],
    });
    return true;
  } catch (caught) {
    window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    return false;
  }
}
