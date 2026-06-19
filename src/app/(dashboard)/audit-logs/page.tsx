import { getAuditLogs } from "@/actions/notifications";
import { AuditLogsContent } from "@/components/audit/audit-logs-content";

export default async function AuditLogsPage() {
  const data = await getAuditLogs({ page: 1, pageSize: 20 });
  return <AuditLogsContent initialData={data} />;
}
