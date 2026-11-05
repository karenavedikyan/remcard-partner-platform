import type { CabinetPresentationSnapshot } from "./types";
import { employeeRequiresWorkplaceContext, isOrgWorkplaceMemberRole } from "./resolve";
import { validateProContextSnapshot } from "./validate";

export type CabinetPresentationBlock =
  | { blocked: false }
  | { blocked: true; kind: "session"; returnTo: string }
  | { blocked: true; kind: "transient"; message: string; returnTo: string }
  | { blocked: true; kind: "workplace"; message: string; returnTo: string };

export function resolveCabinetPresentationBlock(input: {
  isEmployee: boolean;
  presentation: CabinetPresentationSnapshot;
  returnTo: string;
}): CabinetPresentationBlock {
  const { presentation, isEmployee, returnTo } = input;
  const status = presentation.contextHttpStatus;

  if (isEmployee) {
    if (presentation.proContext) {
      const earlyValidation = validateProContextSnapshot(presentation.proContext);
      if (!earlyValidation.ok) {
        const message =
          earlyValidation.reason === "suspended"
            ? "Доступ к кабинету организации приостановлен."
            : "Рабочий контекст организации недоступен или некорректен.";
        return { blocked: true, kind: "workplace", returnTo, message };
      }
    }

    if (!presentation.contextReady) {
      if (status === 401 || status === 419) {
        return { blocked: true, kind: "session", returnTo };
      }
      if (status != null && status >= 500) {
        return {
          blocked: true,
          kind: "transient",
          returnTo,
          message: "Сервис временно недоступен. Повторите попытку.",
        };
      }
      return {
        blocked: true,
        kind: "workplace",
        returnTo,
        message: "Не удалось загрузить рабочий контекст организации.",
      };
    }

    const validation = validateProContextSnapshot(presentation.proContext);
    if (!validation.ok) {
      const message =
        validation.reason === "suspended"
          ? "Доступ к кабинету организации приостановлен."
          : "Рабочий контекст организации недоступен или некорректен.";
      return { blocked: true, kind: "workplace", returnTo, message };
    }

    if (employeeRequiresWorkplaceContext({ isEmployee: true, presentation })) {
      return {
        blocked: true,
        kind: "workplace",
        returnTo,
        message: "Для сотрудника не удалось определить тип организации (магазин или компания).",
      };
    }
  }

  if (presentation.contextReady && presentation.proContext) {
    const validation = validateProContextSnapshot(presentation.proContext);
    if (!validation.ok && validation.reason === "suspended") {
      return {
        blocked: true,
        kind: "workplace",
        returnTo,
        message: "Доступ к кабинету организации приостановлен.",
      };
    }
  }

  return { blocked: false };
}

/** Org staff (non-owner) uses shared template without owner home metrics / onboarding CTAs. */
export function isOrgStaffWorkplaceViewer(
  proContext: CabinetPresentationSnapshot["proContext"],
): boolean {
  const role = proContext?.role;
  return Boolean(role && isOrgWorkplaceMemberRole(role) && role !== "ORG_OWNER");
}
