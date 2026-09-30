import { sql } from "kysely";
import { db } from "../../helpers/db";
import { OutputType } from "./summary_GET.schema";
import { handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";
import { campaignBaseQuery, expireCampaigns, toCampaignSummary } from "../../helpers/campaignQueries";
import { submissionBaseQuery, toSubmissionSummary } from "../../helpers/submissionQueries";
import { claimCode, submissionCode } from "../../helpers/pintasLabels";
import type { ClaimInfo } from "../../helpers/pintasTypes";
import type { ParticipantStatus, SubmissionStatus } from "../../helpers/schema";

const PENDING: SubmissionStatus[] = ["submitted", "ai_verifying", "ai_passed", "ai_failed", "need_admin_review", "disputed"];
const APPROVED: SubmissionStatus[] = ["admin_approved", "claimable", "claimed", "paid"];

async function claimsFor(where: (q: ReturnType<typeof baseClaims>) => ReturnType<typeof baseClaims>, includePersonal: boolean, limit = 8): Promise<ClaimInfo[]> {
  const rows = await where(baseClaims()).orderBy("claims.createdAt", "desc").limit(limit).execute();
  return rows.map((r) => ({
    id: r.id,
    code: claimCode(r.id),
    submissionId: r.submissionId,
    submissionCode: submissionCode(r.sequenceNo),
    submissionTitle: r.submissionTitle,
    campaignId: r.campaignId,
    campaignName: r.campaignName,
    creatorId: r.creatorId,
    creatorName: r.creatorName,
    amount: num(r.amount),
    status: r.status,
    adminNote: r.adminNote,
    adminName: r.adminName ?? null,
    paymentReference: r.paymentReference,
    paidAt: r.paidAt ? new Date(r.paidAt) : null,
    createdAt: new Date(r.createdAt),
    personal: includePersonal
      ? { realName: r.realName, phone: r.phone, bankName: r.bankName, bankAccountNumber: r.bankAccountNumber, bankAccountHolder: r.bankAccountHolder }
      : null,
  }));
}

function baseClaims() {
  return db
    .selectFrom("claims")
    .innerJoin("submissions", "submissions.id", "claims.submissionId")
    .innerJoin("campaigns", "campaigns.id", "claims.campaignId")
    .innerJoin("users as creator", "creator.id", "claims.creatorId")
    .leftJoin("users as admin", "admin.id", "claims.adminId")
    .select([
      "claims.id",
      "claims.submissionId",
      "claims.campaignId",
      "claims.creatorId",
      "claims.amount",
      "claims.status",
      "claims.adminNote",
      "claims.paymentReference",
      "claims.paidAt",
      "claims.createdAt",
      "claims.realName",
      "claims.phone",
      "claims.bankName",
      "claims.bankAccountNumber",
      "claims.bankAccountHolder",
      "submissions.sequenceNo",
      "submissions.title as submissionTitle",
      "campaigns.name as campaignName",
      "creator.displayName as creatorName",
      "admin.displayName as adminName",
    ]);
}

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    await expireCampaigns(db);

    if (user.role === "owner") {
      const campaignRows = await campaignBaseQuery(db)
        .where("campaigns.ownerId", "=", user.id)
        .orderBy("campaigns.createdAt", "desc")
        .execute();
      const campaigns = campaignRows.map((r) => toCampaignSummary(r));
      const totalBudget = campaigns.reduce((a, c) => a + c.budgetTotal, 0);
      const totalUsed = campaigns.reduce((a, c) => a + c.budgetUsed, 0);
      const totalReserved = campaigns.reduce((a, c) => a + c.budgetReserved, 0);

      const subStats = await db
        .selectFrom("submissions")
        .innerJoin("campaigns", "campaigns.id", "submissions.campaignId")
        .select((eb) => [
          eb.fn.countAll<number>().as("total"),
          sql<number>`count(*) filter (where submissions.status in ('submitted','ai_verifying','ai_passed','ai_failed','need_admin_review','disputed'))`.as("pending"),
          sql<number>`count(*) filter (where submissions.status in ('admin_approved','claimable','claimed','paid'))`.as("approved"),
          sql<number>`count(*) filter (where submissions.status = 'admin_rejected')`.as("rejected"),
        ])
        .where("campaigns.ownerId", "=", user.id)
        .where("submissions.status", "<>", "draft")
        .executeTakeFirst();

      const creators = await db
        .selectFrom("campaignParticipants")
        .innerJoin("campaigns", "campaigns.id", "campaignParticipants.campaignId")
        .select(sql<number>`count(distinct campaign_participants.creator_id)`.as("c"))
        .where("campaigns.ownerId", "=", user.id)
        .executeTakeFirst();

      const payments = await db
        .selectFrom("claims")
        .innerJoin("campaigns", "campaigns.id", "claims.campaignId")
        .select([
          sql<string>`coalesce(sum(claims.amount) filter (where claims.status = 'paid'), 0)`.as("paid"),
          sql<string>`coalesce(sum(claims.amount) filter (where claims.status = 'pending'), 0)`.as("pending"),
        ])
        .where("campaigns.ownerId", "=", user.id)
        .executeTakeFirst();

      const recent = await submissionBaseQuery(db)
        .where("campaigns.ownerId", "=", user.id)
        .where("submissions.status", "<>", "draft")
        .orderBy("submissions.updatedAt", "desc")
        .limit(8)
        .execute();

      return jsonResponse({
        role: "owner",
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalBudget,
        totalUsed,
        totalReserved,
        totalRemaining: Math.max(0, totalBudget - totalUsed - totalReserved),
        pctUsed: totalBudget > 0 ? Math.round(((totalUsed + totalReserved) / totalBudget) * 1000) / 10 : 0,
        totalCreators: num(creators?.c),
        totalSubmissions: num(subStats?.total),
        pendingSubmissions: num(subStats?.pending),
        approvedSubmissions: num(subStats?.approved),
        rejectedSubmissions: num(subStats?.rejected),
        totalPayments: num(payments?.paid),
        pendingPayments: num(payments?.pending),
        campaigns,
        recentSubmissions: recent.map(toSubmissionSummary),
      } satisfies OutputType);
    }

    if (user.role === "creator") {
      const available = await db
        .selectFrom("campaigns")
        .select((eb) => eb.fn.countAll<number>().as("c"))
        .where("status", "=", "active")
        .executeTakeFirst();
      const joinedRows = await campaignBaseQuery(db)
        .where("campaigns.id", "in", (eb) =>
          eb.selectFrom("campaignParticipants").select("campaignParticipants.campaignId").where("campaignParticipants.creatorId", "=", user.id)
        )
        .orderBy("campaigns.createdAt", "desc")
        .limit(12)
        .execute();
      const parts = await db
        .selectFrom("campaignParticipants")
        .select(["campaignId", "status"])
        .where("creatorId", "=", user.id)
        .execute();
      const partMap = new Map<number, ParticipantStatus>(parts.map((p) => [p.campaignId, p.status]));

      const stats = await db
        .selectFrom("submissions")
        .select([
          sql<number>`count(*) filter (where status <> 'draft')`.as("total"),
          sql<number>`count(*) filter (where status in ('submitted','ai_verifying','ai_passed','ai_failed','need_admin_review','disputed'))`.as("pending"),
          sql<number>`count(*) filter (where status in ('admin_approved','claimable','claimed','paid'))`.as("approved"),
          sql<number>`count(*) filter (where status = 'admin_rejected')`.as("rejected"),
          sql<number>`count(*) filter (where status = 'claimable')`.as("claimableCount"),
          sql<string>`coalesce(sum(approved_amount) filter (where status = 'claimable'), 0)`.as("claimableAmount"),
          sql<string>`coalesce(sum(approved_amount) filter (where status in ('claimable','claimed','paid')), 0)`.as("earning"),
          sql<string>`coalesce(sum(approved_amount) filter (where status in ('claimed','paid')), 0)`.as("claimed"),
          sql<string>`coalesce(sum(approved_amount) filter (where status = 'paid'), 0)`.as("paid"),
          sql<string>`coalesce(sum(approved_amount) filter (where status = 'claimed'), 0)`.as("awaiting"),
        ])
        .where("creatorId", "=", user.id)
        .executeTakeFirst();

      const recent = await submissionBaseQuery(db)
        .where("submissions.creatorId", "=", user.id)
        .orderBy("submissions.updatedAt", "desc")
        .limit(8)
        .execute();
      const recentClaims = await claimsFor((q) => q.where("claims.creatorId", "=", user.id), true, 6);

      return jsonResponse({
        role: "creator",
        availableCampaigns: num(available?.c),
        joinedCampaigns: parts.filter((p) => p.status === "active").length,
        totalSubmissions: num(stats?.total),
        pendingSubmissions: num(stats?.pending),
        approvedSubmissions: num(stats?.approved),
        rejectedSubmissions: num(stats?.rejected),
        claimableCount: num(stats?.claimableCount),
        claimableAmount: num(stats?.claimableAmount),
        totalEarning: num(stats?.earning),
        totalClaimed: num(stats?.claimed),
        totalPaid: num(stats?.paid),
        awaitingPayment: num(stats?.awaiting),
        recentSubmissions: recent.map(toSubmissionSummary),
        joined: joinedRows.map((r) => toCampaignSummary(r, partMap.get(r.id) ?? null)),
        recentClaims,
      } satisfies OutputType);
    }

    // ADMIN
    const subStats = await db
      .selectFrom("submissions")
      .select([
        sql<number>`count(*) filter (where status in ('submitted','ai_verifying'))`.as("pendingAi"),
        sql<number>`count(*) filter (where status = 'need_admin_review')`.as("needReview"),
        sql<number>`count(*) filter (where status in ('ai_passed','ai_failed'))`.as("awaiting"),
        sql<number>`count(*) filter (where status = 'claimable')`.as("claimPending"),
      ])
      .executeTakeFirst();
    const disputeStats = await db
      .selectFrom("disputes")
      .select((eb) => eb.fn.countAll<number>().as("c"))
      .where("status", "=", "pending")
      .executeTakeFirst();
    const claimStats = await db
      .selectFrom("claims")
      .select([
        sql<number>`count(*) filter (where status = 'pending')`.as("pendingCount"),
        sql<string>`coalesce(sum(amount) filter (where status = 'pending'), 0)`.as("pendingAmount"),
      ])
      .executeTakeFirst();
    const campaignStats = await db
      .selectFrom("campaigns")
      .select([
        sql<number>`count(*) filter (where status = 'active')`.as("active"),
        sql<string>`coalesce(sum(budget_total) filter (where status = 'active'), 0)`.as("budget"),
        sql<string>`coalesce(sum(budget_used) filter (where status = 'active'), 0)`.as("used"),
        sql<string>`coalesce(sum(budget_reserved) filter (where status = 'active'), 0)`.as("reserved"),
      ])
      .executeTakeFirst();
    const userStats = await db
      .selectFrom("users")
      .select([
        sql<number>`count(*)`.as("total"),
        sql<number>`count(*) filter (where role = 'creator')`.as("creators"),
        sql<number>`count(*) filter (where role = 'owner')`.as("owners"),
      ])
      .executeTakeFirst();

    const queue = await submissionBaseQuery(db)
      .where("submissions.status", "in", ["need_admin_review", "disputed", "ai_passed", "ai_failed"])
      .orderBy("submissions.submittedAt", "asc")
      .limit(10)
      .execute();

    const disputeRows = await db
      .selectFrom("disputes")
      .innerJoin("submissions", "submissions.id", "disputes.submissionId")
      .innerJoin("campaigns", "campaigns.id", "submissions.campaignId")
      .innerJoin("users as creator", "creator.id", "disputes.creatorId")
      .select([
        "disputes.id",
        "disputes.submissionId",
        "disputes.creatorId",
        "disputes.reason",
        "disputes.status",
        "disputes.adminNote",
        "disputes.createdAt",
        "disputes.resolvedAt",
        "submissions.sequenceNo",
        "submissions.title as submissionTitle",
        "submissions.status as submissionStatus",
        "submissions.aiSummary",
        "campaigns.id as campaignId",
        "campaigns.name as campaignName",
        "creator.displayName as creatorName",
      ])
      .where("disputes.status", "=", "pending")
      .orderBy("disputes.createdAt", "asc")
      .limit(6)
      .execute();

    const recentClaims = await claimsFor((q) => q.where("claims.status", "=", "pending"), true, 6);

    return jsonResponse({
      role: "admin",
      pendingAi: num(subStats?.pendingAi),
      needReview: num(subStats?.needReview),
      awaitingConfirmation: num(subStats?.awaiting),
      disputesPending: num(disputeStats?.c),
      claimPending: num(subStats?.claimPending),
      paymentPending: num(claimStats?.pendingCount),
      paymentPendingAmount: num(claimStats?.pendingAmount),
      activeCampaigns: num(campaignStats?.active),
      runningBudget: num(campaignStats?.budget),
      runningUsed: num(campaignStats?.used),
      runningReserved: num(campaignStats?.reserved),
      totalUsers: num(userStats?.total),
      totalCreators: num(userStats?.creators),
      totalOwners: num(userStats?.owners),
      queue: queue.map(toSubmissionSummary),
      recentDisputes: disputeRows.map((r) => ({
        id: r.id,
        submissionId: r.submissionId,
        creatorId: r.creatorId,
        reason: r.reason,
        evidenceUrl: null,
        status: r.status,
        adminNote: r.adminNote,
        adminName: null,
        createdAt: new Date(r.createdAt),
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
        submissionCode: submissionCode(r.sequenceNo),
        submissionTitle: r.submissionTitle,
        submissionStatus: r.submissionStatus,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        creatorName: r.creatorName,
        aiSummary: r.aiSummary,
      })),
      recentClaims,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}