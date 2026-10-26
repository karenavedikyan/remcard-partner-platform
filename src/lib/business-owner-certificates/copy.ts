import type { AuthUser } from "@/lib/types";

export function businessCertificatesPageCopy(user: Pick<AuthUser, "partnerType">) {
  const eyebrow = user.partnerType === "COMPANY" ? "Компания" : "Магазин";
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
