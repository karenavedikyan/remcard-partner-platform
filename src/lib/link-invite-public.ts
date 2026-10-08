import { fetchRemcardUpstream } from "@/lib/remcard-server";

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

  const result = await fetchRemcardUpstream<LinkInvitePublicPreview>(
    `/api/partnership/link-invite/public/${encodeURIComponent(trimmed)}`,
    { method: "GET" },
  );

  if (!result.ok) {
    return null;
  }

  return result.data;
}
