import type { ModerationPartnerDetail } from "@/lib/prof-admin-moderation-partner-display";
import { staleRevisionUserMessage } from "@/lib/prof-admin-moderation-org-actions";

export type PartnerModerationAction = "approve" | "reject" | "revise";

export function partnerApproveConfirmMessage(partner: ModerationPartnerDetail): string {
  const name = partner.submitted.displayName ?? partner.publicId;
  const base = `Одобрить заявку «${name}» (${partner.partnerType ?? "партнёр"})?`;
  if (partner.isTestPartner && partner.profTestPublicCatalogAllowed === false) {
    return (
      `${base}\n\nПосле одобрения карточка останется скрытой, пока вы отдельно не разрешите публикацию тестового партнёра.`
    );
  }
  return `${base}\n\nОдобренная версия станет доступна в каталоге (с учётом кэша).`;
}

export function partnerRejectConfirmMessage(partner: ModerationPartnerDetail): string {
  const name = partner.submitted.displayName ?? partner.publicId;
  if (partner.live.isPublic) {
    return (
      `Отклонить отправленную заявку «${name}»?\n\n` +
      "Текущая опубликованная версия сохранится; отклоняется только новая заявка."
    );
  }
  return `Отклонить заявку «${name}»? Карточка не будет опубликована.`;
}

export function partnerReviseConfirmMessage(partner: ModerationPartnerDetail): string {
  const name = partner.submitted.displayName ?? partner.publicId;
  return `Вернуть «${name}» на доработку? Партнёр увидит ваш комментарий.`;
}

export { staleRevisionUserMessage };
