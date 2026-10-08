import { ImageResponse } from "next/og";
import { OG_ACCENT, OgBrandHeader, OgImageShell } from "@/lib/og-image-brand";

export const runtime = "nodejs";
export const alt = "RemCard PROF — приглашение к сотрудничеству";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgImageShell>
        <OgBrandHeader />

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#1a1f1d",
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            Ваши рекомендации. Понятные условия.
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: OG_ACCENT,
              lineHeight: 1.35,
            }}
          >
            Приглашение к сотрудничеству
          </div>
        </div>

        <div
          style={{
            fontSize: 16,
            color: "#68716e",
            fontWeight: 600,
          }}
        >
          RemCard PROF
        </div>
      </OgImageShell>
    ),
    { ...size },
  );
}
