"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateDocumentStatus,
  updateVerificationStatus,
} from "@/actions/providers";
import { formatDate } from "@/lib/utils";
import type { DocStatus, VerificationStatus } from "@prisma/client";

type VerificationDoc = {
  aadhaarStatus: DocStatus;
  panStatus: DocStatus;
  certificateStatus: DocStatus;
  addressStatus: DocStatus;
  profileStatus: DocStatus;
  aadhaarNumber: string | null;
  panNumber: string | null;
  rejectionReason: string | null;
};

type ProviderVerification = {
  id: string;
  businessName: string;
  verificationStatus: VerificationStatus;
  user: { name: string | null; email: string };
  verification: VerificationDoc | null;
  createdAt: Date;
};

const DOC_FIELDS = [
  { key: "aadhaarStatus" as const, label: "Aadhaar", numberKey: "aadhaarNumber" as const },
  { key: "panStatus" as const, label: "PAN", numberKey: "panNumber" as const },
  { key: "certificateStatus" as const, label: "Certificates", numberKey: null },
  { key: "addressStatus" as const, label: "Address Proof", numberKey: null },
  { key: "profileStatus" as const, label: "Profile Info", numberKey: null },
];

function DocStatusIcon({ status }: { status: DocStatus }) {
  if (status === "APPROVED") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

export function VerificationContent({
  providers,
}: {
  providers: ProviderVerification[];
}) {
  const [data, setData] = useState(providers);

  const filterBy = (status: VerificationStatus | "ALL") =>
    status === "ALL" ? data : data.filter((p) => p.verificationStatus === status);

  const handleDocStatus = async (
    providerId: string,
    field: typeof DOC_FIELDS[number]["key"],
    status: DocStatus
  ) => {
    await updateDocumentStatus(providerId, field, status);
    setData((prev) =>
      prev.map((p) =>
        p.id === providerId && p.verification
          ? { ...p, verification: { ...p.verification, [field]: status } }
          : p
      )
    );
    toast.success(`${field.replace("Status", "")} ${status.toLowerCase()}`);
  };

  const handleVerify = async (providerId: string, status: VerificationStatus) => {
    await updateVerificationStatus(providerId, status);
    setData((prev) =>
      prev.map((p) =>
        p.id === providerId ? { ...p, verificationStatus: status } : p
      )
    );
    toast.success(`Provider marked as ${status.replace("_", " ").toLowerCase()}`);
  };

  const renderProviderCard = (provider: ProviderVerification) => (
    <Card key={provider.id} className="overflow-hidden border-border/60">
      <CardHeader className="flex flex-row items-start justify-between bg-muted/20">
        <div>
          <CardTitle className="text-lg">{provider.businessName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {provider.user.name} · {provider.user.email}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Applied {formatDate(provider.createdAt)}
          </p>
        </div>
        <StatusBadge status={provider.verificationStatus} />
      </CardHeader>
      <CardContent className="space-y-4">
        {provider.verification ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOC_FIELDS.map((doc) => {
              const status = provider.verification![doc.key];
              return (
                <div
                  key={doc.key}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.label}</p>
                      {doc.numberKey && provider.verification![doc.numberKey] && (
                        <p className="text-xs text-muted-foreground">
                          {provider.verification![doc.numberKey]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DocStatusIcon status={status} />
                    {status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-emerald-600"
                          onClick={() => handleDocStatus(provider.id, doc.key, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-red-600"
                          onClick={() => handleDocStatus(provider.id, doc.key, "REJECTED")}
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
          <p className="text-sm text-muted-foreground">No verification documents submitted</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVerify(provider.id, "UNDER_REVIEW")}
            disabled={provider.verificationStatus === "UNDER_REVIEW"}
          >
            Under Review
          </Button>
          <Button
            size="sm"
            onClick={() => handleVerify(provider.id, "VERIFIED")}
            disabled={provider.verificationStatus === "VERIFIED"}
          >
            Verify Provider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleVerify(provider.id, "REJECTED")}
            disabled={provider.verificationStatus === "REJECTED"}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Center"
        description="Review KYC documents and approve providers before they receive bookings"
        badge="Compliance"
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterBy("PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="review">
            Under Review ({filterBy("UNDER_REVIEW").length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({filterBy("VERIFIED").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({filterBy("REJECTED").length})
          </TabsTrigger>
        </TabsList>

        {(["all", "pending", "review", "verified", "rejected"] as const).map((tab) => {
          const statusMap = {
            all: "ALL" as const,
            pending: "PENDING" as const,
            review: "UNDER_REVIEW" as const,
            verified: "VERIFIED" as const,
            rejected: "REJECTED" as const,
          };
          const filtered = filterBy(statusMap[tab]);
          return (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {filtered.length > 0 ? (
                filtered.map(renderProviderCard)
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  No providers in this category
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
