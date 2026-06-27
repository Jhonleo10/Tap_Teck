"use client";

import { useCallback, useState, useTransition } from "react";
import { Search, Shield, Clock, CheckCircle2, XCircle, FileCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentViewer } from "@/components/verification/document-viewer";
import { ProviderReviewCard } from "@/components/verification/provider-review-card";
import { getVerificationProviders } from "@/actions/verification";
import type { VerificationStatus } from "@prisma/client";
import type { getVerificationProviders as GetVerificationProviders } from "@/actions/verification";

type VerificationData = Awaited<ReturnType<typeof GetVerificationProviders>>;

export function VerificationContent({
  initialData,
}: {
  initialData: VerificationData;
}) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [isPending, startTransition] = useTransition();

  const [viewer, setViewer] = useState<{
    title: string;
    url: string | null;
    number?: string | null;
    onViewed?: () => void;
  } | null>(null);

  const statusFilter: VerificationStatus | "ALL" =
    tab === "all"
      ? "ALL"
      : tab === "pending"
        ? "PENDING"
        : tab === "review"
          ? "UNDER_REVIEW"
          : tab === "verified"
            ? "VERIFIED"
            : "REJECTED";

  const fetchData = useCallback(
    (overrides?: {
      page?: number;
      pageSize?: number;
      status?: VerificationStatus | "ALL";
      q?: string;
    }) => {
      startTransition(async () => {
        const result = await getVerificationProviders({
          page: overrides?.page ?? page,
          pageSize: overrides?.pageSize ?? pageSize,
          status: overrides?.status ?? statusFilter,
          search: (overrides?.q ?? search) || undefined,
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [page, pageSize, statusFilter, search]
  );

  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(1);
    const statusMap: Record<string, VerificationStatus | "ALL"> = {
      all: "ALL",
      pending: "PENDING",
      review: "UNDER_REVIEW",
      verified: "VERIFIED",
      rejected: "REJECTED",
    };
    fetchData({ page: 1, status: statusMap[value] });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchData({ page: 1, q: value });
  };

  const counts = data.statusCounts;
  const totalAll = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Center"
        description="Review each document individually, then submit the full verification report"
        badge="Compliance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total providers"
          value={totalAll}
          icon={Shield}
          className="border-primary/20"
        />
        <StatCard
          title="Pending"
          value={counts.PENDING ?? 0}
          icon={Clock}
          className="border-amber-500/20"
        />
        <StatCard
          title="Under review"
          value={counts.UNDER_REVIEW ?? 0}
          icon={FileCheck}
          className="border-blue-500/20"
        />
        <StatCard
          title="Verified"
          value={counts.VERIFIED ?? 0}
          icon={CheckCircle2}
          className="border-emerald-500/20"
        />
        <StatCard
          title="Rejected"
          value={counts.REJECTED ?? 0}
          icon={XCircle}
          className="border-red-500/20"
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-background p-4 sm:grid-cols-3">
        {[
          {
            step: "1",
            title: "Open & review",
            desc: "Click each document to open the viewer and review the upload",
          },
          {
            step: "2",
            title: "Accept or reject",
            desc: "After reviewing, accept or reject with a built-in or custom message",
          },
          {
            step: "3",
            title: "Submit report",
            desc: "Submit once all documents are reviewed — rejected docs go back for re-upload only",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="flex gap-3 rounded-xl border border-border/40 bg-background/80 p-4 shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              {item.step}
            </span>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by business name, provider name, or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="rounded-xl pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="pending" className="rounded-lg">
            Pending ({counts.PENDING ?? 0})
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-lg">
            Under Review ({counts.UNDER_REVIEW ?? 0})
          </TabsTrigger>
          <TabsTrigger value="verified" className="rounded-lg">
            Verified ({counts.VERIFIED ?? 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg">
            Rejected ({counts.REJECTED ?? 0})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg">
            All ({totalAll})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-6">
          {isPending && data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              Loading providers…
            </div>
          ) : data.items.length > 0 ? (
            <>
              {data.items.map((provider) => (
                <ProviderReviewCard
                  key={provider.id}
                  provider={provider}
                  onViewDocument={({ title, url, number, onViewed }) =>
                    setViewer({ title, url, number, onViewed })
                  }
                  onSubmitted={() => fetchData()}
                />
              ))}
              <PaginationControls
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={(p) => {
                  setPage(p);
                  fetchData({ page: p });
                }}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                  fetchData({ page: 1, pageSize: size });
                }}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No providers in this category</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DocumentViewer
        open={!!viewer}
        onOpenChange={(open) => !open && setViewer(null)}
        title={viewer?.title ?? ""}
        url={viewer?.url ?? null}
        documentNumber={viewer?.number}
        onViewed={viewer?.onViewed}
      />
    </div>
  );
}
