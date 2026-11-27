import { ClientProductPage } from "@/components/client-catalog/ClientProductPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClientCatalogProductPage({ params }: Props) {
  const { id } = await params;
  return <ClientProductPage id={id} />;
}