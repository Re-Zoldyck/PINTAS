import { db } from "../../helpers/db";
import { schema, OutputType, CampaignParticipantInfo } from "./detail_GET.schema";
import { ApiError, handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";
import { campaignBaseQuery, expireCampaigns, toCampaignSummary } from "../../helpers/campaignQueries";
import { submissionBaseQuery, toSubmissionSummary } from "../../helpers/submissionQueries";
import type { AuditEntry } from "../../helpers/pintasTypes";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema.parse({ id: Number(url.searchParams.get("id")) });

    await expireCampaigns(db);

    const row = await campaignBaseQuery(db).where("campaigns.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);

    let myParticipation: "active" | "stopped" | null = null;
    if (user.role === "creator") {
      const part = await db
        .selectFrom("campaignParticipants")
        .select("status")
        .where("campaignId", "=", input.id)
        .where("creatorId", "=", user.id)
        .executeTakeFirst();
      myParticipation = part?.status ?? null;
      if (row.status !== "active" && !myParticipation) {
        throw new ApiError("Campaign ini tidak tersedia", 404);
      }
    } else if (user.role === "owner" && row.ownerId !== user.id) {
      throw new ApiError("Campaign ini bukan milik Anda", 403);
    }

    let submissionQuery = submissionBaseQuery(db).where("submissions.campaignId", "=", input.id);
    if (user.role === "creator") {
      submissionQuery = submissionQuery.where("submissions.creatorId", "=", user.id);
    } else {
      submissionQuery = submissionQuery.where("submissions.status", "<>", "draft");
    }
    const submissionRows = await submissionQuery.orderBy("submissions.updatedAt", "desc").limit(300).execute();

    let participants: CampaignParticipantInfo[] = [];
    let activity: AuditEntry[] = [];
    if (user.role !== "creator") {
      const partRows = await db
        .selectFrom("campaignParticipants")
        .innerJoin("users", "users.id", "campaignParticipants.creatorId")
        .select((eb) => [
          "campaignParticipants.creatorId",
          "users.displayName as creatorName",
          "campaignParticipants.status",
          "campaignParticipants.joinedAt",
          eb
            .selectFrom("submissions")
            .select((seb) => seb.fn.countAll<number>().as("c"))
            .whereRef("submissions.creatorId", "=", "campaignParticipants.creatorId")
            .whereRef("submissions.campaignId", "=", "campaignParticipants.campaignId")
            .where("submissions.status", "<>", "draft")
            .as("submissionCount"),
          eb
            .selectFrom("submissions")
            .select((seb) => seb.fn.coalesce(seb.fn.sum<string>("submissions.approvedAmount"), seb.val("0")).as("s"))
            .whereRef("submissions.creatorId", "=", "campaignParticipants.creatorId")
            .whereRef("submissions.campaignId", "=", "campaignParticipants.campaignId")
            .where("submissions.status", "in", ["claimable", "claimed", "paid"])
            .as("approvedAmount"),
        ])
        .where("campaignParticipants.campaignId", "=", input.id)
        .orderBy("campaignParticipants.joinedAt", "desc")
        .execute();
      participants = partRows.map((p) => ({
        creatorId: p.creatorId,
        creatorName: p.creatorName,
        status: p.status,
        joinedAt: new Date(p.joinedAt),
        submissionCount: num(p.submissionCount),
        approvedAmount: num(p.approvedAmount),
      }));

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
        .where("auditLogs.entityType", "=", "campaign")
        .where("auditLogs.entityId", "=", input.id)
        .orderBy("auditLogs.createdAt", "desc")
        .limit(30)
        .execute();
      activity = logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
    }

    return jsonResponse({
      campaign: toCampaignSummary(row, myParticipation),
      submissions: submissionRows.map(toSubmissionSummary),
      participants,
      activity,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}