"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
        <div className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-card p-5 shadow-sm">
          <Icon className="h-10 w-10 text-primary/70" aria-hidden />
        </div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 rounded-xl" variant="default">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
