"use client";

import { useRouter } from "next/navigation";
import { ErrorCard } from "@/components/shared/error-card";

interface RefreshErrorCardProps {
  title?: string;
  message?: string;
}

export function RefreshErrorCard({ title, message }: RefreshErrorCardProps) {
  const router = useRouter();

  return (
    <ErrorCard
      title={title}
      message={message}
      onRetry={() => router.refresh()}
    />
  );
}
