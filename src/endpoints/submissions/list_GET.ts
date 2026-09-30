import { db } from "../../helpers/db";
import { schema, OutputType } from "./list_GET.schema";
import { handleApiError, jsonResponse, requireUser } from "../../helpers/apiUtils";
import { submissionBaseQuery, toSubmissionSummary } from "../../helpers/submissionQueries";
import type { SubmissionStatus } from "../../helpers/schema";

const GROUPS: Record<string, SubmissionStatus[]> = {
  pending: ["submitted", "ai_verifying", "ai_passed", "ai_failed", "need_admin_review", "disputed"],
  review: ["need_admin_review", "disputed"],
  confirm: ["ai_passed", "ai_failed", "need_admin_review", "disputed"],
  claimable: ["claimable", "claimed"],
};

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const campaignIdRaw = url.searchParams.get("campaignId");
    const input = schema.parse({
      campaignId: campaignIdRaw ? Number(campaignIdRaw) : undefined,
      status: url.searchParams.get("status") ?? undefined,
      group: url.searchParams.get("group") ?? undefined,
    });

    let query = submissionBaseQuery(db);
    if (user.role === "creator") {
      query = query.where("submissions.creatorId", "=", user.id);
    } else if (user.role === "owner") {
      query = query.where("campaigns.ownerId", "=", user.id).where("submissions.status", "<>", "draft");
    } else {
      query = query.where("submissions.status", "<>", "draft");
    }
    if (input.campaignId) query = query.where("submissions.campaignId", "=", input.campaignId);
    if (input.status) query = query.where("submissions.status", "=", input.status);
    if (input.group && input.group !== "all" && GROUPS[input.group]) {
      query = query.where("submissions.status", "in", GROUPS[input.group]);
    }

    const rows = await query.orderBy("submissions.updatedAt", "desc").limit(300).execute();
    return jsonResponse({ submissions: rows.map(toSubmissionSummary) } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}