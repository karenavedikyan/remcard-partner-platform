import type { PropsWithChildren } from "react";

export default function Link({
  href,
  children,
  className,
}: PropsWithChildren<{ href: string; className?: string }>) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
