import { loadRegistrationWizardState } from "./draft";
import type { RegistrationCapabilities, RegistrationKind } from "./types";
import { REGISTRATION_KIND_LABELS } from "./types";
import { isJoinRegistrationKind } from "./join-finish";

export function parseJoinKindFromFinishReturnTo(
  returnTo: string | null | undefined,
): RegistrationKind | null {
  if (!returnTo?.includes("phase=finish")) return null;
  const match = returnTo.match(/[?&]role=(agent|specialist|store|company)\b/i);
  if (!match?.[1]) return null;
  const role = match[1].toLowerCase();
  if (role === "agent" || role === "specialist" || role === "store" || role === "company") {
    return role;
  }
  return null;
}

/** Whether the new /join path is enabled for this kind (never implies legacy onboarding for agent). */
export function isJoinKindRegistrationEnabled(
  caps: RegistrationCapabilities | null | undefined,
  kind: RegistrationKind,
): boolean {
  if (!caps || !isJoinRegistrationKind(kind)) return false;
  if (caps.joinKinds?.[kind] === false) return false;
  const joinPath = Boolean(caps.joinRegistrationPathEnabled ?? caps.agentRegistrationPathEnabled);
  if (kind === "agent") {
    return Boolean(caps.agentRegistrationPathEnabled) && joinPath;
  }
  return joinPath;
}

export type FinishJoinKindResolution =
  | { status: "ok"; kind: RegistrationKind }
  | { status: "mismatch"; wizardKind: RegistrationKind; urlRole: RegistrationKind }
  | { status: "missing" };

/** Wizard/draft choice wins; URL role must match when both are present. */
export function finishJoinContextErrorMessage(resolution: Exclude<FinishJoinKindResolution, { status: "ok" }>): string {
  if (resolution.status === "mismatch") {
    return `Тип в ссылке («${REGISTRATION_KIND_LABELS[resolution.urlRole].title}») не совпадает с выбранным («${REGISTRATION_KIND_LABELS[resolution.wizardKind].title}»). Продолжите из регистрации без смены типа.`;
  }
  if (resolution.status === "missing") {
    return "Не удалось восстановить тип регистрации. Вернитесь к выбору типа и пройдите шаги снова.";
  }
  return "";
}

export function readFinishJoinKindResolution(
  urlRole: RegistrationKind | null | undefined,
): FinishJoinKindResolution {
  const saved = loadRegistrationWizardState();
  return resolveValidatedFinishJoinKind({
    wizardKind: saved?.kind,
    urlRole,
  });
}

export function resolveValidatedFinishJoinKind(input: {
  wizardKind: RegistrationKind | "" | null | undefined;
  urlRole: RegistrationKind | null | undefined;
}): FinishJoinKindResolution {
  const wizard =
    input.wizardKind && isJoinRegistrationKind(input.wizardKind) ? input.wizardKind : null;
  const url = input.urlRole && isJoinRegistrationKind(input.urlRole) ? input.urlRole : null;
  if (wizard && url && wizard !== url) {
    return { status: "mismatch", wizardKind: wizard, urlRole: url };
  }
  const kind = wizard ?? url;
  if (!kind) return { status: "missing" };
  return { status: "ok", kind };
}
