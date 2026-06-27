import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingCardProps {
  rows?: number;
  showHeader?: boolean;
}

export function LoadingCard({ rows = 5, showHeader = true }: LoadingCardProps) {
  return (
    <Card className="border-border/60">
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
