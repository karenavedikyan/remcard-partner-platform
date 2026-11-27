import {
  ClientSellerGoods,
  parseClientPreviewHidden,
} from "@/components/client-catalog/ClientSellerGoods";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientCatalogSellerPage({ searchParams }: Props) {
  const params = await searchParams;
  const hidden = parseClientPreviewHidden(params);
  return <ClientSellerGoods initialHidden={hidden} />;
}