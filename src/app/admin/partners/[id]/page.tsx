import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1PartnerCardClient } from "./AdminR1PartnerCardClient";

export const dynamic = "force-dynamic";

export default async function AdminPartnerCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfPlatformAdmin(`/admin/partners/${id}`);
  return <AdminR1PartnerCardClient partnerId={id} />;
}
