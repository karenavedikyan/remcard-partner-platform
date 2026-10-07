import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function NavIconHome(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </BaseIcon>
  );
}

export function NavIconPartners(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="11" r="2.5" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M14 20c0-2 1.5-3.5 3.5-3.5" />
    </BaseIcon>
  );
}

export function NavIconRecommendations(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4h10v16H7z" />
      <path d="M10 8h4M10 12h4M10 16h2" />
    </BaseIcon>
  );
}

export function NavIconScanner(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7V5a1 1 0 0 1 1-1h2M18 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M8 12h8" />
    </BaseIcon>
  );
}

export function NavIconHistory(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </BaseIcon>
  );
}

export function NavIconSettlements(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 14.5h5" />
    </BaseIcon>
  );
}

export function NavIconProfile(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </BaseIcon>
  );
}

export const NAV_ICONS = {
  home: NavIconHome,
  partners: NavIconPartners,
  recommendations: NavIconRecommendations,
  scanner: NavIconScanner,
  history: NavIconHistory,
  settlements: NavIconSettlements,
  profile: NavIconProfile,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
