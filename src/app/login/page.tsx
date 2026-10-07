import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeReturnTo } from "@/lib/auth-flow";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string; reason?: string };
}) {
  return (
    <LoginForm
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
      reason={searchParams?.reason}
    />
  );
}
