import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { buildSiteLinkMetadata } from "@/lib/site-opengraph";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-preference";
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
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOT_SCRIPT,
          }}
        />
      </head>
      <body className={manrope.className}>
        <ThemeProvider>
          <CookieConsentProvider>{children}</CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
