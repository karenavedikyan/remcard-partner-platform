import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { buildSiteLinkMetadata } from "@/lib/site-opengraph";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = buildSiteLinkMetadata("/");

export const viewport = {
  themeColor: "#c12b2f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
