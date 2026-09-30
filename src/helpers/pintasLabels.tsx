import type {
  AiResult,
  CampaignPlatform,
  CampaignStatus,
  ClaimStatus,
  DisputeStatus,
  SocialPlatform,
  SubmissionStatus,
  UserRole,
} from "./schema";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "error" | "primary";

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Terkirim",
  ai_verifying: "AI Memverifikasi",
  ai_passed: "AI Passed",
  ai_failed: "AI Failed",
  need_admin_review: "Perlu Review Admin",
  admin_approved: "Disetujui Admin",
  admin_rejected: "Ditolak Admin",
  disputed: "Sanggahan Diajukan",
  claimable: "Siap Claim",
  claimed: "Claim Diajukan",
  paid: "Dibayar",
};

export const submissionStatusTone: Record<SubmissionStatus, StatusTone> = {
  draft: "neutral",
  submitted: "info",
  ai_verifying: "info",
  ai_passed: "success",
  ai_failed: "error",
  need_admin_review: "warning",
  admin_approved: "success",
  admin_rejected: "error",
  disputed: "warning",
  claimable: "primary",
  claimed: "warning",
  paid: "success",
};

export const submissionStatusHint: Record<SubmissionStatus, string> = {
  draft: "Belum dikirim. Lengkapi bukti lalu kirim untuk diverifikasi.",
  submitted: "Submission diterima dan menunggu verifikasi AI.",
  ai_verifying: "AI sedang memeriksa requirement campaign.",
  ai_passed: "Lolos pemeriksaan AI. Menunggu konfirmasi akhir Admin.",
  ai_failed: "Tidak lolos pemeriksaan AI. Kamu dapat mengajukan sanggahan.",
  need_admin_review: "AI menandai perlu pemeriksaan manual oleh Admin.",
  admin_approved: "Admin menyetujui submission ini.",
  admin_rejected: "Admin menolak submission ini. Keputusan bersifat final.",
  disputed: "Sanggahan sedang diperiksa Admin.",
  claimable: "Disetujui Admin. Ajukan claim untuk menerima pembayaran.",
  claimed: "Claim diterima. Menunggu konfirmasi pembayaran dari Admin.",
  paid: "Pembayaran telah dikonfirmasi Admin.",
};

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  expired: "Berakhir",
};

export const campaignStatusTone: Record<CampaignStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  completed: "primary",
  expired: "warning",
};

export const claimStatusLabel: Record<ClaimStatus, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Dibayar",
  rejected: "Ditolak",
};

export const claimStatusTone: Record<ClaimStatus, StatusTone> = {
  pending: "warning",
  paid: "success",
  rejected: "error",
};

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  pending: "Menunggu Admin",
  accepted: "Diterima",
  rejected: "Ditolak",
};

export const disputeStatusTone: Record<DisputeStatus, StatusTone> = {
  pending: "warning",
  accepted: "success",
  rejected: "error",
};

export const aiResultLabel: Record<AiResult, string> = {
  pass: "PASS",
  fail: "FAIL",
  need_review: "NEED REVIEW",
};

export const aiResultTone: Record<AiResult, StatusTone> = {
  pass: "success",
  fail: "error",
  need_review: "warning",
};

export const platformLabel: Record<CampaignPlatform | SocialPlatform, string> = {
  any: "Semua platform",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
};

export const roleLabel: Record<UserRole, string> = {
  owner: "Owner",
  creator: "Creator",
  admin: "Admin",
};

export const campaignCode = (id: number): string => `CMP-${String(id).padStart(4, "0")}`;
export const submissionCode = (sequenceNo: number): string => `#${String(sequenceNo).padStart(3, "0")}`;
export const claimCode = (id: number): string => `CLM-${String(id).padStart(4, "0")}`;

/** Statuses that count as "pending" for dashboards (belum ada keputusan final). */
export const pendingSubmissionStatuses: SubmissionStatus[] = [
  "submitted",
  "ai_verifying",
  "ai_passed",
  "ai_failed",
  "need_admin_review",
  "disputed",
];

export const approvedSubmissionStatuses: SubmissionStatus[] = [
  "admin_approved",
  "claimable",
  "claimed",
  "paid",
];

export const rejectedSubmissionStatuses: SubmissionStatus[] = ["admin_rejected"];

/** Statuses where an Admin decision (approve/reject) is allowed. */
export const adminDecidableStatuses: SubmissionStatus[] = [
  "ai_passed",
  "ai_failed",
  "need_admin_review",
  "disputed",
];