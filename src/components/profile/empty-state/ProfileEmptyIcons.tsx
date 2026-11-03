import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { name: string; className?: string };

function SvgShell({ className, children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ProfileEmptyIcon({ name, className, ...rest }: Props) {
  switch (name) {
    case "user":
      return (
        <SvgShell className={className} {...rest}>
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </SvgShell>
      );
    case "building":
      return (
        <SvgShell className={className} {...rest}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </SvgShell>
      );
    case "sparkles":
      return (
        <SvgShell className={className} {...rest}>
          <path d="M9.9 2.5 11.6 7.1a2 2 0 0 0 1.3 1.3l4.6 1.7a1 1 0 0 1 0 1.8l-4.6 1.7a2 2 0 0 0-1.3 1.3l-1.7 4.6a1 1 0 0 1-1.8 0l-1.7-4.6a2 2 0 0 0-1.3-1.3L.5 11.9a1 1 0 0 1 0-1.8l4.6-1.7a2 2 0 0 0 1.3-1.3l1.7-4.6a1 1 0 0 1 1.8 0Z" />
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
        </SvgShell>
      );
    case "mapPin":
      return (
        <SvgShell className={className} {...rest}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </SvgShell>
      );
    case "card":
      return (
        <SvgShell className={className} {...rest}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
        </SvgShell>
      );
    case "percent":
      return (
        <SvgShell className={className} {...rest}>
          <path d="M19 5 5 19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </SvgShell>
      );
    case "store":
      return (
        <SvgShell className={className} {...rest}>
          <path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7" />
          <path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7" />
          <path d="M15 22v-4a3 3 0 0 0-6 0v4" />
          <path d="M2 7h20" />
        </SvgShell>
      );
    default:
      return (
        <SvgShell className={className} {...rest}>
          <path d="M9.9 2.5 11.6 7.1a2 2 0 0 0 1.3 1.3l4.6 1.7a1 1 0 0 1 0 1.8l-4.6 1.7a2 2 0 0 0-1.3 1.3l-1.7 4.6a1 1 0 0 1-1.8 0l-1.7-4.6a2 2 0 0 0-1.3-1.3L.5 11.9a1 1 0 0 1 0-1.8l4.6-1.7a2 2 0 0 0 1.3-1.3l1.7-4.6a1 1 0 0 1 1.8 0Z" />
        </SvgShell>
      );
  }
}
