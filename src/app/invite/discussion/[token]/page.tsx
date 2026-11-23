import type { Metadata } from "next";
import { DiscussionInviteLanding } from "@/components/invite/DiscussionInviteLanding";
import { appConfig } from "@/lib/config";
import { buildInviteLinkMetadata, inviteOpenGraphImageUrl } from "@/lib/invite-presentation";
import { fetchPublicDiscussionInviteMetadata } from "@/lib/link-invite-public";

export const dynamic = "force-dynamic";

type DiscussionInvitePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(props: DiscussionInvitePageProps): Promise<Metadata> {
  const { token } = await props.params;
  const trimmed = token.trim();
  const origin = appConfig.appUrl;
  return buildInviteLinkMetadata({
    kind: "discussion",
    preview: await fetchPublicDiscussionInviteMetadata(trimmed),
    pageUrl: `${origin}/invite/discussion/${encodeURIComponent(trimmed)}`,
    ogImageUrl: inviteOpenGraphImageUrl(origin),
  });
}

export default async function DiscussionInvitePage(props: DiscussionInvitePageProps) {
  const params = await props.params;
  const token = decodeURIComponent(params.token ?? "").trim();
  return <DiscussionInviteLanding token={token} />;
}
