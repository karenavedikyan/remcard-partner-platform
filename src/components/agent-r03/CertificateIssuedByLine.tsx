import { certificateIssuedByLabel } from "@/lib/certificate-issuance-access";

type Props = {
  cert: { issuedBy?: { name?: string | null } | null } | null | undefined;
  as?: "p" | "small";
  className?: string;
};

/** «Выпустил: Имя» — rendered only when the server reports the issuing employee. */
export function CertificateIssuedByLine({ cert, as = "p", className }: Props) {
  const label = certificateIssuedByLabel(cert);
  if (!label) return null;
  const Tag = as;
  return (
    <Tag className={className} data-testid="certificate-issued-by">
      {label}
    </Tag>
  );
}
