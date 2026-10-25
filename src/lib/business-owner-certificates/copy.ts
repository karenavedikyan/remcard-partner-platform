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
    searchPlaceholder: "Код, название или партнёр",
  } as const;
}
