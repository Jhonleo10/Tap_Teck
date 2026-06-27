import { Suspense } from "react";
import { getUsers, getUserStats } from "@/actions/users";
import { UsersContent } from "@/components/users/users-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";

export default async function UsersPage() {
  const [usersResult, statsResult] = await Promise.all([
    getUsers({ page: 1, pageSize: 10 }),
    getUserStats(),
  ]);

  if (!usersResult.success || !statsResult.success) {
    return (
      <ErrorCard
        message={usersResult.error ?? statsResult.error ?? "Failed to load users"}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <UsersContent
        initialData={usersResult.data!}
        initialStats={statsResult.data!}
      />
    </Suspense>
  );
}
