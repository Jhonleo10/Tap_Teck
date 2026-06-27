"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Operations Center",
  analytics: "Analytics",
  providers: "Providers",
  users: "Users",
  bookings: "Bookings",
  verification: "Verification",
  referrals: "Referrals",
  notifications: "Notifications",
  "audit-logs": "Audit Logs",
  settings: "Settings",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = ROUTE_LABELS[seg] ?? seg.replace(/-/g, " ");

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
            {isLast ? (
              <span className="font-medium capitalize text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="capitalize text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function usePageTitle(): string {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  return ROUTE_LABELS[seg] ?? seg.replace(/-/g, " ");
}
