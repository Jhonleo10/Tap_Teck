import { Suspense } from "react";
import { getUsers } from "@/actions/users";
import { UsersContent } from "@/components/users/users-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <UsersContent users={users} />
    </Suspense>
  );
}
