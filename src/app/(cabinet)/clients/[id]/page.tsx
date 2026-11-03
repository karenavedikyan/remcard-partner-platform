import { SessionGate } from "@/components/auth/SessionGate";
import { ClientDetailWorkspace } from "@/components/clients/ClientDetailWorkspace";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage(props: PageProps) {
  const params = await props.params;
  const returnPath = `/clients/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return <ClientDetailWorkspace clientId={params.id} />;
}
