import type { RegistrationKind } from "@/lib/registration/types";
import type { SVGProps } from "react";

/** Paths from frozen prototype (lucide icons: send, hammer, store, building-2, badge-check). */
const KIND_LUCIDE_PATHS: Record<RegistrationKind, string[]> = {
  agent: [
    "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
    "m21.854 2.147-10.94 10.939",
  ],
  specialist: [
    "m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",
    "m18 15 4-4",
    "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",
  ],
  store: [
    "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7",
    "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",
    "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4",
    "M2 7h20",
    "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",
  ],
  company: [
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",
    "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",
    "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",
    "M10 6h4",
    "M10 10h4",
    "M10 14h4",
    "M10 18h4",
  ],
  employee: [
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
    "m9 12 2 2 4-4",
  ],
};

type IconProps = SVGProps<SVGSVGElement>;

export function RegistrationKindIcon({ kind, className }: { kind: RegistrationKind; className?: string }) {
  const paths = KIND_LUCIDE_PATHS[kind];
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={23}
      height={23}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
