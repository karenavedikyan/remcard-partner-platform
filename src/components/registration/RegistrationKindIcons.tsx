import type { RegistrationKind } from "@/lib/registration/types";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconAgent(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function IconSpecialist(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconStore(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M3 9 5 3h14l2 6" />
      <path d="M9 21V9" />
      <path d="M15 21V9" />
    </svg>
  );
}

function IconCompany(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function IconEmployee(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <rect x="17" y="8" width="5" height="8" rx="1" />
      <path d="M19.5 8v-1a1.5 1.5 0 0 1 3 0v1" />
    </svg>
  );
}

const ICONS: Record<RegistrationKind, (props: IconProps) => JSX.Element> = {
  agent: IconAgent,
  specialist: IconSpecialist,
  store: IconStore,
  company: IconCompany,
  employee: IconEmployee,
};

export function RegistrationKindIcon({
  kind,
  className,
}: {
  kind: RegistrationKind;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return <Icon className={className} width={22} height={22} />;
}
