import { db } from "../../helpers/db";
import { schema, OutputType } from "./decide_dispute_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { approveSubmission, rejectSubmission } from "../../helpers/submissionDecisions";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const result = await db.transaction().execute(async (trx) => {
      const dispute = await trx
        .selectFrom("disputes")
        .select(["id", "submissionId", "status"])
        .where("id", "=", input.disputeId)
        .forUpdate()
        .executeTakeFirst();
      if (!dispute) throw new ApiError("Sanggahan tidak ditemukan", 404);
      if (dispute.status !== "pending") throw new ApiError("Sanggahan ini sudah diputuskan", 409);

      if (input.decision === "accept") {
        return approveSubmission(trx, {
          submissionId: dispute.submissionId,
          admin,
          note: input.note,
          verifiedViews: input.verifiedViews ?? null,
          viaDispute: true,
        });
      }
      return rejectSubmission(trx, { submissionId: dispute.submissionId, admin, note: input.note, viaDispute: true });
    });

    await notifyRealtime({
      userIds: [result.creatorId, result.ownerId],
      admins: true,
      event: { type: "dispute", entityType: "submission", entityId: result.submissionId },
    });

    return jsonResponse({
      disputeId: input.disputeId,
      submissionId: result.submissionId,
      status: result.toStatus,
      approvedAmount: result.approvedAmount,
      capped: result.capped,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}