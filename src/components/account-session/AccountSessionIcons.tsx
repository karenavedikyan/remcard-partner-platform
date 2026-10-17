import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Base>
  );
}

export function IconMonitorOff(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 17H3V5h12v12Z" />
      <path d="m21 15-3-3 3-3" />
      <path d="M14 18h7" />
    </Base>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Base width={16} height={16} {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
      <path d="m13 18 6-6-6-6" />
    </Base>
  );
}
