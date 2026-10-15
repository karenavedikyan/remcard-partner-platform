import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
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
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v13M7 8l5-5 5 5" />
    </Base>
  );
}

export function IconEdit(props: P) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}

export function IconArchive(props: P) {
  return (
    <Base {...props}>
      <path d="M4 7h16v13H4z" />
      <path d="M8 7V5h8v2" />
      <path d="M10 11h4" />
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
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M10 11v6M14 11v6" />
      <path d="M7 7l1 12h8l1-12" />
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

export function rowActionIcon(id: string) {
  if (id === "share") return IconShare;
  if (id === "rename") return IconEdit;
  if (id === "archive") return IconArchive;
  if (id === "restore") return IconRestore;
  if (id === "delete") return IconDelete;
  if (id === "disable") return IconDisable;
  return null;
}
