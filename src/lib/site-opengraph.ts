import type { Metadata } from "next";
import { appConfig } from "@/lib/config";

export const SITE_OG_TITLE = "RemCard PROF | Клиенты по рекомендациям";

export const SITE_OG_DESCRIPTION =
  "Присоединяйтесь к партнёрской программе RemCard: рекомендуйте специалистов и магазины, согласовывайте условия и отслеживайте вознаграждения.";

export const SITE_OG_IMAGE_ALT =
  "RemCard PROF — партнёрская программа: новые клиенты и понятные условия сотрудничества";

const SITE_NAME = "RemCard PROF";

export function siteOpenGraphImageUrl(appOrigin: string): string {
  const base = appOrigin.replace(/\/+$/, "");
  return `${base}/opengraph-image`;
}

function buildOpenGraph(input: {
  title: string;
  description: string;
  pageUrl: string;
  ogImageUrl: string;
}): NonNullable<Metadata["openGraph"]> {
  return {
    title: input.title,
    description: input.description,
    url: input.pageUrl,
    siteName: SITE_NAME,
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: input.ogImageUrl,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      },
    ],
  };
}

function buildTwitter(input: {
  title: string;
  description: string;
  ogImageUrl: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: [input.ogImageUrl],
  };
}

/** Public site link preview for prof.remcard.ru (home and login). */
export function buildSiteLinkMetadata(pagePath: "/" | "/login" = "/"): Metadata {
  const origin = appConfig.appUrl.replace(/\/+$/, "");
  const pageUrl = pagePath === "/" ? `${origin}/` : `${origin}${pagePath}`;
  const ogImageUrl = siteOpenGraphImageUrl(origin);

  return {
    metadataBase: new URL(origin),
    title: SITE_OG_TITLE,
    description: SITE_OG_DESCRIPTION,
    openGraph: buildOpenGraph({
      title: SITE_OG_TITLE,
      description: SITE_OG_DESCRIPTION,
      pageUrl,
      ogImageUrl,
    }),
    twitter: buildTwitter({
      title: SITE_OG_TITLE,
      description: SITE_OG_DESCRIPTION,
      ogImageUrl,
    }),
  };
}
