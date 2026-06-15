import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-form";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
