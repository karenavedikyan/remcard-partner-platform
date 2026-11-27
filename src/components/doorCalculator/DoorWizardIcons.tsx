import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function WizardIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="i"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IcCheck(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </WizardIcon>
  );
}

export function IcChevronLeft(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </WizardIcon>
  );
}

export function IcChevronRight(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </WizardIcon>
  );
}

export function IcCopy(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <rect width={14} height={14} x={8} y={8} rx={2} ry={2} />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </WizardIcon>
  );
}

export function IcDoorOpen(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M13 4h3a2 2 0 0 1 2 2v14" />
      <path d="M2 20h3" />
      <path d="M13 20H2" />
      <path d="M10 12v.01" />
      <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
    </WizardIcon>
  );
}

export function IcFileText(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </WizardIcon>
  );
}

export function IcMinus(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M5 12h14" />
    </WizardIcon>
  );
}

export function IcPencil(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </WizardIcon>
  );
}

export function IcPlus(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </WizardIcon>
  );
}

export function IcTrash2(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1={10} x2={10} y1={11} y2={17} />
      <line x1={14} x2={14} y1={11} y2={17} />
    </WizardIcon>
  );
}

export function IcX(props: IconProps) {
  return (
    <WizardIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </WizardIcon>
  );
}