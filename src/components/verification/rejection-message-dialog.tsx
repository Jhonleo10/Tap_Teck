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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_TEMPLATE_VALUE,
  getRejectionTemplatesForDocument,
} from "@/lib/verification-templates";
import { getDocumentDefinition, type DocumentType } from "@/lib/verification-documents";

interface RejectionMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  onConfirm: (message: string) => void;
  loading?: boolean;
}

export function RejectionMessageDialog({
  open,
  onOpenChange,
  documentType,
  onConfirm,
  loading,
}: RejectionMessageDialogProps) {
  const [message, setMessage] = useState("");
  const [templateChoice, setTemplateChoice] = useState<string>("");

  const label = documentType ? getDocumentDefinition(documentType).label : "Document";
  const templates = getRejectionTemplatesForDocument(documentType);

  const reset = () => {
    setMessage("");
    setTemplateChoice("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTemplateChange = (value: string) => {
    setTemplateChoice(value);
    if (value === CUSTOM_TEMPLATE_VALUE) {
      setMessage("");
    } else {
      setMessage(value);
    }
  };

  const handleConfirm = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject {label}</DialogTitle>
          <DialogDescription>
            Choose a built-in message or write your own. Only this document will be sent back
            for re-upload — approved documents stay locked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-template">Rejection reason</Label>
            <Select value={templateChoice} onValueChange={handleTemplateChange}>
              <SelectTrigger id="reject-template" className="rounded-xl">
                <SelectValue placeholder="Select a built-in message or custom…" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {templates.map((template) => (
                  <SelectItem key={template} value={template} className="text-sm">
                    {template.length > 72 ? `${template.slice(0, 72)}…` : template}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_TEMPLATE_VALUE} className="font-medium text-primary">
                  Write custom message…
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(templateChoice === CUSTOM_TEMPLATE_VALUE || message) && (
            <div className="space-y-2">
              <Label htmlFor="reject-msg">
                {templateChoice === CUSTOM_TEMPLATE_VALUE
                  ? "Custom message to provider"
                  : "Edit message (optional)"}
              </Label>
              <Textarea
                id="reject-msg"
                placeholder={`Explain why ${label} was rejected and what the provider should upload…`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none rounded-xl"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !message.trim()}
          >
            {loading ? "Saving…" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
