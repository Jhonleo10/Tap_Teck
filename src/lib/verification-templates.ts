import type { DocumentType } from "@/lib/verification-documents";

/** Generic quick messages (fallback) */
export const REJECTION_MESSAGE_TEMPLATES = [
  "The image is blurry or unreadable. Please upload a clear, well-lit photo.",
  "The document appears expired. Please upload a valid, current document.",
  "The name on the document does not match your profile.",
  "Wrong document type uploaded. Please upload the correct document.",
  "The document is partially cropped. Please upload the full page.",
  "Document details are not visible. Ensure all corners and text are in frame.",
  "Photo has glare or shadows. Retake in even lighting without flash.",
] as const;

export type RejectionTemplate = (typeof REJECTION_MESSAGE_TEMPLATES)[number];

/** Document-specific rejection / re-upload templates */
export const REJECTION_TEMPLATES_BY_DOCUMENT: Record<DocumentType, string[]> = {
  aadhaar: [
    "Aadhaar image is blurry. Upload a clear photo showing all 12 digits and your name.",
    "Aadhaar number is not fully visible. Ensure the full card is in frame.",
    "Name on Aadhaar does not match your registered business profile.",
    "Masked Aadhaar is not accepted. Upload the full Aadhaar card image.",
    "Aadhaar appears expired or invalid. Upload a current valid card.",
  ],
  pan: [
    "PAN card image is unreadable. Upload a sharp, well-lit photo.",
    "PAN number does not match the name on your profile.",
    "Wrong document uploaded. Please upload your PAN card, not another ID.",
    "PAN card is partially cropped. Upload the complete card.",
    "Signature on PAN is not visible. Retake ensuring the full card is shown.",
  ],
  certificate: [
    "Trade license / certificate has expired. Upload a current valid certificate.",
    "Certificate issuer name is not visible. Upload a clearer copy.",
    "Service category on certificate does not match your registered services.",
    "Certificate is not in English or a supported language. Upload a translated copy.",
    "Stamp or official seal is missing. Upload the original certified document.",
  ],
  address: [
    "Address proof is older than 3 months. Upload a recent utility bill or bank statement.",
    "Address on proof does not match your registered business location.",
    "Document does not show your full name and address clearly.",
    "Screenshot of address is not accepted. Upload an official document PDF or photo.",
    "Address proof is partially cropped. Upload the full page.",
  ],
  profile: [
    "Profile photo does not show your face clearly. Upload a front-facing, well-lit photo.",
    "Photo includes sunglasses or a mask. Upload a clear unobstructed face photo.",
    "Group photo uploaded. Please upload a solo professional headshot.",
    "Photo is too dark or overexposed. Retake in even natural lighting.",
    "Photo does not meet professional standards. Use a plain background headshot.",
  ],
};

export const CUSTOM_TEMPLATE_VALUE = "__custom__";

export function getRejectionTemplatesForDocument(
  documentType: DocumentType | null
): string[] {
  if (!documentType) return [...REJECTION_MESSAGE_TEMPLATES];
  return REJECTION_TEMPLATES_BY_DOCUMENT[documentType];
}
