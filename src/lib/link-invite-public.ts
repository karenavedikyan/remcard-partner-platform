import { fetchRemcardUpstream } from "@/lib/remcard-server";

/** Bounded wait for SSR metadata; failures must not break /invite pages. */
export const LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS = 5_000;

/** Test seam only — production code always uses fetchRemcardUpstream. */
export const linkInvitePublicPreviewDeps = {
  fetchUpstream: fetchRemcardUpstream,
};

export type LinkInvitePublicTerm = {
  category: string;
  categoryLabel: string;
  storePercent: number;
  isExcluded: boolean;
};

export type LinkInvitePublicPreview = {
  status: string;
  inviter?: {
    displayName: string;
    partnerType: string | null;
    city: string | null;
  };
  intendedPartnerType?: string | null;
  terms?: LinkInvitePublicTerm[];
  note?: string | null;
  expiresAt?: string;
};

export async function fetchPublicLinkInvitePreview(
  token: string,
): Promise<LinkInvitePublicPreview | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { status: "NOT_FOUND" };
  }

  try {
    const result = await linkInvitePublicPreviewDeps.fetchUpstream<LinkInvitePublicPreview>(
      `/api/partnership/link-invite/public/${encodeURIComponent(trimmed)}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS),
      },
    );

    if (!result.ok) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}
