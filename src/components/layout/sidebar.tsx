"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  ShieldCheck,
  CalendarCheck,
  Gift,
  Settings,
  LogOut,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand/brand-logo";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/providers", label: "Providers", icon: Briefcase },
      { href: "/users", label: "Users", icon: Users },
      { href: "/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/verification", label: "Verification", icon: ShieldCheck },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/referrals", label: "Referrals", icon: Gift },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-[76px]" : "w-[260px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-[4.25rem] items-center",
            collapsed ? "flex-col justify-center gap-1 px-2" : "justify-between px-3"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center transition-opacity hover:opacity-90",
              !collapsed && "px-1"
            )}
            title="TapTeck Admin"
          >
            {collapsed ? (
              <BrandLogo variant="compact" />
            ) : (
              <BrandLogo />
            )}
          </Link>
          <div className={cn("flex shrink-0 items-center", collapsed ? "gap-0" : "gap-0.5")}>
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white lg:flex"
              onClick={onToggleCollapse}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md shadow-black/20"
                          : "text-white/55 hover:bg-white/8 hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-highlight" />
                      )}
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-sidebar-accent-foreground")} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3">
          <Separator className="mb-3 bg-sidebar-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-red-500/10 hover:text-red-300",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
