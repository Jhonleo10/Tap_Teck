"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchBookingOperations } from "@/actions/operations";
import { DetailGrid, DetailItem } from "@/components/shared/detail-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";
import { BookingTimeline } from "@/components/operations/booking-timeline";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BookingOperationsDetail } from "@/services/booking-operations.service";

interface BookingOperationsDrawerProps {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingOperationsDrawer({
  bookingId,
  open,
  onOpenChange,
}: BookingOperationsDrawerProps) {
  const [detail, setDetail] = useState<BookingOperationsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    if (!bookingId) return;
    startTransition(async () => {
      const result = await fetchBookingOperations(bookingId);
      if (result.success && result.data) {
        setDetail(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load booking");
      }
    });
  };

  useEffect(() => {
    if (open && bookingId) load();
  }, [open, bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detail?.bookingNumber ?? "Booking Operations"}
            {detail && <StatusBadge status={detail.status} />}
          </DialogTitle>
        </DialogHeader>

        {isPending && !detail ? (
          <LoadingSpinner className="py-12" text="Loading booking timeline..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={load} />
        ) : detail ? (
          <div className="space-y-6">
            <BookingTimeline steps={detail.timeline} />

            <DetailGrid>
              <DetailItem
                label="Customer"
                value={detail.customer.name ?? detail.customer.email}
              />
              <DetailItem label="Provider" value={detail.provider.businessName} />
              <DetailItem label="Service" value={detail.service.name} />
              <DetailItem
                label="Sub Service"
                value={detail.service.subService ?? "—"}
              />
              <DetailItem label="Category" value={detail.service.category} />
              <DetailItem label="Location" value={detail.location} />
              <DetailItem label="Amount" value={formatCurrency(detail.financials.amount)} />
              <DetailItem
                label="Commission"
                value={formatCurrency(detail.financials.commission)}
              />
              <DetailItem
                label="Provider Earnings"
                value={formatCurrency(detail.financials.providerEarnings)}
              />
              <DetailItem label="Payment" value={detail.financials.paymentStatus} />
              <DetailItem label="Source" value={detail.source.replace(/_/g, " ")} />
              <DetailItem label="Priority" value={detail.priority} />
              <DetailItem label="Created" value={formatDate(detail.createdAt)} />
              {detail.completedAt && (
                <DetailItem label="Completed" value={formatDate(detail.completedAt)} />
              )}
              {detail.review && (
                <DetailItem
                  label="Review"
                  value={`${detail.review.rating}★ — ${detail.review.comment ?? "No comment"}`}
                  className="col-span-2"
                />
              )}
            </DetailGrid>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
