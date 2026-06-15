import { getUsers } from "@/actions/users";
import { UsersContent } from "@/components/users/users-content";

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersContent users={users} />;
}
