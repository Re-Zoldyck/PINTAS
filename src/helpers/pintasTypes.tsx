import type {
  AiResult,
  CampaignPlatform,
  CampaignStatus,
  ClaimStatus,
  DisputeStatus,
  DuplicatePolicy,
  ParticipantStatus,
  SocialPlatform,
  SubmissionStatus,
} from "./schema";

export type AiCheckStatus = "pass" | "fail" | "review" | "skip";

export type AiCheck = {
  key: string;
  label: string;
  status: AiCheckStatus;
  detail: string;
};

export type CampaignSummary = {
  id: number;
  code: string;
  name: string;
  description: string;
  ownerId: number;
  ownerName: string;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  target: string;
  targetViews: number | null;
  requiredPlatform: CampaignPlatform;
  watermarkRequired: boolean;
  watermarkLogoUrl: string | null;
  minViews: number;
  duplicatePolicy: DuplicatePolicy;
  requiredCaption: string | null;
  requiredHashtags: string[];
  editingRequirement: string | null;
  ratePerThousandViews: number;
  feePerSubmission: number;
  maxPayoutPerSubmission: number;
  budgetTotal: number;
  budgetUsed: number;
  budgetReserved: number;
  participantCount: number;
  submissionCount: number;
  approvedCount: number;
  totalPaid: number;
  myParticipation: ParticipantStatus | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmissionSummary = {
  id: number;
  code: string;
  campaignId: number;
  campaignName: string;
  campaignOwnerId: number;
  creatorId: number;
  creatorName: string;
  sequenceNo: number;
  title: string;
  contentUrl: string;
  platform: SocialPlatform;
  accountHandle: string;
  viewsClaimed: number;
  verifiedViews: number | null;
  status: SubmissionStatus;
  aiResult: AiResult | null;
  calculatedAmount: number | null;
  approvedAmount: number | null;
  hasProof: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DisputeInfo = {
  id: number;
  submissionId: number;
  creatorId: number;
  reason: string;
  evidenceUrl: string | null;
  status: DisputeStatus;
  adminNote: string | null;
  adminName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

export type ClaimPersonalData = {
  realName: string;
  phone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

export type ClaimInfo = {
  id: number;
  code: string;
  submissionId: number;
  submissionCode: string;
  submissionTitle: string;
  campaignId: number;
  campaignName: string;
  creatorId: number;
  creatorName: string;
  amount: number;
  status: ClaimStatus;
  adminNote: string | null;
  adminName: string | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  /** Hanya diisi untuk Admin dan Creator pemilik claim. */
  personal: ClaimPersonalData | null;
};

export type AuditEntry = {
  id: number;
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  detail: unknown;
  createdAt: Date;
};

export type SubmissionDetail = SubmissionSummary & {
  caption: string;
  hashtags: string[];
  watermarkApplied: boolean;
  editingConfirmed: boolean;
  creatorNotes: string | null;
  aiChecks: AiCheck[] | null;
  aiSummary: string | null;
  aiVerifiedAt: Date | null;
  adminNote: string | null;
  adminName: string | null;
  adminDecidedAt: Date | null;
  proofScreenshotUrl: string | null;
  /** Storage key of the proof (opaque; needed to keep the file when editing a draft). */
  proofScreenshotFilename: string | null;
  campaign: CampaignSummary;
  dispute: DisputeInfo | null;
  claim: ClaimInfo | null;
  history: AuditEntry[];
  estimatedPayout: number;
};