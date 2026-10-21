import type { SVGProps } from "react";
import { PartnersHandshakeIcon } from "@/components/layout/icons/PartnersHandshakeIcon";

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
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </BaseIcon>
  );
}

export function NavIconPartners(props: IconProps) {
  return <PartnersHandshakeIcon {...props} size={20} strokeWidth={2} />;
}

export function NavIconClients(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 21a8 8 0 0 0-16 0" />
      <circle cx="10" cy="8" r="5" />
      <circle cx="18" cy="8" r="5" />
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
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </BaseIcon>
  );
}

export function NavIconNotifications(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 16H6l1.2-1.6c.6-.8.9-1.8.9-2.8V10a5 5 0 0 1 10 0v1.6c0 1 .3 2 .9 2.8L18 16z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </BaseIcon>
  );
}

export function NavIconMoreGrid(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </BaseIcon>
  );
}

export const NAV_ICONS = {
  home: NavIconHome,
  clients: NavIconClients,
  partners: NavIconPartners,
  recommendations: NavIconRecommendations,
  scanner: NavIconScanner,
  history: NavIconHistory,
  settlements: NavIconSettlements,
  profile: NavIconProfile,
  notifications: NavIconNotifications,
  more: NavIconMoreGrid,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
