import { getAuditLogs, getAuditFilterOptions } from "@/actions/audit";
import { AuditLogsContent } from "@/components/audit/audit-logs-content";
import { ErrorCard } from "@/components/shared/error-card";

export default async function AuditLogsPage() {
  const [result, filterOptions] = await Promise.all([
    getAuditLogs({ page: 1, pageSize: 20 }),
    getAuditFilterOptions(),
  ]);

  if (!result.success || !result.data) {
    return <ErrorCard message={result.error ?? "Failed to load audit logs"} />;
  }

  return (
    <AuditLogsContent
      initialData={result.data}
      filterOptions={
        filterOptions.success && filterOptions.data
          ? filterOptions.data
          : { actions: [], entityTypes: [] }
      }
    />
  );
}
