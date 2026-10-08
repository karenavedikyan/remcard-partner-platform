import { ImageResponse } from "next/og";
import { OG_ACCENT, OgBrandHeader, OgImageShell } from "@/lib/og-image-brand";

export const runtime = "nodejs";
export const alt =
  "RemCard PROF — партнёрская программа: новые клиенты и понятные условия сотрудничества";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgImageShell>
        <OgBrandHeader />

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 50,
              fontWeight: 800,
              color: "#1a1f1d",
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            Новые клиенты. Понятные условия.
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#3d4542",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            Партнёрская программа для специалистов, магазинов и компаний
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: OG_ACCENT,
              lineHeight: 1.3,
            }}
          >
            Присоединяйтесь к RemCard PROF
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 16, color: "#68716e", fontWeight: 600 }}>RemCard PROF</span>
          <span style={{ fontSize: 18, color: "#68716e", fontWeight: 700 }}>prof.remcard.ru</span>
        </div>
      </OgImageShell>
    ),
    { ...size },
  );
}
