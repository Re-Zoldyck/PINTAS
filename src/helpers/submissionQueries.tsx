import { Kysely, Transaction } from "kysely";
import { DB } from "./schema";
import { SubmissionSummary } from "./pintasTypes";
import { submissionCode } from "./pintasLabels";
import { num } from "./apiUtils";

type Db = Kysely<DB> | Transaction<DB>;

export function submissionBaseQuery(dbx: Db) {
  return dbx
    .selectFrom("submissions")
    .innerJoin("campaigns", "campaigns.id", "submissions.campaignId")
    .innerJoin("users as creator", "creator.id", "submissions.creatorId")
    .select([
      "submissions.id",
      "submissions.campaignId",
      "campaigns.name as campaignName",
      "campaigns.ownerId as campaignOwnerId",
      "submissions.creatorId",
      "creator.displayName as creatorName",
      "submissions.sequenceNo",
      "submissions.title",
      "submissions.contentUrl",
      "submissions.platform",
      "submissions.accountHandle",
      "submissions.viewsClaimed",
      "submissions.verifiedViews",
      "submissions.status",
      "submissions.aiResult",
      "submissions.calculatedAmount",
      "submissions.approvedAmount",
      "submissions.proofScreenshotFilename",
      "submissions.submittedAt",
      "submissions.createdAt",
      "submissions.updatedAt",
    ]);
}

export type SubmissionRow = Awaited<ReturnType<ReturnType<typeof submissionBaseQuery>["execute"]>>[number];

export function toSubmissionSummary(row: SubmissionRow): SubmissionSummary {
  return {
    id: row.id,
    code: submissionCode(row.sequenceNo),
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    campaignOwnerId: row.campaignOwnerId,
    creatorId: row.creatorId,
    creatorName: row.creatorName,
    sequenceNo: row.sequenceNo,
    title: row.title,
    contentUrl: row.contentUrl,
    platform: row.platform,
    accountHandle: row.accountHandle,
    viewsClaimed: row.viewsClaimed,
    verifiedViews: row.verifiedViews,
    status: row.status,
    aiResult: row.aiResult,
    calculatedAmount: row.calculatedAmount === null ? null : num(row.calculatedAmount),
    approvedAmount: row.approvedAmount === null ? null : num(row.approvedAmount),
    hasProof: !!row.proofScreenshotFilename,
    submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}