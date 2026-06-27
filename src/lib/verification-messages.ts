import type { DocumentType } from "@/lib/verification-documents";
import { getDocumentDefinition } from "@/lib/verification-documents";

export type VerificationMessageAction =
  | "DOC_APPROVED"
  | "DOC_REJECTED"
  | "DOC_REUPLOAD_REQUESTED"
  | "PROVIDER_UNDER_REVIEW"
  | "PROVIDER_VERIFIED"
  | "PROVIDER_REJECTED"
  | "REVIEW_SUBMITTED";

export function buildAutomatedMessage(
  action: VerificationMessageAction,
  documentType?: DocumentType,
  customNote?: string
): { title: string; body: string } {
  const docLabel = documentType
    ? getDocumentDefinition(documentType).label
    : "document";

  switch (action) {
    case "DOC_APPROVED":
      return {
        title: `${docLabel} Approved`,
        body: `Your ${docLabel} has been verified and approved by the TapTeck team. No further action is required for this document.`,
      };
    case "DOC_REJECTED":
      return {
        title: `${docLabel} Rejected`,
        body:
          customNote?.trim() ||
          `Your ${docLabel} did not meet TapTeck verification standards. Our team will contact you with next steps.`,
      };
    case "DOC_REUPLOAD_REQUESTED":
      return {
        title: `Re-upload Required: ${docLabel}`,
        body:
          customNote?.trim() ||
          `Your ${docLabel} needs to be re-uploaded. Please open the TapTeck app, go to Verification, and submit a clearer or updated ${docLabel}. You can only re-upload after we request it.`,
      };
    case "PROVIDER_UNDER_REVIEW":
      return {
        title: "Verification Under Review",
        body: "Your provider application is now under review. We will notify you once all documents are processed.",
      };
    case "PROVIDER_VERIFIED":
      return {
        title: "Account Verified",
        body: "Congratulations! Your TapTeck provider account is fully verified. You can now receive bookings and appear in customer search.",
      };
    case "PROVIDER_REJECTED":
      return {
        title: "Verification Declined",
        body:
          customNote?.trim() ||
          "Your provider verification was declined. Please review the messages for each document and re-submit where requested.",
      };
    case "REVIEW_SUBMITTED": {
      const rejectedNote = customNote?.trim();
      return {
        title: "Verification Review Complete",
        body:
          rejectedNote ||
          "Your documents have been reviewed. Check the TapTeck app for any items that need re-upload.",
      };
    }
    default:
      return { title: "Verification Update", body: "Your verification status has been updated." };
  }
}
