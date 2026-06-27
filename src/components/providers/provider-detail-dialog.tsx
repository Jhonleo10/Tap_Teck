"use client";

import { Briefcase, MapPin, Star } from "lucide-react";
import { DetailModal, DetailGrid, DetailItem } from "@/components/shared/detail-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, shortId } from "@/lib/utils";
import { VERIFICATION_DOCUMENTS } from "@/lib/verification-documents";
import type { ProviderDetail } from "@/actions/providers";
import { ProviderOperationsPanel } from "@/components/operations/provider-operations-panel";

interface ProviderDetailDialogProps {
  provider: ProviderDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel?: string;
}

export function ProviderDetailDialog({
  provider,
  open,
  onOpenChange,
  categoryLabel,
}: ProviderDetailDialogProps) {
  if (!provider) return null;

  const overview = (
    <DetailGrid>
      <DetailItem label="Provider ID" value={<code className="text-xs">{shortId(provider.id)}</code>} />
      <DetailItem label="Status" value={<StatusBadge status={provider.status} />} />
      <DetailItem label="Contact" value={provider.user.name ?? "—"} />
      <DetailItem label="Verification" value={<StatusBadge status={provider.verificationStatus} />} />
      <DetailItem label="Email" value={provider.user.email} />
      <DetailItem label="Phone" value={provider.user.phone ?? "—"} />
      <DetailItem label="Category" value={categoryLabel ?? provider.serviceCategory} />
      <DetailItem label="Service" value={provider.primaryService ?? "—"} />
      <DetailItem
        label="Location"
        value={
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {provider.location}
            {provider.city ? `, ${provider.city}` : ""}
          </span>
        }
        className="col-span-2"
      />
      <DetailItem label="Country" value={provider.country} />
      <DetailItem label="Joined" value={formatDate(provider.createdAt)} />
    </DetailGrid>
  );

  const stats = (
    <DetailGrid>
      <DetailItem
        label="Rating"
        value={
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {provider.rating.toFixed(1)} ({provider.totalReviews} reviews)
          </span>
        }
      />
      <DetailItem label="Bookings" value={provider._count.bookings} />
      <DetailItem label="Completed Jobs" value={provider.completedJobs} />
      <DetailItem
        label="Can Receive Bookings"
        value={provider.canReceiveBookings ? "Yes" : "No"}
      />
      {provider.description && (
        <DetailItem
          label="Description"
          value={provider.description}
          className="col-span-2"
        />
      )}
    </DetailGrid>
  );

  const documents = provider.verification ? (
    <div className="grid grid-cols-2 gap-2">
      {VERIFICATION_DOCUMENTS.map((doc) => (
        <div
          key={doc.type}
          className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2.5"
        >
          <span className="text-sm font-medium">{doc.label}</span>
          <StatusBadge status={provider.verification![doc.statusField]} />
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">No verification documents on file.</p>
  );

  return (
    <DetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={provider.businessName}
      subtitle={provider.user.email}
      icon={<Briefcase className="h-6 w-6" />}
      badge={<StatusBadge status={provider.verificationStatus} />}
      tabs={[
        { id: "overview", label: "Overview", content: overview },
        { id: "operations", label: "Operations", content: <ProviderOperationsPanel providerId={provider.id} /> },
        { id: "stats", label: "Performance", content: stats },
        { id: "docs", label: "Documents", content: documents },
      ]}
    />
  );
}
