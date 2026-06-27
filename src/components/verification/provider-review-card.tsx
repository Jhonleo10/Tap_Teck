"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Lock,
  MessageSquare,
  AlertCircle,
  Send,
  RotateCcw,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RejectionMessageDialog } from "@/components/verification/rejection-message-dialog";
import { submitVerificationReview } from "@/actions/verification";
import {
  VERIFICATION_DOCUMENTS,
  canAdminReviewDoc,
  isDocLockedForProvider,
  type DocumentType,
} from "@/lib/verification-documents";
import { getCountry } from "@/lib/countries";
import type { CountryCode } from "@/lib/countries";
import { formatDate, cn } from "@/lib/utils";
import type { DocStatus, VerificationStatus } from "@prisma/client";

type DraftDecision = {
  decision: "APPROVED" | "REUPLOAD_REQUESTED";
  message?: string;
};

type ProviderVerification = {
  id: string;
  businessName: string;
  country: string;
  verificationStatus: VerificationStatus;
  user: { name: string | null; email: string };
  verification: {
    aadhaarStatus: DocStatus;
    panStatus: DocStatus;
    certificateStatus: DocStatus;
    addressStatus: DocStatus;
    profileStatus: DocStatus;
    aadhaarNumber: string | null;
    panNumber: string | null;
    aadhaarDocUrl: string | null;
    panDocUrl: string | null;
    certificateUrl: string | null;
    addressProofUrl: string | null;
    profilePhotoUrl: string | null;
    documentNotes: unknown;
  } | null;
  messages: Array<{
    id: string;
    message: string;
    action: string;
    isAutomated: boolean;
    createdAt: Date;
  }>;
  createdAt: Date;
};

interface ProviderReviewCardProps {
  provider: ProviderVerification;
  onViewDocument: (payload: {
    title: string;
    url: string | null;
    number?: string | null;
    documentType: DocumentType;
    onViewed?: () => void;
  }) => void;
  onSubmitted: () => void;
}

function DocStatusIcon({ status }: { status: DocStatus }) {
  if (status === "APPROVED") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "REUPLOAD_REQUESTED")
    return <RotateCcw className="h-4 w-4 text-orange-500" />;
  if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function DecisionCheckbox({
  label,
  checked,
  disabled,
  variant,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  variant: "accept" | "reject";
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex flex-1 cursor-pointer select-none items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all",
        disabled && "cursor-not-allowed opacity-45",
        checked && variant === "accept" && "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
        checked && variant === "reject" && "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300",
        !checked && !disabled && "border-border/60 bg-background hover:bg-muted/40"
      )}
    >
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 shrink-0 rounded border-2 border-muted-foreground/40",
          variant === "accept" && "accent-emerald-600",
          variant === "reject" && "accent-red-600"
        )}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      {variant === "accept" ? (
        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      {label}
    </label>
  );
}

export function ProviderReviewCard({
  provider: initialProvider,
  onViewDocument,
  onSubmitted,
}: ProviderReviewCardProps) {
  const [provider, setProvider] = useState(initialProvider);
  const [draft, setDraft] = useState<Partial<Record<DocumentType, DraftDecision>>>({});
  const [viewedDocs, setViewedDocs] = useState<Set<DocumentType>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<DocumentType | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProvider(initialProvider);
    setDraft({});
    setViewedDocs(new Set());
  }, [initialProvider]);

  const verification = provider.verification;
  const countryMeta = getCountry(provider.country as CountryCode);

  const reviewableDocs = useMemo(
    () =>
      verification
        ? VERIFICATION_DOCUMENTS.filter((d) => canAdminReviewDoc(verification[d.statusField]))
        : [],
    [verification]
  );

  const viewedCount = reviewableDocs.filter((d) => viewedDocs.has(d.type)).length;
  const reviewedCount = reviewableDocs.filter((d) => draft[d.type]).length;
  const allViewed = reviewableDocs.length > 0 && viewedCount === reviewableDocs.length;
  const allReviewed = reviewableDocs.length > 0 && reviewedCount === reviewableDocs.length;
  const canSubmit = allViewed && allReviewed;
  const reviewProgress =
    reviewableDocs.length > 0
      ? Math.round(((viewedCount + reviewedCount) / (reviewableDocs.length * 2)) * 100)
      : 0;

  const draftSummary = useMemo(() => {
    const values = Object.values(draft);
    return {
      approved: values.filter((v) => v?.decision === "APPROVED").length,
      rejected: values.filter((v) => v?.decision === "REUPLOAD_REQUESTED").length,
    };
  }, [draft]);

  const getDocNote = (docType: DocumentType) => {
    const notes = verification?.documentNotes;
    if (notes && typeof notes === "object" && !Array.isArray(notes)) {
      return (notes as Record<string, string>)[docType];
    }
    return null;
  };

  const getDocUrl = (urlField: (typeof VERIFICATION_DOCUMENTS)[0]["urlField"]) => {
    if (!verification || !urlField) return null;
    return verification[urlField];
  };

  const markViewed = (docType: DocumentType) => {
    setViewedDocs((prev) => new Set(prev).add(docType));
  };

  const markApproved = (docType: DocumentType) => {
    setDraft((prev) => ({
      ...prev,
      [docType]: { decision: "APPROVED" },
    }));
  };

  const markRejected = (docType: DocumentType, message: string) => {
    setDraft((prev) => ({
      ...prev,
      [docType]: { decision: "REUPLOAD_REQUESTED", message },
    }));
  };

  const clearDocDecision = (docType: DocumentType) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const handleViewDocument = (
    docType: DocumentType,
    title: string,
    url: string | null,
    number: string | null
  ) => {
    if (!url) {
      toast.error("No document uploaded for this field");
      return;
    }
    onViewDocument({
      title,
      url,
      number,
      documentType: docType,
      onViewed: () => markViewed(docType),
    });
  };

  const handleAcceptChange = (docType: DocumentType, checked: boolean) => {
    if (!viewedDocs.has(docType)) {
      toast.error("Open and review the document before accepting");
      return;
    }
    if (checked) {
      markApproved(docType);
    } else {
      clearDocDecision(docType);
    }
  };

  const handleRejectChange = (docType: DocumentType, checked: boolean) => {
    if (!viewedDocs.has(docType)) {
      toast.error("Open and review the document before rejecting");
      return;
    }
    if (checked) {
      setRejectDialog(docType);
    } else {
      clearDocDecision(docType);
    }
  };

  const clearDraft = () => {
    setDraft({});
    setViewedDocs(new Set());
  };

  const handleSubmit = () => {
    if (!allViewed) {
      toast.error("Review every pending document in the viewer before submitting");
      return;
    }
    if (!allReviewed) {
      toast.error("Accept or reject every pending document before submitting");
      return;
    }

    startTransition(async () => {
      try {
        const decisions = reviewableDocs.map((d) => {
          const item = draft[d.type]!;
          return {
            documentType: d.type,
            decision: item.decision,
            message: item.message,
          };
        });

        const result = await submitVerificationReview({
          providerId: provider.id,
          decisions,
        });

        if (result.allApproved) {
          toast.success("All documents approved — provider is now verified!");
        } else if (result.anyReupload) {
          toast.success("Review submitted — rejected documents sent to provider for re-upload");
        } else {
          toast.success("Verification review submitted");
        }

        setDraft({});
        setViewedDocs(new Set());
        onSubmitted();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit review");
      }
    });
  };

  const isVerified = provider.verificationStatus === "VERIFIED";

  return (
    <Card className="overflow-hidden border-border/60 shadow-md">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{provider.businessName}</CardTitle>
              <Badge variant="outline" className="rounded-lg font-normal">
                {countryMeta.flag} {countryMeta.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {provider.user.name} · {provider.user.email}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Applied {formatDate(provider.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <StatusBadge status={provider.verificationStatus} />
            {reviewableDocs.length > 0 && !isVerified && (
              <div className="w-full min-w-[200px] space-y-2 lg:w-56">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Review progress</span>
                  <span className="font-medium text-foreground">{reviewProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${reviewProgress}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-lg font-normal">
                    Viewed {viewedCount}/{reviewableDocs.length}
                  </Badge>
                  <Badge variant="secondary" className="rounded-lg font-normal">
                    Decided {reviewedCount}/{reviewableDocs.length}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {!verification ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-muted-foreground">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm">No verification documents submitted yet</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {VERIFICATION_DOCUMENTS.map((doc) => {
                const dbStatus = verification[doc.statusField];
                const locked = isDocLockedForProvider(dbStatus);
                const reviewable = canAdminReviewDoc(dbStatus);
                const draftItem = draft[doc.type];
                const url = getDocUrl(doc.urlField);
                const number = doc.numberField ? verification[doc.numberField] : null;
                const savedNote = getDocNote(doc.type);
                const isViewed = viewedDocs.has(doc.type);
                const isAccepted = draftItem?.decision === "APPROVED";
                const isRejected = draftItem?.decision === "REUPLOAD_REQUESTED";
                const canDecide = reviewable && !isVerified && isViewed;

                return (
                  <div
                    key={doc.type}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl border transition-all",
                      isAccepted && "border-emerald-500/50 bg-emerald-500/[0.04] shadow-sm",
                      isRejected && "border-orange-500/50 bg-orange-500/[0.04] shadow-sm",
                      locked && "border-emerald-500/25 bg-emerald-500/[0.03]",
                      !locked && !draftItem && "border-border/50 bg-card hover:border-primary/20"
                    )}
                  >
                    {url && (
                      <div className="relative h-28 overflow-hidden border-b border-border/40 bg-muted/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                          <DocStatusIcon status={dbStatus} />
                          <StatusBadge status={dbStatus} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{doc.label}</p>
                            {number && (
                              <p className="truncate text-xs text-muted-foreground">{number}</p>
                            )}
                          </div>
                        </div>
                        {!url && <DocStatusIcon status={dbStatus} />}
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        {!url && <StatusBadge status={dbStatus} />}
                        {locked && (
                          <Badge variant="secondary" className="gap-1 rounded-md text-[10px]">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                        {reviewable && !isVerified && isViewed && (
                          <Badge className="rounded-md bg-primary/10 text-[10px] text-primary">
                            Reviewed
                          </Badge>
                        )}
                        {reviewable && !isVerified && !isViewed && (
                          <Badge variant="outline" className="rounded-md text-[10px] text-amber-600">
                            Not reviewed
                          </Badge>
                        )}
                      </div>

                      {savedNote && !draftItem && (
                        <p className="mb-3 rounded-xl bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                          Last note: {savedNote}
                        </p>
                      )}

                      {draftItem?.message && (
                        <p className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-2.5 py-2 text-xs">
                          {draftItem.message}
                        </p>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant={isViewed ? "secondary" : "default"}
                        className="mb-3 h-9 w-full rounded-xl text-xs"
                        onClick={() =>
                          handleViewDocument(doc.type, doc.label, url, number)
                        }
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {isViewed ? "View Again" : "Open & Review"}
                      </Button>

                      {reviewable && !isVerified && (
                        <div className="mt-auto space-y-2">
                          {!isViewed && (
                            <p className="text-center text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
                              Open the document first — then Accept or Reject
                            </p>
                          )}
                          <div className="flex gap-2">
                            <DecisionCheckbox
                              label="Accept"
                              variant="accept"
                              checked={isAccepted}
                              disabled={!canDecide || isPending}
                              onCheckedChange={(checked) => handleAcceptChange(doc.type, checked)}
                            />
                            <DecisionCheckbox
                              label="Reject"
                              variant="reject"
                              checked={isRejected}
                              disabled={!canDecide || isPending}
                              onCheckedChange={(checked) => handleRejectChange(doc.type, checked)}
                            />
                          </div>
                        </div>
                      )}

                      {locked && (
                        <div className="mt-auto flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Verified & locked
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {reviewableDocs.length > 0 && !isVerified && (
              <div className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/8 to-primary/[0.02] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold">Submit verification report</p>
                    </div>
                    <p className="max-w-xl text-xs text-muted-foreground">
                      Step 1: Open each document in the viewer. Step 2: Accept or Reject with a
                      reason. Step 3: Submit — nothing is saved until you click Submit.
                    </p>
                    {reviewedCount > 0 && (
                      <p className="text-xs font-medium text-primary">
                        Draft: {draftSummary.approved} accepted · {draftSummary.rejected} rejected
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(reviewedCount > 0 || viewedCount > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl"
                        onClick={clearDraft}
                        disabled={isPending}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 rounded-xl px-6"
                      disabled={!canSubmit || isPending}
                      onClick={handleSubmit}
                    >
                      <Send className="h-4 w-4" />
                      {isPending ? "Submitting…" : "Submit Review"}
                    </Button>
                  </div>
                </div>
                {!canSubmit && (
                  <p className="mt-3 rounded-xl bg-background/60 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    {!allViewed
                      ? `Review all ${reviewableDocs.length} pending document${reviewableDocs.length !== 1 ? "s" : ""} in the viewer first.`
                      : `Accept or reject all ${reviewableDocs.length} pending document${reviewableDocs.length !== 1 ? "s" : ""} to enable submit.`}
                  </p>
                )}
              </div>
            )}

            {isVerified && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                All documents verified. Provider can receive bookings.
              </div>
            )}
          </>
        )}

        {provider.messages.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              Messages sent to provider
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {provider.messages.slice(0, 4).map((msg) => (
                <li
                  key={msg.id}
                  className="rounded-xl border border-border/40 bg-background/80 px-3 py-2.5 text-sm"
                >
                  <p className="mb-0.5 text-[10px] text-muted-foreground">
                    {formatDate(msg.createdAt)}
                  </p>
                  <p className="line-clamp-2 text-xs leading-relaxed">{msg.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <RejectionMessageDialog
        open={!!rejectDialog}
        onOpenChange={(open) => !open && setRejectDialog(null)}
        documentType={rejectDialog}
        onConfirm={(message) => {
          if (rejectDialog) markRejected(rejectDialog, message);
        }}
        loading={isPending}
      />
    </Card>
  );
}
