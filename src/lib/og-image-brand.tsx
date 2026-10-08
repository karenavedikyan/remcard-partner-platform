/** Shared RemCard PROF mark for `next/og` ImageResponse (matches BrandMark). */
export const OG_ACCENT = "#c12b2f";

export function OgBrandHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg viewBox="0 0 36 36" width="52" height="52" aria-hidden>
        <rect width="36" height="36" rx="10" fill={OG_ACCENT} />
        <path
          d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z"
          fill="none"
          stroke="white"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#1a1f1d", letterSpacing: -0.5 }}>
          remcard<span style={{ color: OG_ACCENT }}>.</span>
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: OG_ACCENT,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          для партнёров
        </span>
      </div>
    </div>
  );
}

export function OgImageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: "linear-gradient(165deg, #ffffff 0%, #f5f5f4 55%, #fdeeed 100%)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${OG_ACCENT}22 0%, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
