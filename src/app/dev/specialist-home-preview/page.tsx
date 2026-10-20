import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { SpecialistHomeDashboard } from "@/components/home/SpecialistHomeDashboard";

/** Local layout preview only (NODE_ENV !== production). Not an auth-flow substitute. */
export default function SpecialistHomeDevPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

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
        eyebrow="Специалист"
        title="Ваш кабинет"
        description="Начните с того, что нужно вам сегодня."
      />
      <SpecialistHomeDashboard />
    </main>
  );
}
