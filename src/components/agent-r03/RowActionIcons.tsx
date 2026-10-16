import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconShare(props: P) {
  return (
    <Base {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </Base>
  );
}

export function IconEdit(props: P) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-16.5z" />
    </Base>
  );
}

export function IconArchive(props: P) {
  return (
    <Base {...props}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Base>
  );
}

export function IconRestore(props: P) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Base>
  );
}

export function IconDelete(props: P) {
  return (
    <Base {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Base>
  );
}

export function IconDisable(props: P) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 5l14 14" />
    </Base>
  );
}

export function IconEye(props: P) {
  return (
    <Base {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconMore(props: P) {
  return (
    <Base {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconCheck(props: P) {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function IconX(props: P) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Base>
  );
}

export function IconPause(props: P) {
  return (
    <Base {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconPlay(props: P) {
  return (
    <Base {...props}>
      <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconRevoke(props: P) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M9 9 3 3" />
    </Base>
  );
}

export function rowActionIcon(id: string) {
  if (id === "share") return IconShare;
  if (id === "rename") return IconEdit;
  if (id === "archive") return IconArchive;
  if (id === "restore") return IconRestore;
  if (id === "delete") return IconDelete;
  if (id === "disable") return IconDisable;
  if (id === "open") return IconEye;
  if (id === "more") return IconMore;
  if (id === "accept") return IconCheck;
  if (id === "reject") return IconX;
  if (id === "pause") return IconPause;
  if (id === "resume") return IconPlay;
  if (id === "revoke") return IconRevoke;
  return null;
}
