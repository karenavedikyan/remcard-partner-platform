import type { ReactElement, ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

const icons: Record<string, (p: IconProps) => ReactElement> = {
  map: (p) => (
    <Svg {...p}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  ),
  route: (p) => (
    <Svg {...p}>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 000-7H11a3.5 3.5 0 010-7H18" />
      <circle cx="18" cy="5" r="3" />
    </Svg>
  ),
  sparkles: (p) => (
    <Svg {...p}>
      <path d="M9.5 2 11 7l5 1.5L11 10l-1.5 5L8 10 3 8.5 8 7z" />
      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
    </Svg>
  ),
  "chevron-down": (p) => (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  milestone: (p) => (
    <Svg {...p}>
      <path d="M12 3v18M5 8h14M5 16h14" />
    </Svg>
  ),
  stethoscope: (p) => (
    <Svg {...p}>
      <path d="M11 2v2M5 8a4 4 0 108 0v-2M5 8H3v3a5 5 0 0010 0V8h-2" />
    </Svg>
  ),
  "pencil-ruler": (p) => (
    <Svg {...p}>
      <path d="M14 3l7 7-4 4-7-7 4-4zM3 21l9-9" />
    </Svg>
  ),
  "file-check": (p) => (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </Svg>
  ),
  shovel: (p) => (
    <Svg {...p}>
      <path d="M2 22l10-10M14 6l4-4 4 4-4 4" />
    </Svg>
  ),
  hammer: (p) => (
    <Svg {...p}>
      <path d="M15 12l-8.5 8.5a2.12 2.12 0 003 3L18 15M11 8l6-6 3 3-6 6" />
    </Svg>
  ),
  "brick-wall": (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </Svg>
  ),
  house: (p) => (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
    </Svg>
  ),
  zap: (p) => (
    <Svg {...p}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
    </Svg>
  ),
  "paint-roller": (p) => (
    <Svg {...p}>
      <path d="M3 11h11v3H3zM14 7h6v4h-6zM5 14v7M19 11v10" />
    </Svg>
  ),
  paintbrush: (p) => (
    <Svg {...p}>
      <path d="M18.4 3.6a2 2 0 012.8 2.8l-9.2 9.2-4 1 1-4 9.4-9.2zM3 21l2-2" />
    </Svg>
  ),
  sofa: (p) => (
    <Svg {...p}>
      <path d="M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3M4 18v2h16v-2M4 11h16v5H4z" />
    </Svg>
  ),
  "badge-check": (p) => (
    <Svg {...p}>
      <path d="M12 2l2.4 1.2L17 2l1.8 2.2L21 5v4l-1.2 2.4L21 13l-2.2 1.8L17 17l-2.4-1.2L12 17l-1.8-2.2L8 13V9l1.2-2.4L8 5l2.2-1.8L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
};

export const PARTNER_STAGE_ICON_IDS: Record<string, keyof typeof icons> = {
  "L1-0": "stethoscope",
  "L1-1": "pencil-ruler",
  "L1-2": "file-check",
  "L1-3": "shovel",
  "L1-4": "hammer",
  "L1-5": "brick-wall",
  "L1-6": "house",
  "L1-7": "zap",
  "L1-8": "paint-roller",
  "L1-9": "paintbrush",
  "L1-10": "sofa",
  "L1-11": "badge-check",
};

export function PartnerDiscoveryStageIcon({ stageId, name = "milestone" }: { stageId?: string; name?: keyof typeof icons }) {
  const key = (stageId && PARTNER_STAGE_ICON_IDS[stageId]) || name;
  const Icon = icons[key] ?? icons.milestone;
  return <Icon />;
}

export function PartnerDiscoveryUiIcon({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name] ?? icons.milestone;
  return <Icon />;
}
