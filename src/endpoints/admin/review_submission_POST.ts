import { db } from "../../helpers/db";
import { schema, OutputType } from "./review_submission_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { approveSubmission, rejectSubmission } from "../../helpers/submissionDecisions";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema.parse(j));
    const note = input.note?.trim() || null;

    const result = await db.transaction().execute(async (trx) => {
      if (input.decision === "approve") {
        return approveSubmission(trx, {
          submissionId: input.submissionId,
          admin,
          note,
          verifiedViews: input.verifiedViews ?? null,
        });
      }
      if (!note) throw new ApiError("Alasan penolakan wajib diisi", 400);
      return rejectSubmission(trx, { submissionId: input.submissionId, admin, note });
    });

    await notifyRealtime({
      userIds: [result.creatorId, result.ownerId],
      admins: true,
      event: { type: "submission", entityType: "submission", entityId: result.submissionId },
    });

    return jsonResponse({
      submissionId: result.submissionId,
      status: result.toStatus,
      approvedAmount: result.approvedAmount,
      calculatedAmount: result.calculatedAmount,
      capped: result.capped,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}