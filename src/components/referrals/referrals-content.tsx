"use client";

import { useMemo, useState, useCallback, useEffect, useTransition } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trophy,
  Star,
  Briefcase,
  Gift,
  Users,
  IndianRupee,
  Settings2,
  CheckCircle,
  XCircle,
  Search,
  UserPlus,
} from "lucide-react";
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
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import {
  getReferrals,
  getRewards,
  getReferralStats,
  getTopPerformers,
  assignReward,
  autoAssignRewards,
  updateReferralStatus,
  searchRewardRecipients,
  searchReferralUsers,
  assignReferral,
  type ReferralStats,
} from "@/actions/referrals";
import { fetchReferralOperations, updateRewardStatus } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import { useCountry } from "@/components/providers/country-provider";
import { GlassCard } from "@/components/shared/glass-card";
import { formatCurrency, formatDate, shortId } from "@/lib/utils";
import {
  EMPTY_DATE_RANGE,
  hasActiveDateRange,
  type DateRange,
} from "@/lib/date-filters";
import type { ReferralStatus, RewardStatus, RewardType } from "@prisma/client";

const rewardSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  value: z.coerce.number().optional(),
});

type ReferralRow = {
  id: string;
  referralCode: string;
  rewardAmount: number;
  status: string;
  createdAt: Date;
  inviter: {
    id: string;
    name: string | null;
    email: string;
    referralCode: string | null;
  };
  referredUser: { id: string; name: string | null; email: string };
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
  providerId: string | null;
  providerName: string | null;
  recipientLabel: string;
  user: { name: string | null; email: string } | null;
};

type Performers = {
  highestRated: {
    id: string;
    businessName: string;
    rating: number;
    user: { name: string | null };
  } | null;
  mostJobs: {
    id: string;
    businessName: string;
    completedJobs: number;
    user: { name: string | null };
  } | null;
  bestReviews: {
    id: string;
    businessName: string;
    totalReviews: number;
    user: { name: string | null };
  } | null;
};

type RecipientSelection =
  | { kind: "user"; id: string; label: string }
  | { kind: "provider"; id: string; label: string }
  | null;

type ReferralUserResult = {
  id: string;
  name: string | null;
  email: string;
  referralCode: string | null;
  referredById: string | null;
};

type ReferralUserSelection = { id: string; label: string; sublabel: string } | null;

const REFERRAL_STATUSES: ReferralStatus[] = ["PENDING", "COMPLETED", "EXPIRED"];
const REWARD_STATUSES: RewardStatus[] = ["ACTIVE", "CLAIMED", "EXPIRED"];
const REWARD_TYPES: RewardType[] = [
  "HIGHEST_RATED",
  "MOST_JOBS",
  "BEST_REVIEWS",
  "MANUAL_GIFT",
  "REFERRAL_BONUS",
];

export function ReferralsContent({
  initialReferrals,
  initialRewards,
  initialStats,
  performers: initialPerformers,
  adminId,
}: {
  initialReferrals: import("@/lib/pagination").PaginatedResult<ReferralRow>;
  initialRewards: import("@/lib/pagination").PaginatedResult<RewardRow>;
  initialStats: ReferralStats;
  performers: Performers;
  adminId: string;
}) {
  const { countryCode, isReady } = useCountry();
  const [isPending, startTransition] = useTransition();

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [assignReferralOpen, setAssignReferralOpen] = useState(false);
  const [assigningReferral, setAssigningReferral] = useState(false);
  const [referralsPage, setReferralsPage] = useState(initialReferrals);
  const [rewardsPage, setRewardsPage] = useState(initialRewards);
  const [stats, setStats] = useState(initialStats);
  const [performers, setPerformers] = useState(initialPerformers);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rewardStatusFilter, setRewardStatusFilter] = useState<string>("all");
  const [rewardTypeFilter, setRewardTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [search, setSearch] = useState("");
  const [rewardSearch, setRewardSearch] = useState("");
  const [activeTab, setActiveTab] = useState("referrals");

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<{
    users: { id: string; name: string | null; email: string }[];
    providers: { id: string; businessName: string; user: { name: string | null; email: string } }[];
  }>({ users: [], providers: [] });
  const [recipient, setRecipient] = useState<RecipientSelection>(null);

  const [inviterQuery, setInviterQuery] = useState("");
  const [inviterResults, setInviterResults] = useState<ReferralUserResult[]>([]);
  const [inviter, setInviter] = useState<ReferralUserSelection>(null);

  const [referredQuery, setReferredQuery] = useState("");
  const [referredResults, setReferredResults] = useState<ReferralUserResult[]>([]);
  const [referredUser, setReferredUser] = useState<ReferralUserSelection>(null);
  const [assignStatus, setAssignStatus] = useState<ReferralStatus>("PENDING");

  const referralFilters = useCallback(
    () => ({
      country: countryCode,
      status: (statusFilter === "all" ? "ALL" : statusFilter) as ReferralStatus | "ALL",
      search: search.trim() || undefined,
      dateFrom: dateRange.from || undefined,
      dateTo: dateRange.to || undefined,
    }),
    [countryCode, statusFilter, search, dateRange]
  );

  const rewardFilters = useCallback(
    () => ({
      status: (rewardStatusFilter === "all" ? "ALL" : rewardStatusFilter) as RewardStatus | "ALL",
      type: (rewardTypeFilter === "all" ? "ALL" : rewardTypeFilter) as RewardType | "ALL",
      search: rewardSearch.trim() || undefined,
    }),
    [rewardStatusFilter, rewardTypeFilter, rewardSearch]
  );

  const loadReferrals = useCallback(
    (page = 1, pageSize = referralsPage.pageSize) => {
      startTransition(async () => {
        const filters = referralFilters();
        const [listResult, statsResult] = await Promise.all([
          getReferrals({ ...filters, page, pageSize }),
          getReferralStats(filters),
        ]);
        if (listResult.success && listResult.data) setReferralsPage(listResult.data);
        if (statsResult.success && statsResult.data) setStats(statsResult.data);
      });
    },
    [referralFilters, referralsPage.pageSize]
  );

  const loadRewards = useCallback(
    (page = 1, pageSize = rewardsPage.pageSize) => {
      startTransition(async () => {
        const result = await getRewards({ ...rewardFilters(), page, pageSize });
        if (result.success && result.data) setRewardsPage(result.data);
      });
    },
    [rewardFilters, rewardsPage.pageSize]
  );

  const { data: referralOps } = useOperationsPoll({
    fetcher: useCallback(() => fetchReferralOperations(countryCode), [countryCode]),
    intervalMs: 120_000,
  });

  useEffect(() => {
    if (!isReady) return;
    setStatusFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    setRewardStatusFilter("all");
    setRewardTypeFilter("all");
    setRewardSearch("");
    startTransition(async () => {
      const filters = { country: countryCode };
      const [listResult, statsResult, rewardsResult, performersResult] = await Promise.all([
        getReferrals({ ...filters, page: 1, pageSize: referralsPage.pageSize }),
        getReferralStats(filters),
        getRewards({ page: 1, pageSize: rewardsPage.pageSize }),
        getTopPerformers(countryCode),
      ]);
      if (listResult.success && listResult.data) setReferralsPage(listResult.data);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
      if (rewardsResult.success && rewardsResult.data) setRewardsPage(rewardsResult.data);
      if (performersResult.success && performersResult.data) setPerformers(performersResult.data);
    });
  }, [countryCode, isReady, referralsPage.pageSize, rewardsPage.pageSize]);

  useEffect(() => {
    if (!recipientQuery.trim()) {
      setRecipientResults({ users: [], providers: [] });
      return;
    }
    const timer = setTimeout(() => {
      searchRewardRecipients(recipientQuery).then((result) => {
        if (result.success && result.data) setRecipientResults(result.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [recipientQuery]);

  useEffect(() => {
    if (!inviterQuery.trim()) {
      setInviterResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchReferralUsers(inviterQuery).then((result) => {
        if (result.success && result.data) setInviterResults(result.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [inviterQuery]);

  useEffect(() => {
    if (!referredQuery.trim()) {
      setReferredResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchReferralUsers(referredQuery).then((result) => {
        if (result.success && result.data) setReferredResults(result.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [referredQuery]);

  const statusChart = useMemo(() => {
    const slices = [
      { name: "Completed", value: stats.completed },
      { name: "Pending", value: stats.pending },
      { name: "Expired", value: stats.expired },
    ].filter((s) => s.value > 0);
    return slices;
  }, [stats]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof rewardSchema>>({
    resolver: zodResolver(rewardSchema),
  });

  const handleReferralStatus = async (id: string, status: ReferralStatus) => {
    const result = await updateReferralStatus(id, status);
    if (result.success) {
      toast.success(`Referral marked as ${status.toLowerCase()}`);
      loadReferrals(referralsPage.page);
    } else {
      toast.error(result.error ?? "Failed to update referral");
    }
  };

  const referralColumns: ColumnDef<ReferralRow>[] = [
    { accessorKey: "referralCode", header: "Referral Code" },
    {
      accessorKey: "inviter",
      header: "Inviter",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.original.inviter.name ?? row.original.inviter.email}
          </p>
          {row.original.inviter.referralCode && (
            <p className="truncate text-xs text-muted-foreground">
              Code: {row.original.inviter.referralCode}
            </p>
          )}
        </div>
      ),
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
    {
      id: "referralActions",
      header: "Actions",
      cell: ({ row }) =>
        row.original.status === "PENDING" ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleReferralStatus(row.original.id, "COMPLETED")}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => handleReferralStatus(row.original.id, "EXPIRED")}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Expire
            </Button>
          </div>
        ) : null,
    },
  ];

  const rewardColumns: ColumnDef<RewardRow>[] = [
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: "recipientLabel",
      header: "Recipient",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.recipientLabel}</p>
          {row.original.providerName && (
            <p className="text-xs text-muted-foreground">Provider</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => (row.original.value ? formatCurrency(row.original.value) : "—"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "isAutomatic",
      header: "Source",
      cell: ({ row }) => (row.original.isAutomatic ? "Auto" : "Manual"),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "rewardActions",
      header: "Actions",
      cell: ({ row }) =>
        row.original.status === "ACTIVE" ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={async () => {
                const result = await updateRewardStatus(row.original.id, "CLAIMED");
                if (result.success) {
                  toast.success("Reward approved");
                  loadRewards(rewardsPage.page);
                } else {
                  toast.error(result.error ?? "Failed");
                }
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={async () => {
                const result = await updateRewardStatus(row.original.id, "EXPIRED");
                if (result.success) {
                  toast.success("Reward rejected");
                  loadRewards(rewardsPage.page);
                } else {
                  toast.error(result.error ?? "Failed");
                }
              }}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  const onAssignReward = async (data: z.infer<typeof rewardSchema>) => {
    if (!recipient) {
      toast.error("Select a recipient");
      return;
    }
    const result = await assignReward({
      ...data,
      type: "MANUAL_GIFT",
      userId: recipient.kind === "user" ? recipient.id : undefined,
      providerId: recipient.kind === "provider" ? recipient.id : undefined,
      assignedBy: adminId,
    });
    if (!result.success) {
      toast.error(result.error ?? "Failed to assign reward");
      return;
    }
    toast.success("Reward assigned successfully");
    setRewardDialogOpen(false);
    reset();
    setRecipient(null);
    setRecipientQuery("");
    loadRewards(1);
  };

  const onAutoAssign = async () => {
    const result = await autoAssignRewards(adminId, countryCode);
    if (!result.success) {
      toast.error(result.error ?? "Failed to assign rewards");
      return;
    }
    toast.success(`${result.data?.count ?? 0} automatic rewards assigned`);
    loadRewards(1);
  };

  const resetAssignReferralForm = () => {
    setInviterQuery("");
    setInviterResults([]);
    setInviter(null);
    setReferredQuery("");
    setReferredResults([]);
    setReferredUser(null);
    setAssignStatus("PENDING");
  };

  const onAssignReferral = async () => {
    if (!inviter || !referredUser) {
      toast.error("Select both inviter and referred user");
      return;
    }
    if (inviter.id === referredUser.id) {
      toast.error("Inviter and referred user must be different");
      return;
    }

    setAssigningReferral(true);
    const result = await assignReferral({
      inviterId: inviter.id,
      referredUserId: referredUser.id,
      status: assignStatus,
    });
    setAssigningReferral(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to assign referral");
      return;
    }

    toast.success(
      `Referral assigned (${result.data?.referralCode ?? "code generated"})`
    );
    setAssignReferralOpen(false);
    resetAssignReferralForm();
    loadReferrals(1);
  };

  const renderUserSearchResults = (
    users: ReferralUserResult[],
    onSelect: (user: ReferralUserResult) => void,
    isDisabled?: (user: ReferralUserResult) => boolean
  ) => {
    if (users.length === 0) return null;
    return (
      <div className="max-h-44 overflow-y-auto rounded-md border">
        {users.map((u) => {
          const disabled = isDisabled?.(u) ?? false;
          return (
            <button
              key={u.id}
              type="button"
              disabled={disabled}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onSelect(u)}
            >
              <span className="font-medium">{u.name ?? u.email}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {shortId(u.id)}
                {u.referralCode ? ` · ${u.referralCode}` : ""}
                {u.referredById ? " · already referred" : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const resetReferralFilters = () => {
    setStatusFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    startTransition(async () => {
      const filters = { country: countryCode };
      const [listResult, statsResult] = await Promise.all([
        getReferrals({ ...filters, page: 1, pageSize: referralsPage.pageSize }),
        getReferralStats(filters),
      ]);
      if (listResult.success && listResult.data) setReferralsPage(listResult.data);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
    });
  };

  const displayStats = {
    total: referralOps?.totalReferrals ?? stats.total,
    conversionRate: referralOps?.conversionRate ?? stats.conversionRate,
    rewardsPaid: referralOps?.totalRewardsPaid ?? stats.totalRewardsPaid,
    activeRewards: stats.activeRewards,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral & Rewards"
        description="Monitor referral performance and assign provider rewards"
        badge="Growth"
      >
        <div className="flex flex-wrap gap-2">
          <Dialog
            open={assignReferralOpen}
            onOpenChange={(open) => {
              setAssignReferralOpen(open);
              if (!open) resetAssignReferralForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="default">
                <UserPlus className="h-4 w-4" />
                Assign Referral
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Referral</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Inviter (earns reward)</Label>
                  <Input
                    placeholder="Search by name, email, or user ID…"
                    value={inviterQuery}
                    onChange={(e) => {
                      setInviterQuery(e.target.value);
                      setInviter(null);
                    }}
                  />
                  {inviter && (
                    <p className="text-sm text-primary">
                      Selected: {inviter.label} · {inviter.sublabel}
                    </p>
                  )}
                  {renderUserSearchResults(
                    inviterResults,
                    (u) => {
                      setInviter({
                        id: u.id,
                        label: u.name ?? u.email,
                        sublabel: u.referralCode ?? shortId(u.id),
                      });
                      setInviterQuery(u.name ?? u.email);
                      setInviterResults([]);
                    },
                    (u) => u.id === referredUser?.id
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Referred user</Label>
                  <Input
                    placeholder="Search by name, email, or user ID…"
                    value={referredQuery}
                    onChange={(e) => {
                      setReferredQuery(e.target.value);
                      setReferredUser(null);
                    }}
                  />
                  {referredUser && (
                    <p className="text-sm text-primary">
                      Selected: {referredUser.label} · {referredUser.sublabel}
                    </p>
                  )}
                  {renderUserSearchResults(
                    referredResults,
                    (u) => {
                      setReferredUser({
                        id: u.id,
                        label: u.name ?? u.email,
                        sublabel: shortId(u.id),
                      });
                      setReferredQuery(u.name ?? u.email);
                      setReferredResults([]);
                    },
                    (u) => u.id === inviter?.id || Boolean(u.referredById)
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Initial status</Label>
                  <Select
                    value={assignStatus}
                    onValueChange={(v) => setAssignStatus(v as ReferralStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!inviter || !referredUser || assigningReferral}
                  onClick={onAssignReferral}
                >
                  {assigningReferral ? "Assigning…" : "Assign Referral"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onAutoAssign} disabled={isPending}>
            Auto-Assign Top Performers
          </Button>
          <Dialog
            open={rewardDialogOpen}
            onOpenChange={(open) => {
              setRewardDialogOpen(open);
              if (!open) {
                setRecipient(null);
                setRecipientQuery("");
                reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Gift className="h-4 w-4" />
                Assign Gift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Manual Reward</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onAssignReward)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <Input
                    placeholder="Search customer or provider..."
                    value={recipientQuery}
                    onChange={(e) => {
                      setRecipientQuery(e.target.value);
                      setRecipient(null);
                    }}
                  />
                  {recipient && (
                    <p className="text-sm text-primary">
                      Selected: {recipient.label} ({recipient.kind})
                    </p>
                  )}
                  {(recipientResults.users.length > 0 || recipientResults.providers.length > 0) && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {recipientResults.users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setRecipient({
                              kind: "user",
                              id: u.id,
                              label: u.name ?? u.email,
                            });
                            setRecipientQuery(u.name ?? u.email);
                          }}
                        >
                          <span className="font-medium">{u.name ?? u.email}</span>
                          <span className="ml-2 text-xs text-muted-foreground">Customer</span>
                        </button>
                      ))}
                      {recipientResults.providers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setRecipient({
                              kind: "provider",
                              id: p.id,
                              label: p.businessName,
                            });
                            setRecipientQuery(p.businessName);
                          }}
                        >
                          <span className="font-medium">{p.businessName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">Provider</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input {...register("title")} placeholder="Gift title" />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...register("description")} placeholder="Optional description" />
                </div>
                <div className="space-y-2">
                  <Label>Value (₹)</Label>
                  <Input type="number" {...register("value")} placeholder="0" />
                </div>
                <Button type="submit" disabled={isSubmitting || !recipient} className="w-full">
                  Assign Reward
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Default referral reward</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(stats.defaultRewardAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            Applied when a referral is marked complete
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Edit in Settings
          </Link>
        </Button>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Referrals" value={displayStats.total} icon={Users} accent="teal" />
        <StatCard
          title="Conversion Rate"
          value={`${Math.round(displayStats.conversionRate * 100)}%`}
          icon={Gift}
          accent="emerald"
        />
        <StatCard
          title="Rewards Paid"
          value={formatCurrency(displayStats.rewardsPaid)}
          icon={IndianRupee}
          accent="amber"
        />
        <StatCard
          title="Active Rewards"
          value={displayStats.activeRewards}
          icon={Trophy}
          accent="blue"
        />
      </div>

      {referralOps?.topReferrers && referralOps.topReferrers.length > 0 && (
        <GlassCard className="p-4">
          <p className="mb-3 text-sm font-semibold">Top Referrers</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {referralOps.topReferrers.map((r) => (
              <li
                key={r.email}
                className="flex justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.count} refs · {formatCurrency(r.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {statusChart.length > 0 && (
          <ChartCard title="Referral Status Breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {statusChart.map((_, i) => (
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="referrals">Referrals ({referralsPage.total})</TabsTrigger>
          <TabsTrigger value="rewards">Rewards ({rewardsPage.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card/50 p-4">
            <div className="min-w-[140px] space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {REFERRAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Code, inviter, or referred user…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadReferrals(1)}
                />
              </div>
            </div>
            <Button onClick={() => loadReferrals(1)} disabled={isPending}>
              Apply
            </Button>
            {(statusFilter !== "all" || search || hasActiveDateRange(dateRange)) && (
              <Button variant="ghost" onClick={resetReferralFilters}>
                Reset
              </Button>
            )}
          </div>

          <ExportButtons
            data={referralsPage.items.map((r) => ({
              code: r.referralCode,
              inviter: r.inviter.email,
              referred: r.referredUser.email,
              reward: r.rewardAmount,
              status: r.status,
              date: formatDate(r.createdAt),
            }))}
            filename="referrals"
          />
          <DataTable
            columns={referralColumns}
            data={referralsPage.items}
            showPagination={false}
          />
          <PaginationControls
            page={referralsPage.page}
            pageSize={referralsPage.pageSize}
            total={referralsPage.total}
            onPageChange={(p) => loadReferrals(p)}
            onPageSizeChange={(size) => loadReferrals(1, size)}
          />
        </TabsContent>

        <TabsContent value="rewards" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card/50 p-4">
            <div className="min-w-[140px] space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={rewardStatusFilter} onValueChange={setRewardStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {REWARD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px] space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={rewardTypeFilter} onValueChange={setRewardTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {REWARD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Title, recipient…"
                value={rewardSearch}
                onChange={(e) => setRewardSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadRewards(1)}
              />
            </div>
            <Button onClick={() => loadRewards(1)} disabled={isPending}>
              Apply
            </Button>
            {(rewardStatusFilter !== "all" || rewardTypeFilter !== "all" || rewardSearch) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRewardStatusFilter("all");
                  setRewardTypeFilter("all");
                  setRewardSearch("");
                  startTransition(async () => {
                    const result = await getRewards({ page: 1, pageSize: rewardsPage.pageSize });
                    if (result.success && result.data) setRewardsPage(result.data);
                  });
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <DataTable columns={rewardColumns} data={rewardsPage.items} showPagination={false} />
          <PaginationControls
            page={rewardsPage.page}
            pageSize={rewardsPage.pageSize}
            total={rewardsPage.total}
            onPageChange={(p) => loadRewards(p)}
            onPageSizeChange={(size) => loadRewards(1, size)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
