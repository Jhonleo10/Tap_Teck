import type { DocStatus } from "@prisma/client";

export type DocumentType =
  | "aadhaar"
  | "pan"
  | "certificate"
  | "address"
  | "profile";

export type DocumentStatusField =
  | "aadhaarStatus"
  | "panStatus"
  | "certificateStatus"
  | "addressStatus"
  | "profileStatus";

export interface DocumentDefinition {
  type: DocumentType;
  label: string;
  statusField: DocumentStatusField;
  urlField: keyof DocumentUrlFields | null;
  numberField: keyof DocumentNumberFields | null;
}

export interface DocumentUrlFields {
  aadhaarDocUrl: string | null;
  panDocUrl: string | null;
  certificateUrl: string | null;
  addressProofUrl: string | null;
  profilePhotoUrl: string | null;
}

export interface DocumentNumberFields {
  aadhaarNumber: string | null;
  panNumber: string | null;
}

export const VERIFICATION_DOCUMENTS: DocumentDefinition[] = [
  {
    type: "aadhaar",
    label: "Aadhaar",
    statusField: "aadhaarStatus",
    urlField: "aadhaarDocUrl",
    numberField: "aadhaarNumber",
  },
  {
    type: "pan",
    label: "PAN Card",
    statusField: "panStatus",
    urlField: "panDocUrl",
    numberField: "panNumber",
  },
  {
    type: "certificate",
    label: "Certificates",
    statusField: "certificateStatus",
    urlField: "certificateUrl",
    numberField: null,
  },
  {
    type: "address",
    label: "Address Proof",
    statusField: "addressStatus",
    urlField: "addressProofUrl",
    numberField: null,
  },
  {
    type: "profile",
    label: "Profile Photo",
    statusField: "profileStatus",
    urlField: "profilePhotoUrl",
    numberField: null,
  },
];

export function getDocumentDefinition(type: DocumentType): DocumentDefinition {
  const doc = VERIFICATION_DOCUMENTS.find((d) => d.type === type);
  if (!doc) throw new Error(`Unknown document type: ${type}`);
  return doc;
}

export function canAdminReviewDoc(status: DocStatus): boolean {
  return status === "PENDING" || status === "REUPLOAD_REQUESTED";
}

/** Approved documents are locked — provider cannot re-upload */
export function isDocLockedForProvider(status: DocStatus): boolean {
  return status === "APPROVED";
}

export function canProviderResubmit(status: DocStatus): boolean {
  return status === "REUPLOAD_REQUESTED";
}

export function allDocsApproved(
  verification: Record<DocumentStatusField, DocStatus> | null | undefined
): boolean {
  if (!verification) return false;
  return VERIFICATION_DOCUMENTS.every(
    (d) => verification[d.statusField] === "APPROVED"
  );
}
