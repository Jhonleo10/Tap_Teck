"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trophy, Star, Briefcase, Gift, Users, IndianRupee } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard, CHART_COLORS } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignReward, autoAssignRewards } from "@/actions/referrals";
import { formatCurrency, formatDate } from "@/lib/utils";

const rewardSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  value: z.coerce.number().optional(),
});

type ReferralRow = {
  id: string;
  referralCode: string;
  rewardAmount: number;
  status: string;
  createdAt: Date;
  inviter: { name: string | null; email: string; referralCode: string | null };
  referredUser: { name: string | null; email: string };
};

type RewardRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  value: number | null;
  isAutomatic: boolean;
  status: string;
  createdAt: Date;
  user: { name: string | null; email: string } | null;
};

type Performers = {
  highestRated: { businessName: string; rating: number; user: { name: string | null } } | null;
  mostJobs: { businessName: string; completedJobs: number; user: { name: string | null } } | null;
  bestReviews: { businessName: string; totalReviews: number; user: { name: string | null } } | null;
};

export function ReferralsContent({
  referrals,
  rewards,
  performers,
  adminId,
}: {
  referrals: ReferralRow[];
  rewards: RewardRow[];
  performers: Performers;
  adminId: string;
}) {
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardList] = useState(rewards);

  const referralStats = useMemo(() => {
    const completed = referrals.filter((r) => r.status === "COMPLETED").length;
    const totalRewards = referrals.reduce((s, r) => s + r.rewardAmount, 0);
    const statusChart = ["COMPLETED", "PENDING", "EXPIRED"].map((status) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase(),
      value: referrals.filter((r) => r.status === status).length,
    })).filter((s) => s.value > 0);
    return { completed, totalRewards, statusChart };
  }, [referrals]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof rewardSchema>>({
    resolver: zodResolver(rewardSchema),
  });

  const referralColumns: ColumnDef<ReferralRow>[] = [
    { accessorKey: "referralCode", header: "Referral Code" },
    {
      accessorKey: "inviter",
      header: "Inviter",
      cell: ({ row }) => row.original.inviter.name ?? row.original.inviter.email,
    },
    {
      accessorKey: "referredUser",
      header: "Referred User",
      cell: ({ row }) => row.original.referredUser.name ?? row.original.referredUser.email,
    },
    {
      accessorKey: "rewardAmount",
      header: "Reward",
      cell: ({ row }) => formatCurrency(row.original.rewardAmount),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const rewardColumns: ColumnDef<RewardRow>[] = [
    { accessorKey: "title", header: "Title" },
    { accessorKey: "type", header: "Type", cell: ({ row }) => <StatusBadge status={row.original.type} /> },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => row.original.value ? formatCurrency(row.original.value) : "—",
    },
    {
      accessorKey: "isAutomatic",
      header: "Auto",
      cell: ({ row }) => (row.original.isAutomatic ? "Yes" : "Manual"),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const onAssignReward = async (data: z.infer<typeof rewardSchema>) => {
    await assignReward({
      ...data,
      type: "MANUAL_GIFT",
      assignedBy: adminId,
    });
    toast.success("Reward assigned successfully");
    setRewardDialogOpen(false);
    reset();
  };

  const onAutoAssign = async () => {
    const result = await autoAssignRewards(adminId);
    toast.success(`${result.count} automatic rewards assigned`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Referral & Rewards" description="Monitor referral performance and assign provider rewards" badge="Growth">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAutoAssign}>
            Auto-Assign Top Performers
          </Button>
          <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Gift className="h-4 w-4" />
                Assign Gift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Manual Reward</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onAssignReward)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input {...register("title")} placeholder="Gift title" />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...register("description")} placeholder="Optional description" />
                </div>
                <div className="space-y-2">
                  <Label>Value (₹)</Label>
                  <Input type="number" {...register("value")} placeholder="0" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  Assign Reward
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Referrals" value={referrals.length} icon={Users} accent="teal" />
        <StatCard title="Completed" value={referralStats.completed} icon={Gift} accent="emerald" />
        <StatCard title="Rewards Paid" value={formatCurrency(referralStats.totalRewards)} icon={IndianRupee} accent="amber" />
        <StatCard title="Active Rewards" value={rewardList.length} icon={Trophy} accent="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {referralStats.statusChart.length > 0 && (
          <ChartCard title="Referral Status Breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={referralStats.statusChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {referralStats.statusChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Star className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm font-medium">Highest Rated</CardTitle>
            </CardHeader>
            <CardContent>
              {performers.highestRated ? (
                <>
                  <p className="font-semibold">{performers.highestRated.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    {performers.highestRated.rating.toFixed(1)} ⭐ rating
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium">Most Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {performers.mostJobs ? (
                <>
                  <p className="font-semibold">{performers.mostJobs.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    {performers.mostJobs.completedJobs} completed jobs
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Trophy className="h-5 w-5 text-secondary" />
              <CardTitle className="text-sm font-medium">Best Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {performers.bestReviews ? (
                <>
                  <p className="font-semibold">{performers.bestReviews.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    {performers.bestReviews.totalReviews} reviews
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="rewards">Rewards ({rewardList.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="referrals" className="mt-4">
          <ExportButtons
            data={referrals.map((r) => ({
              code: r.referralCode,
              inviter: r.inviter.email,
              referred: r.referredUser.email,
              reward: r.rewardAmount,
              status: r.status,
            }))}
            filename="referrals"
          />
          <div className="mt-4">
            <DataTable columns={referralColumns} data={referrals} searchKey="referralCode" />
          </div>
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <DataTable columns={rewardColumns} data={rewardList} searchKey="title" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
