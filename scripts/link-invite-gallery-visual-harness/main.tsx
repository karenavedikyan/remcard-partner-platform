import "@/app/globals.css";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PartnerLinkInviteGallery } from "@/components/partners/PartnerLinkInviteGallery";
import type { ProProfileResponse } from "@/lib/types";

const profile = {
  user: {
    id: "u1",
    displayName: "Анна Волкова",
    partnerType: "STORE",
    partnerActivities: ["STORE"],
    storeCategories: ["doors", "flooring"],
    specializations: [],
  },
  organization: null,
} as unknown as ProProfileResponse;

const root = createRoot(document.getElementById("root")!);
root.render(
  <ThemeProvider>
    <PartnerLinkInviteGallery open onClose={() => {}} meProfile={profile} />
  </ThemeProvider>,
);