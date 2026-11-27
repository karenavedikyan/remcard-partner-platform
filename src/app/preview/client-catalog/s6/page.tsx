import { ClientSellerGoods } from "@/components/client-catalog/ClientSellerGoods";
import { parseClientPreviewHidden } from "@/lib/client-catalog/preview-hidden";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientCatalogSellerPage({ searchParams }: Props) {
  const params = await searchParams;
  const hidden = parseClientPreviewHidden(params);
  return <ClientSellerGoods initialHidden={hidden} />;
}