import { PartnerModerationDetailClient } from "./PartnerModerationDetailClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PartnerModerationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const q = qs.toString();
  await requireProfPlatformAdmin(`/admin/moderation/partners/${id}${q ? `?${q}` : ""}`);
  return <PartnerModerationDetailClient partnerId={id} />;
}
