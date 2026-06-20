"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DocStatus } from "@prisma/client";
import type { DocumentType } from "@/lib/verification-documents";
import { getDocumentDefinition } from "@/lib/verification-documents";
import { buildAutomatedMessage } from "@/lib/verification-messages";

export type DocumentAction = Extract<
  DocStatus,
  "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED"
>;

interface DocumentActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  action: DocumentAction | null;
  onConfirm: (note?: string) => Promise<void>;
  loading?: boolean;
}

export function DocumentActionDialog({
  open,
  onOpenChange,
  documentType,
  action,
  onConfirm,
  loading,
}: DocumentActionDialogProps) {
  const [note, setNote] = useState("");

  const handleConfirm = async () => {
    await onConfirm(note.trim() || undefined);
    setNote("");
    onOpenChange(false);
  };

  const label = documentType ? getDocumentDefinition(documentType).label : "Document";
  const actionLabel =
    action === "APPROVED"
      ? "Approve"
      : action === "REJECTED"
        ? "Reject"
        : "Request Re-upload";

  const preview =
    documentType && action
      ? buildAutomatedMessage(
        action === "APPROVED"
          ? "DOC_APPROVED"
          : action === "REJECTED"
            ? "DOC_REJECTED"
            : "DOC_REUPLOAD_REQUESTED",
        documentType,
        note
      ).body
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actionLabel} {label}
          </DialogTitle>
          <DialogDescription>
            {action === "REUPLOAD_REQUESTED"
              ? "The provider will be notified and can re-upload this document only after your request."
              : action === "REJECTED"
                ? "Optionally add a note — an automated message will be sent to the provider."
                : "Confirm approval of this document."}
          </DialogDescription>
        </DialogHeader>

        {action !== "APPROVED" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="doc-note">Message to provider (optional)</Label>
              <Textarea
                id="doc-note"
                placeholder="Add specific instructions for the provider..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7 rounded-lg bg-muted/60 hover:bg-muted"
                onClick={() => setNote("The uploaded image is blurry or unclear. Please re-upload a clearer picture where all details are visible.")}
                type="button"
              >
                Unclear Image
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7 rounded-lg bg-muted/60 hover:bg-muted"
                onClick={() => setNote("The document appears to be expired. Please upload a current, valid document.")}
                type="button"
              >
                Expired Document
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7 rounded-lg bg-muted/60 hover:bg-muted"
                onClick={() => setNote("The uploaded document is missing required information or pages.")}
                type="button"
              >
                Missing Details
              </Button>
            </div>
          </div>
        )}

        {preview && action !== "APPROVED" && (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Automated message preview</p>
            <p className="text-sm leading-relaxed">{preview}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={action === "REJECTED" ? "destructive" : "default"}
          >
            {loading ? "Saving…" : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
