import { Badge } from "@/components/ui/badge";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  ACTIVE: "success",
  VERIFIED: "success",
  COMPLETED: "success",
  APPROVED: "success",
  CONFIRMED: "success",
  IN_PROGRESS: "default",
  UNDER_REVIEW: "warning",
  PENDING: "warning",
  INACTIVE: "secondary",
  CANCELLED: "destructive",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
  EXPIRED: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = statusVariants[status] ?? "outline";
  const label = status.replace(/_/g, " ");

  return (
    <Badge variant={variant} className="capitalize">
      {label.toLowerCase()}
    </Badge>
  );
}
