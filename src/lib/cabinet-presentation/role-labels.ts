const CONTEXT_ROLE_LABELS: Record<string, string> = {
  ORG_OWNER: "Владелец организации",
  ORG_EMPLOYEE: "Сотрудник организации",
  ORG_TEAM_MEMBER: "Участник команды",
  BRANCH_MANAGER: "Управляющий филиалом",
  BRANCH_EMPLOYEE: "Сотрудник филиала",
  PARTNER_MANAGER: "Менеджер партнёра",
  PARTNER_EMPLOYEE: "Сотрудник партнёра",
  PARTNER_EMPLOYEE_SUSPENDED: "Доступ приостановлен",
  SOLO_PARTNER: "Партнёр",
};

export function proContextRoleLabelRu(role: string | null | undefined): string | null {
  if (!role?.trim()) return null;
  return CONTEXT_ROLE_LABELS[role] ?? null;
}
