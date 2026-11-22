import type { ReactNode } from "react";

function IconBox({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

export function MiniIconCertificate({ className }: { className?: string }) {
  return (
    <IconBox className={className}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8l3-2v12l-3-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconBox>
  );
}

export function MiniIconScan({ className }: { className?: string }) {
  return (
    <IconBox className={className}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M18 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </IconBox>
  );
}

export function MiniIconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="mini-chevron">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MiniIconLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 00-7.07 0L5.52 12.41a5 5 0 007.07 7.07L14 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MiniIconExternal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 14L19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 14v5H5V5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MiniIconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function MiniIconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}