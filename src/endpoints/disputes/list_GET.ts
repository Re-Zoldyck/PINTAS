import { db } from "../../helpers/db";
import { schema, OutputType, DisputeListItem } from "./list_GET.schema";
import { handleApiError, jsonResponse, requireUser } from "../../helpers/apiUtils";
import { submissionCode } from "../../helpers/pintasLabels";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["creator", "admin", "owner"]);
    const url = new URL(request.url);
    const input = schema.parse({ status: url.searchParams.get("status") ?? undefined });

    let query = db
      .selectFrom("disputes")
      .innerJoin("submissions", "submissions.id", "disputes.submissionId")
      .innerJoin("campaigns", "campaigns.id", "submissions.campaignId")
      .innerJoin("users as creator", "creator.id", "disputes.creatorId")
      .leftJoin("users as admin", "admin.id", "disputes.adminId")
      .select([
        "disputes.id",
        "disputes.submissionId",
        "disputes.creatorId",
        "disputes.reason",
        "disputes.status",
        "disputes.adminNote",
        "admin.displayName as adminName",
        "disputes.createdAt",
        "disputes.resolvedAt",
        "submissions.sequenceNo",
        "submissions.title as submissionTitle",
        "submissions.status as submissionStatus",
        "submissions.aiSummary",
        "campaigns.id as campaignId",
        "campaigns.name as campaignName",
        "creator.displayName as creatorName",
      ]);
    if (user.role === "creator") query = query.where("disputes.creatorId", "=", user.id);
    if (user.role === "owner") query = query.where("campaigns.ownerId", "=", user.id);
    if (input.status) query = query.where("disputes.status", "=", input.status);

    const rows = await query.orderBy("disputes.createdAt", "desc").limit(200).execute();
    const disputes: DisputeListItem[] = rows.map((r) => ({
      id: r.id,
      submissionId: r.submissionId,
      creatorId: r.creatorId,
      reason: r.reason,
      evidenceUrl: null,
      status: r.status,
      adminNote: r.adminNote,
      adminName: r.adminName ?? null,
      createdAt: new Date(r.createdAt),
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
      submissionCode: submissionCode(r.sequenceNo),
      submissionTitle: r.submissionTitle,
      submissionStatus: r.submissionStatus,
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      creatorName: r.creatorName,
      aiSummary: r.aiSummary,
    }));
    return jsonResponse({ disputes } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}