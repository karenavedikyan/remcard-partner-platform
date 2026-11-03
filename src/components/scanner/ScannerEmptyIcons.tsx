type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ScannerEmptyIconScan({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" {...stroke} />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" {...stroke} />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" {...stroke} />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" {...stroke} />
      <path d="M7 12h10" {...stroke} />
    </svg>
  );
}

export function ScannerEmptyIconPercent({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M19 5 5 19" {...stroke} />
      <circle cx="6.5" cy="6.5" r="2.5" {...stroke} />
      <circle cx="17.5" cy="17.5" r="2.5" {...stroke} />
    </svg>
  );
}

export function ScannerEmptyIconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6 9 17l-5-5" {...stroke} />
    </svg>
  );
}

const STEP_ICONS = {
  scan: ScannerEmptyIconScan,
  percent: ScannerEmptyIconPercent,
  check: ScannerEmptyIconCheck,
} as const;

export function ScannerEmptyStepIcon({
  name,
  className,
}: {
  name: keyof typeof STEP_ICONS;
  className?: string;
}) {
  const Icon = STEP_ICONS[name];
  return <Icon className={className} />;
}
