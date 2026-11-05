import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import { resolveCabinetPresentation } from "./resolve";
import { validateProContextSnapshot } from "./validate";
import type { CabinetPresentationSnapshot } from "./types";

export type FetchCabinetPresentationResult = {
  presentation: CabinetPresentationSnapshot;
};

export async function fetchCabinetPresentationServer(input: {
  user: AuthUser;
  cookieHeader: string | null | undefined;
}): Promise<FetchCabinetPresentationResult> {
  const contextResult = await fetchRemcardUpstream<ProContextSnapshot>("/api/pro/context", {
    headers: input.cookieHeader ? { cookie: input.cookieHeader } : undefined,
  });
  const contextReady =
    contextResult.ok &&
    (contextResult.data?.role?.trim()
      ? validateProContextSnapshot(contextResult.data).ok
      : false);
  const presentation = resolveCabinetPresentation({
    user: input.user,
    proContext: contextResult.ok ? contextResult.data : null,
    contextReady,
    contextHttpStatus: contextResult.ok ? 200 : contextResult.status,
  });
  return { presentation };
}
