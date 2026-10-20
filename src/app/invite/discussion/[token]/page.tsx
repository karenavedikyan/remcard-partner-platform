import { DiscussionInviteLanding } from "@/components/invite/DiscussionInviteLanding";

export const dynamic = "force-dynamic";

export default async function DiscussionInvitePage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  const token = decodeURIComponent(params.token ?? "").trim();
  return <DiscussionInviteLanding token={token} />;
}
