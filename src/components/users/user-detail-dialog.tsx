"use client";

import { User } from "lucide-react";
import { DetailModal, DetailGrid, DetailItem } from "@/components/shared/detail-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, shortId } from "@/lib/utils";
import type { UserDetail } from "@/actions/users";

interface UserDetailDialogProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({ user, open, onOpenChange }: UserDetailDialogProps) {
  if (!user) return null;

  const overview = (
    <DetailGrid>
      <DetailItem label="User ID" value={<code className="text-xs">{shortId(user.id)}</code>} />
      <DetailItem label="Status" value={<StatusBadge status={user.status} />} />
      <DetailItem label="Email" value={user.email} />
      <DetailItem label="Phone" value={user.phone ?? "—"} />
      <DetailItem label="Email Verified" value={user.emailVerified ? "Yes" : "No"} />
      <DetailItem label="Referral Code" value={user.referralCode ?? "—"} />
      <DetailItem label="Referrals Made" value={user._count.referralsMade} />
      <DetailItem label="Joined" value={formatDate(user.createdAt)} />
    </DetailGrid>
  );

  const activity = (
    <DetailGrid>
      <DetailItem label="Total Bookings" value={user._count.bookings} />
      <DetailItem label="Total Reviews" value={user._count.reviews} />
    </DetailGrid>
  );

  const bookings =
    user.bookings.length > 0 ? (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {user.bookings.slice(0, 4).map((b) => (
          <div
            key={b.bookingNumber}
            className="rounded-xl border bg-muted/20 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{b.bookingNumber}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.serviceName}
            </p>
            <p className="text-xs font-medium">
              {formatCurrency(b.amount)} · {formatDate(b.createdAt)}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No bookings yet.</p>
    );

  return (
    <DetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={user.name ?? "User"}
      subtitle={user.email}
      icon={<User className="h-6 w-6" />}
      badge={<StatusBadge status={user.status} />}
      tabs={[
        { id: "overview", label: "Profile", content: overview },
        { id: "activity", label: "Activity", content: activity },
        { id: "bookings", label: "Bookings", content: bookings },
      ]}
    />
  );
}
