"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  PanelLeftClose,
  PanelLeft,
  Bell,
  ScrollText,
  Sparkles,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand/brand-logo";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Operations", icon: LayoutDashboard },
      { href: "/ai", label: "AI Intelligence", icon: Sparkles },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/providers", label: "Providers", icon: Briefcase },
      { href: "/users", label: "Users", icon: Users },
      { href: "/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/verification", label: "Verification", icon: ShieldCheck, badgeKey: "verification" as const },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/plans", label: "Plans", icon: CreditCard },
      { href: "/provider-pricing", label: "Provider Pricing", icon: DollarSign },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/referrals", label: "Referrals", icon: Gift },
      { href: "/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" as const },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  unreadNotifications?: number;
}

export function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
  unreadNotifications = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const width = collapsed ? 76 : 268;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border/80",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <Link
            href="/dashboard"
            className={cn("flex min-w-0 items-center transition-opacity hover:opacity-90", collapsed && "justify-center")}
            title="TapTeck Admin"
          >
            <BrandLogo variant={collapsed ? "compact" : "full"} onDarkBackground />
          </Link>
          {!collapsed && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 text-white/50 hover:bg-white/10 hover:text-white lg:flex"
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-sidebar">
          {navSections.map((section) => (
            <div key={section.label}>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35"
                  >
                    {section.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badge =
                    item.badgeKey === "notifications" && unreadNotifications > 0
                      ? unreadNotifications
                      : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "text-white shadow-lg shadow-black/25"
                          : "text-white/55 hover:bg-white/[0.07] hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#006F5F] to-[#0E8A72]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex shrink-0">
                        <Icon className={cn("h-[18px] w-[18px]", isActive && "text-white")} />
                        {badge !== null && collapsed && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#22C55E] px-1 text-[9px] font-bold text-white">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="relative z-10 flex-1">{item.label}</span>
                          {badge !== null && (
                            <span className="relative z-10 rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-[10px] font-bold text-[#22C55E]">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 p-3">
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="mb-2 hidden h-9 w-full text-white/50 hover:bg-white/10 lg:flex"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <Separator className="mb-3 bg-sidebar-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
