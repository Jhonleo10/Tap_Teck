"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  tabs: {
    id: string;
    label: string;
    content: ReactNode;
  }[];
  defaultTab?: string;
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  badge,
  tabs,
  defaultTab,
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:z-10">
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-4 pr-8">
              {icon && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl leading-tight">{title}</DialogTitle>
                {subtitle && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              {badge}
            </div>
          </DialogHeader>
        </div>

        <Tabs defaultValue={defaultTab ?? tabs[0]?.id} className="flex flex-col">
          <TabsList className="mx-6 mt-4 h-10 w-fit rounded-xl bg-muted/60 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-lg px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-0 px-6 pb-6 pt-4 focus-visible:outline-none"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-6 gap-y-3", className)}>{children}</div>
  );
}

export function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm font-medium leading-snug">{value}</div>
    </div>
  );
}
