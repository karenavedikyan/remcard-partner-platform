import type { Metadata } from "next";
import { SITE_OG_DESCRIPTION, SITE_OG_TITLE } from "@/lib/site-opengraph";

export const metadata: Metadata = {
  title: SITE_OG_TITLE,
  description: SITE_OG_DESCRIPTION,
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
