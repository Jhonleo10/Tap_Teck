"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  RotateCcw,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DocumentViewer } from "@/components/verification/document-viewer";
import {
  DocumentActionDialog,
  type DocumentAction,
} from "@/components/verification/document-action-dialog";
import {
  getVerificationProviders,
  reviewDocument,
  updateProviderVerificationStatus,
} from "@/actions/verification";
import {
  VERIFICATION_DOCUMENTS,
  canAdminReviewDoc,
  type DocumentType,
} from "@/lib/verification-documents";
import { formatDate } from "@/lib/utils";
import type { DocStatus, VerificationStatus } from "@prisma/client";
import type { getVerificationProviders as GetVerificationProviders } from "@/actions/verification";

type VerificationData = Awaited<ReturnType<typeof GetVerificationProviders>>;
type ProviderItem = VerificationData["items"][number];

function DocStatusIcon({ status }: { status: DocStatus }) {
  if (status === "APPROVED") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "REUPLOAD_REQUESTED")
    return <RotateCcw className="h-4 w-4 text-orange-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

export function VerificationContent({
  initialData,
}: {
  initialData: VerificationData;
}) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [isPending, startTransition] = useTransition();

  const [viewer, setViewer] = useState<{
    title: string;
    url: string | null;
    number?: string | null;
  } | null>(null);

  const [actionDialog, setActionDialog] = useState<{
    providerId: string;
    documentType: DocumentType;
    action: DocumentAction;
  } | null>(null);

  const [rejectProvider, setRejectProvider] = useState<{
    providerId: string;
    reason: string;
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
    (overrides?: { page?: number; pageSize?: number; status?: VerificationStatus | "ALL"; q?: string }) => {
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

  const handleDocAction = async (note?: string) => {
    if (!actionDialog) return;
    await reviewDocument({
      providerId: actionDialog.providerId,
      documentType: actionDialog.documentType,
      status: actionDialog.action,
      note,
    });
    toast.success(`Document ${actionDialog.action.replace("_", " ").toLowerCase()}`);
    fetchData();
  };

  const handleProviderStatus = async (
    providerId: string,
    status: VerificationStatus,
    reason?: string
  ) => {
    try {
      await updateProviderVerificationStatus({
        providerId,
        verificationStatus: status,
        rejectionReason: reason,
      });
      toast.success(`Provider marked as ${status.replace("_", " ").toLowerCase()}`);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const getDocUrl = (
    verification: ProviderItem["verification"],
    urlField: keyof import("@/lib/verification-documents").DocumentUrlFields | null
  ) => {
    if (!verification || !urlField) return null;
    return verification[urlField as keyof typeof verification] as string | null;
  };

  const getDocNote = (
    verification: ProviderItem["verification"],
    docType: DocumentType
  ) => {
    const notes = verification?.documentNotes;
    if (notes && typeof notes === "object" && !Array.isArray(notes)) {
      return (notes as Record<string, string>)[docType];
    }
    return null;
  };

  const renderProviderCard = (provider: ProviderItem) => (
    <Card key={provider.id} className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 bg-muted/20 pb-4">
        <div className="min-w-0">
          <CardTitle className="text-lg truncate">{provider.businessName}</CardTitle>
          <p className="text-sm text-muted-foreground truncate">
            {provider.user.name} · {provider.user.email}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Applied {formatDate(provider.createdAt)}
          </p>
        </div>
        <StatusBadge status={provider.verificationStatus} />
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {provider.verification ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {VERIFICATION_DOCUMENTS.map((doc) => {
              const status = provider.verification![doc.statusField];
              const url = getDocUrl(provider.verification, doc.urlField);
              const number = doc.numberField
                ? provider.verification![doc.numberField]
                : null;
              const note = getDocNote(provider.verification, doc.type);

              return (
                <div
                  key={doc.type}
                  className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/10 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.label}</p>
                        {number && (
                          <p className="text-xs text-muted-foreground truncate">{number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DocStatusIcon status={status} />
                      <StatusBadge status={status} />
                    </div>
                  </div>

                  {note && (
                    <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-2">
                      {note}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                      onClick={() =>
                        setViewer({ title: doc.label, url, number })
                      }
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    {canAdminReviewDoc(status) && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() =>
                            setActionDialog({
                              providerId: provider.id,
                              documentType: doc.type,
                              action: "APPROVED",
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          onClick={() =>
                            setActionDialog({
                              providerId: provider.id,
                              documentType: doc.type,
                              action: "REUPLOAD_REQUESTED",
                            })
                          }
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Re-upload
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs text-red-600"
                          onClick={() =>
                            setActionDialog({
                              providerId: provider.id,
                              documentType: doc.type,
                              action: "REJECTED",
                            })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">No verification documents submitted yet</p>
          </div>
        )}

        {provider.messages.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              Recent messages to provider
            </div>
            <ul className="space-y-2">
              {provider.messages.map((msg) => (
                <li
                  key={msg.id}
                  className="rounded-lg bg-background/60 px-3 py-2 text-sm"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {formatDate(msg.createdAt)} · {msg.action.replace(/_/g, " ")}
                    {msg.isAutomated ? " · Automated" : ""}
                  </p>
                  <p className="leading-relaxed">{msg.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
            disabled={provider.verificationStatus === "UNDER_REVIEW" || isPending}
            onClick={() => handleProviderStatus(provider.id, "UNDER_REVIEW")}
          >
            Under Review
          </Button>
          <Button
            size="sm"
            className="rounded-lg"
            disabled={provider.verificationStatus === "VERIFIED" || isPending}
            onClick={() => handleProviderStatus(provider.id, "VERIFIED")}
          >
            Verify Provider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-lg"
            disabled={provider.verificationStatus === "REJECTED" || isPending}
            onClick={() => setRejectProvider({ providerId: provider.id, reason: "" })}
          >
            Reject Provider
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const counts = data.statusCounts;
  const totalAll = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Center"
        description="Review KYC documents, request re-uploads, and verify providers before they receive bookings"
        badge="Compliance"
      />

      <div className="relative max-w-md">
        <Input
          placeholder="Search providers..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="rounded-xl"
        />
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({totalAll})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.PENDING ?? 0})</TabsTrigger>
          <TabsTrigger value="review">Under Review ({counts.UNDER_REVIEW ?? 0})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({counts.VERIFIED ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.REJECTED ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          {isPending && data.items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Loading…</div>
          ) : data.items.length > 0 ? (
            <>
              {data.items.map(renderProviderCard)}
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
            <div className="py-16 text-center text-muted-foreground rounded-2xl border border-dashed">
              No providers in this category
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
      />

      <DocumentActionDialog
        open={!!actionDialog}
        onOpenChange={(open) => !open && setActionDialog(null)}
        documentType={actionDialog?.documentType ?? null}
        action={actionDialog?.action ?? null}
        onConfirm={handleDocAction}
        loading={isPending}
      />

      <Dialog open={!!rejectProvider} onOpenChange={(open) => !open && setRejectProvider(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Provider</DialogTitle>
            <DialogDescription>
              An automated rejection message will be sent to the provider.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectProvider?.reason ?? ""}
            onChange={(e) =>
              setRejectProvider((prev) =>
                prev ? { ...prev, reason: e.target.value } : null
              )
            }
            rows={3}
            className="rounded-xl resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectProvider(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectProvider) return;
                await handleProviderStatus(
                  rejectProvider.providerId,
                  "REJECTED",
                  rejectProvider.reason || undefined
                );
                setRejectProvider(null);
              }}
            >
              Reject Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
