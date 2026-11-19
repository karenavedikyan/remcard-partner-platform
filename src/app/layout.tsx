import type { Metadata } from "next";
import localFont from "next/font/local";
import { buildSiteLinkMetadata } from "@/lib/site-opengraph";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-preference";
import "./globals.css";

const manrope = localFont({
  src: "../fonts/manrope/Manrope-VariableFont_wght.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "400 800",
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
