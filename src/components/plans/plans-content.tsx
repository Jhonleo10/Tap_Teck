"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { PlanFormDialog } from "@/components/plans/plan-form-dialog";
import { createPlan, updatePlan, togglePlan, deletePlan } from "@/actions/plans";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import type { Plan, DurationMode } from "@prisma/client";

type PlanWithCount = Plan & { _count: { subscriptions: number } };

const durationLabels: Record<DurationMode, string> = {
  DAY: "Day",
  WEEK: "Week",
  MONTH: "Month",
};

export function PlansContent({
  initialPlans,
  initialStats,
}: {
  initialPlans: PlanWithCount[];
  initialStats: { total: number; active: number; totalSubscriptions: number; activeSubscriptions: number };
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithCount | null>(null);

  const handleCreate = async (data: Parameters<typeof createPlan>[0]) => {
    startTransition(async () => {
      const result = await createPlan(data);
      if (result.success && result.data) {
        toast.success(result.message ?? "Plan created");
        const newPlan: PlanWithCount = { ...result.data!, _count: { subscriptions: 0 } };
        setPlans((prev) => [newPlan, ...prev]);
        setStats((prev) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
        setFormOpen(false);
      } else {
        toast.error(result.error ?? "Failed to create plan");
      }
    });
  };

  const handleUpdate = async (id: string, data: Parameters<typeof updatePlan>[1]) => {
    startTransition(async () => {
      const result = await updatePlan(id, data);
      if (result.success && result.data) {
        toast.success(result.message ?? "Plan updated");
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...result.data } : p)));
        setEditingPlan(null);
      } else {
        toast.error(result.error ?? "Failed to update plan");
      }
    });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    startTransition(async () => {
      const result = await togglePlan(id, isActive);
      if (result.success) {
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, isActive } : p)));
        setStats((prev) => ({ ...prev, active: prev.active + (isActive ? 1 : -1) }));
      } else {
        toast.error(result.error ?? "Failed to toggle plan");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    startTransition(async () => {
      const result = await deletePlan(id);
      if (result.success) {
        toast.success(result.message ?? "Plan deleted");
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setStats((prev) => ({ ...prev, total: prev.total - 1, active: prev.active - (plans.find((p) => p.id === id)?.isActive ? 1 : 0) }));
      } else {
        toast.error(result.error ?? "Failed to delete plan");
      }
    });
  };

  const columns: ColumnDef<PlanWithCount>[] = [
    {
      accessorKey: "name",
      header: "Plan",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="truncate text-xs text-muted-foreground max-w-[200px]">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(row.original.price)}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span>
          {row.original.durationDays} {durationLabels[row.original.durationMode].toLowerCase()}
          {row.original.durationDays > 1 ? "s" : ""}
        </span>
      ),
    },
{
        id: "features",
        header: "Features",
        cell: ({ row }) => {
          let features: string[] = [];
          if (Array.isArray(row.original.features)) {
            features = row.original.features as string[];
          } else if (typeof row.original.features === "string") {
            features = row.original.features.split(",").map((f) => f.trim()).filter(Boolean);
          }
          return (
            <span className="text-sm text-muted-foreground">
              {features.length} feature{features.length !== 1 ? "s" : ""}
            </span>
          );
        },
      },
    {
      id: "subscriptions",
      header: "Subscriptions",
      cell: ({ row }) => row.original._count.subscriptions,
    },
    {
      id: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setEditingPlan(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const exportData = plans.map((p) => {
    let features: string[] = [];
    if (Array.isArray(p.features)) {
      features = p.features as string[];
    } else if (typeof p.features === "string") {
      features = p.features.split(",").map((f) => f.trim()).filter(Boolean);
    }
    return {
      name: p.name,
      price: p.price,
      duration: `${p.durationDays} ${durationLabels[p.durationMode].toLowerCase()}${p.durationDays > 1 ? "s" : ""}`,
      features: features.join(", "),
      subscriptions: p._count.subscriptions,
      status: p.isActive ? "Active" : "Inactive",
      createdAt: formatDate(p.createdAt),
    };
  });

  const exportColumns = [
    { key: "name" as const, label: "Plan" },
    { key: "price" as const, label: "Price" },
    { key: "duration" as const, label: "Duration" },
    { key: "features" as const, label: "Features" },
    { key: "subscriptions" as const, label: "Subscriptions" },
    { key: "status" as const, label: "Status" },
    { key: "createdAt" as const, label: "Created" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans & Subscriptions"
        description="Manage subscription plans that providers can purchase to receive bookings"
        badge="Monetization"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <ExportButtons
            data={exportData}
            filename="plans"
            title="Plans Export"
            columns={exportColumns}
          />
          <Button
            size="sm"
            className="rounded-lg"
            onClick={() => {
              setEditingPlan(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Plans" value={stats.total} icon={CreditCard} accent="teal" />
        <StatCard title="Active Plans" value={stats.active} icon={CheckCircle} accent="emerald" />
        <StatCard title="Total Subscriptions" value={stats.totalSubscriptions} icon={Users} accent="blue" />
        <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon={CheckCircle} accent="green" />
      </div>

      {/* Plan Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          let features: string[] = [];
          if (Array.isArray(plan.features)) {
            features = plan.features as string[];
          } else if (typeof plan.features === "string") {
            features = plan.features.split(",").map((f) => f.trim()).filter(Boolean);
          }
          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all ${
                !plan.isActive ? "opacity-60" : ""
              } ${plan.isActive ? "ring-1 ring-primary/20" : ""}`}
            >
              {plan.isActive && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#006F5F] to-[#0E8A72]" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-1">{plan.description}</CardDescription>
                    )}
                  </div>
                  <Switch
                    checked={plan.isActive}
                    onCheckedChange={(checked) => handleToggle(plan.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    /{plan.durationDays} {durationLabels[plan.durationMode].toLowerCase()}
                    {plan.durationDays > 1 ? "s" : ""}
                  </span>
                </div>
                {features.length > 0 && (
                  <ul className="space-y-2">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                <span>{plan._count.subscriptions} subscription{plan._count.subscriptions !== 1 ? "s" : ""}</span>
                <span>{durationLabels[plan.durationMode]}</span>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Plans Table */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h3 className="mb-4 text-sm font-semibold">All Plans</h3>
        <DataTable
          columns={columns}
          data={plans}
          searchKeys={["name", "description"]}
          searchPlaceholder="Search plans..."
        />
      </div>

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {editingPlan && (
        <PlanFormDialog
          open={!!editingPlan}
          onOpenChange={(open) => { if (!open) setEditingPlan(null); }}
          onSubmit={(data) => handleUpdate(editingPlan.id, data)}
          initialData={editingPlan}
        />
      )}
    </div>
  );
}
