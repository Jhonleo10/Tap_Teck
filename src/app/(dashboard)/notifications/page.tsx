import { getNotifications } from "@/actions/notifications";
import { NotificationsContent } from "@/components/notifications/notifications-content";
import { ErrorCard } from "@/components/shared/error-card";

export default async function NotificationsPage() {
  const result = await getNotifications({ page: 1, pageSize: 20 });

  if (!result.success || !result.data) {
    return <ErrorCard message={result.error ?? "Failed to load notifications"} />;
  }

  return <NotificationsContent initialData={result.data} />;
}
