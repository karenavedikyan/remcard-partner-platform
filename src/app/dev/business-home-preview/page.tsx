import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { BusinessOwnerHomeDashboard } from "@/components/home/BusinessOwnerHomeDashboard";

/** Local layout preview only (NODE_ENV !== production). Synthetic metrics via mocked BFF in capture. */
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
    <main
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 1200,
        minWidth: 0,
        margin: "0 auto",
        padding: "32px clamp(16px, 4vw, 32px)",
      }}
    >
      <PageHeading
        eyebrow={eyebrow}
        title="Ваш кабинет"
        description="Начните с того, что нужно вам сегодня."
      />
      <BusinessOwnerHomeDashboard partnerType={partnerType} />
    </main>
  );
}
