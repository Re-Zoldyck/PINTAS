import { Kysely, Transaction, sql } from "kysely";
import { DB, ParticipantStatus } from "./schema";
import { CampaignSummary } from "./pintasTypes";
import { campaignCode } from "./pintasLabels";
import { num } from "./apiUtils";
import { logAudit } from "./auditLog";

type Db = Kysely<DB> | Transaction<DB>;

/** Marks active campaigns whose period has ended as "expired" (lazy, idempotent). */
export async function expireCampaigns(dbx: Db): Promise<void> {
  const expired = await dbx
    .updateTable("campaigns")
    .set({ status: "expired", updatedAt: new Date() })
    .where("status", "=", "active")
    .where("endDate", "<", sql`CURRENT_DATE`)
    .returning("id")
    .execute();
  for (const row of expired) {
    await logAudit(dbx, {
      actorId: null,
      actorRole: "system",
      entityType: "campaign",
      entityId: row.id,
      action: "campaign_expired",
      fromStatus: "active",
      toStatus: "expired",
    });
  }
}

export function campaignBaseQuery(dbx: Db) {
  return dbx
    .selectFrom("campaigns")
    .innerJoin("users as owner", "owner.id", "campaigns.ownerId")
    .select((eb) => [
      "campaigns.id",
      "campaigns.name",
      "campaigns.description",
      "campaigns.ownerId",
      "owner.displayName as ownerName",
      "campaigns.status",
      "campaigns.startDate",
      "campaigns.endDate",
      "campaigns.target",
      "campaigns.targetViews",
      "campaigns.requiredPlatform",
      "campaigns.watermarkRequired",
      "campaigns.watermarkLogoUrl",
      "campaigns.minViews",
      "campaigns.duplicatePolicy",
      "campaigns.requiredCaption",
      "campaigns.requiredHashtags",
      "campaigns.editingRequirement",
      "campaigns.ratePerThousandViews",
      "campaigns.feePerSubmission",
      "campaigns.maxPayoutPerSubmission",
      "campaigns.budgetTotal",
      "campaigns.budgetUsed",
      "campaigns.budgetReserved",
      "campaigns.createdAt",
      "campaigns.updatedAt",
      eb
        .selectFrom("campaignParticipants")
        .select(eb.fn.countAll<number>().as("c"))
        .whereRef("campaignParticipants.campaignId", "=", "campaigns.id")
        .where("campaignParticipants.status", "=", "active")
        .as("participantCount"),
      eb
        .selectFrom("submissions")
        .select(eb.fn.countAll<number>().as("c"))
        .whereRef("submissions.campaignId", "=", "campaigns.id")
        .where("submissions.status", "<>", "draft")
        .as("submissionCount"),
      eb
        .selectFrom("submissions")
        .select(eb.fn.countAll<number>().as("c"))
        .whereRef("submissions.campaignId", "=", "campaigns.id")
        .where("submissions.status", "in", ["admin_approved", "claimable", "claimed", "paid"])
        .as("approvedCount"),
      eb
        .selectFrom("claims")
        .select((seb) => seb.fn.coalesce(seb.fn.sum<string>("claims.amount"), sql<string>`0`).as("s"))
        .whereRef("claims.campaignId", "=", "campaigns.id")
        .where("claims.status", "=", "paid")
        .as("totalPaid"),
    ]);
}

export type CampaignRow = Awaited<ReturnType<ReturnType<typeof campaignBaseQuery>["execute"]>>[number];

export function toCampaignSummary(
  row: CampaignRow,
  myParticipation: ParticipantStatus | null = null
): CampaignSummary {
  return {
    id: row.id,
    code: campaignCode(row.id),
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    status: row.status,
    startDate: new Date(row.startDate),
    endDate: new Date(row.endDate),
    target: row.target,
    targetViews: row.targetViews,
    requiredPlatform: row.requiredPlatform,
    watermarkRequired: row.watermarkRequired,
    watermarkLogoUrl: row.watermarkLogoUrl,
    minViews: row.minViews,
    duplicatePolicy: row.duplicatePolicy,
    requiredCaption: row.requiredCaption,
    requiredHashtags: row.requiredHashtags ?? [],
    editingRequirement: row.editingRequirement,
    ratePerThousandViews: num(row.ratePerThousandViews),
    feePerSubmission: num(row.feePerSubmission),
    maxPayoutPerSubmission: num(row.maxPayoutPerSubmission),
    budgetTotal: num(row.budgetTotal),
    budgetUsed: num(row.budgetUsed),
    budgetReserved: num(row.budgetReserved),
    participantCount: num(row.participantCount),
    submissionCount: num(row.submissionCount),
    approvedCount: num(row.approvedCount),
    totalPaid: num(row.totalPaid),
    myParticipation,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}