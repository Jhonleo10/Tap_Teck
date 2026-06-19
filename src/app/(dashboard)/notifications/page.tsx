import { getNotifications } from "@/actions/notifications";
import { NotificationsContent } from "@/components/notifications/notifications-content";

export default async function NotificationsPage() {
  const data = await getNotifications({ page: 1, pageSize: 20 });
  return <NotificationsContent initialData={data} />;
}
