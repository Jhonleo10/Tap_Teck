import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/auth-form";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import Link from "next/link";

function ResetPasswordContent({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-destructive">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-primary hover:underline text-sm">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-muted-foreground">Enter your new password below</p>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
        <ResetPasswordWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResetPasswordWrapper({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordContent searchParams={params} />;
}
