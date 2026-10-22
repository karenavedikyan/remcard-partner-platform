import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { BusinessOwnerHomeDashboard } from "@/components/home/BusinessOwnerHomeDashboard";

export default async function BusinessHomePreviewPage(props: {
  searchParams?: Promise<{ partnerType?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const searchParams = await props.searchParams;
  const partnerType =
    searchParams?.partnerType?.toUpperCase() === "COMPANY" ? "COMPANY" : "STORE";
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";

  return (
    <CabinetShell returnTo="/dev/business-home-preview">
      <PageHeading
        eyebrow={eyebrow}
        title="Ваш кабинет"
        description="Начните с того, что нужно вам сегодня."
      />
      <BusinessOwnerHomeDashboard partnerType={partnerType} />
    </CabinetShell>
  );
}
