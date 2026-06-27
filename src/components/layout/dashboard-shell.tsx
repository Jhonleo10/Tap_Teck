"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CountryProvider } from "@/components/providers/country-provider";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { getHeaderNotifications } from "@/actions/notifications";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed, hydrated] = usePersistedState("tapteck-sidebar-collapsed", false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getHeaderNotifications().then((r) => {
      if (r.success && r.data) setUnreadCount(r.data.unreadCount);
    });
  }, []);

  const toggleCollapse = () => setCollapsed(!collapsed);

  return (
    <CountryProvider>
      <div className="relative min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-0 bg-mesh" />
        <div className="pointer-events-none fixed inset-0 bg-grid-subtle opacity-30" />

        <Sidebar
          open={sidebarOpen}
          collapsed={hydrated ? collapsed : false}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={toggleCollapse}
          unreadNotifications={unreadCount}
        />

        <div
          className={cn(
            "relative flex min-h-screen flex-col transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            hydrated && (collapsed ? "lg:ml-[76px]" : "lg:ml-[268px]")
          )}
        >
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-[1600px]"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </CountryProvider>
  );
}
