import type { AuthUser } from "@/lib/types";

export function businessCertificatesPageCopy(
  user: Pick<AuthUser, "partnerType">,
  options?: { employerLabel?: string | null },
) {
  const eyebrow =
    options?.employerLabel?.trim() || (user.partnerType === "COMPANY" ? "Компания" : "Магазин");
  return {
    eyebrow,
    title: "Сертификаты",
    description:
      "Создавайте сертификаты для клиентов, делитесь ссылками и следите за их статусом.",
    createCta: "Создать сертификат",
    emptyTitle: "Пока нет сертификатов.",
    emptyHint: "Выберите партнёра и отправьте сертификат клиенту.",
    emptyCollection: "Пока нет сертификатов. Выберите партнёра и отправьте сертификат клиенту.",
    clientArrivedSummary: "Клиент пришёл с сертификатом?",
    clientArrivedHint:
      "Не создавайте новый. Проверьте сертификат клиента перед оформлением покупки.",
    verifyCertificateCta: "Проверить сертификат",
    searchPlaceholder: "Код, название или партнёр",
  } as const;
}

/** Shown instead of the list when the employee has no certificate permission (server answers 403). */
export const BUSINESS_CERTIFICATES_NO_ACCESS_NOTE =
  "Сертификаты филиала доступны сотрудникам с правом на сертификаты.";
