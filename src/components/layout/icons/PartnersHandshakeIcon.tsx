import type { SVGProps } from "react";

/** Lucide `handshake` geometry (reference login-entry-20261018, stroke-width 2). */
export const PARTNERS_HANDSHAKE_PATHS = [
  "m11 17 2 2a1 1 0 1 0 3-3",
  "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",
  "m21 3 1 11h-2",
  "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3",
  "M3 4h8",
] as const;

export function PartnersHandshakeIcon({
  size = 20,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PARTNERS_HANDSHAKE_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
