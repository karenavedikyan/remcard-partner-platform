import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";

export type OrgModerationAction = "approve" | "approve-all" | "reject" | "revise";

export function orgApproveButtonLabel(org: ModerationOrgDetail): string {
  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    return "Одобрить заявку";
  }
  return "Одобрить заявку";
}

export function orgApproveConfirmMessage(org: ModerationOrgDetail): string {
  const base = `Одобрить заявку организации «${org.name}» (${org.partnerType})?`;
  const ownerNote = " Профиль владельца этим действием не одобряется.";
  if (org.isTestPartner && org.profTestPublicCatalogAllowed === false) {
    return (
      `${base}${ownerNote}\n\nПосле одобрения карточка останется скрытой, пока вы отдельно не разрешите публикацию тестового партнёра.`
    );
  }
  return `${base}${ownerNote}\n\nОдобренная версия организации станет доступна в каталоге (с учётом кэша).`;
}

export function orgApproveAllConfirmMessage(org: ModerationOrgDetail): string {
  const pending = org.branches.filter((b) => b.catalogStatus === "PENDING");
  const names = pending.map((b) => b.submitted.name ?? b.id).join(", ");
  return (
    `Одобрить организацию «${org.name}» и ${pending.length} филиал(ов) на проверке?\n\n` +
    `Филиалы: ${names}\n\n` +
    "Профиль владельца не одобряется."
  );
}

export function orgRejectConfirmMessage(org: ModerationOrgDetail): string {
  if (org.live.catalogPublished) {
    return (
      `Отклонить отправленную заявку «${org.name}»?\n\n` +
      "Текущая опубликованная версия в каталоге сохранится; отклоняется только новая отправленная заявка."
    );
  }
  return `Отклонить заявку «${org.name}»? Карточка не будет опубликована.`;
}

export function orgReviseConfirmMessage(org: ModerationOrgDetail): string {
  return `Вернуть организацию «${org.name}» на доработку? Партнёр увидит ваш комментарий.`;
}

export function staleRevisionUserMessage(): string {
  return "Заявка изменилась или уже обработана. Обновите карточку и повторите решение.";
}
