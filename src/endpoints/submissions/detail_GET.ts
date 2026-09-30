import { db } from "../../helpers/db";
import { schema, OutputType } from "./detail_GET.schema";
import { ApiError, handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";
import { submissionBaseQuery, toSubmissionSummary } from "../../helpers/submissionQueries";
import { campaignBaseQuery, toCampaignSummary } from "../../helpers/campaignQueries";
import { privateFileUrl } from "../../helpers/storageUrls";
import { calculatePayout } from "../../helpers/payout";
import { claimCode, submissionCode } from "../../helpers/pintasLabels";
import type { AiCheck, AuditEntry, ClaimInfo, DisputeInfo } from "../../helpers/pintasTypes";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema.parse({ id: Number(url.searchParams.get("id")) });

    const row = await submissionBaseQuery(db).where("submissions.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Submission tidak ditemukan", 404);

    const isCreatorOwner = user.role === "creator" && row.creatorId === user.id;
    const isCampaignOwner = user.role === "owner" && row.campaignOwnerId === user.id;
    const isAdmin = user.role === "admin";
    if (!isCreatorOwner && !isCampaignOwner && !isAdmin) {
      throw new ApiError("Anda tidak memiliki akses ke submission ini", 403);
    }
    if (!isCreatorOwner && row.status === "draft") {
      throw new ApiError("Submission masih berupa draft", 404);
    }

    const full = await db
      .selectFrom("submissions")
      .leftJoin("users as admin", "admin.id", "submissions.adminId")
      .select([
        "submissions.caption",
        "submissions.hashtags",
        "submissions.watermarkApplied",
        "submissions.editingConfirmed",
        "submissions.creatorNotes",
        "submissions.aiChecks",
        "submissions.aiSummary",
        "submissions.aiVerifiedAt",
        "submissions.adminNote",
        "submissions.adminDecidedAt",
        "submissions.proofScreenshotFilename",
        "admin.displayName as adminName",
      ])
      .where("submissions.id", "=", input.id)
      .executeTakeFirstOrThrow();

    const campaignRow = await campaignBaseQuery(db).where("campaigns.id", "=", row.campaignId).executeTakeFirstOrThrow();
    const campaign = toCampaignSummary(campaignRow);

    const disputeRow = await db
      .selectFrom("disputes")
      .leftJoin("users as admin", "admin.id", "disputes.adminId")
      .select([
        "disputes.id",
        "disputes.submissionId",
        "disputes.creatorId",
        "disputes.reason",
        "disputes.evidenceFilename",
        "disputes.status",
        "disputes.adminNote",
        "admin.displayName as adminName",
        "disputes.createdAt",
        "disputes.resolvedAt",
      ])
      .where("disputes.submissionId", "=", input.id)
      .orderBy("disputes.createdAt", "desc")
      .executeTakeFirst();

    const claimRow = await db
      .selectFrom("claims")
      .leftJoin("users as admin", "admin.id", "claims.adminId")
      .selectAll("claims")
      .select("admin.displayName as adminName")
      .where("claims.submissionId", "=", input.id)
      .orderBy("claims.createdAt", "desc")
      .executeTakeFirst();

    const logs = await db
      .selectFrom("auditLogs")
      .leftJoin("users as actor", "actor.id", "auditLogs.actorId")
      .select([
        "auditLogs.id",
        "auditLogs.actorId",
        "actor.displayName as actorName",
        "auditLogs.actorRole",
        "auditLogs.entityType",
        "auditLogs.entityId",
        "auditLogs.action",
        "auditLogs.fromStatus",
        "auditLogs.toStatus",
        "auditLogs.detail",
        "auditLogs.createdAt",
      ])
      .where("auditLogs.entityType", "=", "submission")
      .where("auditLogs.entityId", "=", input.id)
      .orderBy("auditLogs.createdAt", "asc")
      .execute();

    const dispute: DisputeInfo | null = disputeRow
      ? {
          id: disputeRow.id,
          submissionId: disputeRow.submissionId,
          creatorId: disputeRow.creatorId,
          reason: disputeRow.reason,
          evidenceUrl: await privateFileUrl(disputeRow.evidenceFilename),
          status: disputeRow.status,
          adminNote: disputeRow.adminNote,
          adminName: disputeRow.adminName ?? null,
          createdAt: new Date(disputeRow.createdAt),
          resolvedAt: disputeRow.resolvedAt ? new Date(disputeRow.resolvedAt) : null,
        }
      : null;

    const claim: ClaimInfo | null = claimRow
      ? {
          id: claimRow.id,
          code: claimCode(claimRow.id),
          submissionId: claimRow.submissionId,
          submissionCode: submissionCode(row.sequenceNo),
          submissionTitle: row.title,
          campaignId: claimRow.campaignId,
          campaignName: row.campaignName,
          creatorId: claimRow.creatorId,
          creatorName: row.creatorName,
          amount: num(claimRow.amount),
          status: claimRow.status,
          adminNote: claimRow.adminNote,
          adminName: claimRow.adminName ?? null,
          paymentReference: claimRow.paymentReference,
          paidAt: claimRow.paidAt ? new Date(claimRow.paidAt) : null,
          createdAt: new Date(claimRow.createdAt),
          personal:
            isAdmin || isCreatorOwner
              ? {
                  realName: claimRow.realName,
                  phone: claimRow.phone,
                  bankName: claimRow.bankName,
                  bankAccountNumber: claimRow.bankAccountNumber,
                  bankAccountHolder: claimRow.bankAccountHolder,
                }
              : null,
        }
      : null;

    const history: AuditEntry[] = logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
    const summary = toSubmissionSummary(row);
    const estimatedPayout = calculatePayout(
      {
        ratePerThousandViews: campaign.ratePerThousandViews,
        feePerSubmission: campaign.feePerSubmission,
        maxPayoutPerSubmission: campaign.maxPayoutPerSubmission,
      },
      row.verifiedViews ?? row.viewsClaimed
    );

    return jsonResponse({
      submission: {
        ...summary,
        caption: full.caption,
        hashtags: full.hashtags ?? [],
        watermarkApplied: full.watermarkApplied,
        editingConfirmed: full.editingConfirmed,
        creatorNotes: full.creatorNotes,
        aiChecks: (full.aiChecks as AiCheck[] | null) ?? null,
        aiSummary: full.aiSummary,
        aiVerifiedAt: full.aiVerifiedAt ? new Date(full.aiVerifiedAt) : null,
        adminNote: full.adminNote,
        adminName: full.adminName ?? null,
        adminDecidedAt: full.adminDecidedAt ? new Date(full.adminDecidedAt) : null,
        proofScreenshotUrl: await privateFileUrl(full.proofScreenshotFilename),
        proofScreenshotFilename: full.proofScreenshotFilename,
        campaign,
        dispute,
        claim,
        history,
        estimatedPayout,
      },
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}