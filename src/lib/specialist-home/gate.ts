import type { AuthUser } from "@/lib/types";
import type { SpecialistR06Status } from "@/lib/specialist-r06/types";

type R06Gate = Pick<SpecialistR06Status, "featureEnabled" | "eligible">;

/** Specialist prototype home — not store/company legacy home and not agent pilot root. */
export function shouldRenderSpecialistHome(
  user: Pick<AuthUser, "partnerType">,
  r06: R06Gate | null | undefined,
  options: { isAgentCabinet: boolean },
): boolean {
  if (options.isAgentCabinet) return false;
  if (user.partnerType !== "MASTER") return false;
  return Boolean(r06?.featureEnabled && r06?.eligible);
}
