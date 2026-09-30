import { db } from "../../helpers/db";
import { schema, OutputType } from "./create_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { logAudit } from "../../helpers/auditLog";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const result = await db.transaction().execute(async (trx) => {
      const s = await trx
        .selectFrom("submissions")
        .select(["id", "creatorId", "status", "campaignId"])
        .where("id", "=", input.submissionId)
        .forUpdate()
        .executeTakeFirst();
      if (!s || s.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
      if (s.status !== "ai_failed") {
        throw new ApiError("Sanggahan hanya dapat diajukan untuk submission dengan hasil AI FAILED", 409);
      }
      const existing = await trx
        .selectFrom("disputes")
        .select("id")
        .where("submissionId", "=", s.id)
        .where("status", "=", "pending")
        .executeTakeFirst();
      if (existing) throw new ApiError("Sanggahan untuk submission ini sedang diperiksa", 409);

      const [dispute] = await trx
        .insertInto("disputes")
        .values({
          submissionId: s.id,
          creatorId: user.id,
          reason: input.reason,
          evidenceFilename: input.evidenceFilename || null,
        })
        .returning("id")
        .execute();
      const now = new Date();
      await trx.updateTable("submissions").set({ status: "disputed", updatedAt: now }).where("id", "=", s.id).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: s.id,
        action: "dispute_submitted",
        fromStatus: "ai_failed",
        toStatus: "disputed",
        detail: { disputeId: dispute.id, hasEvidence: !!input.evidenceFilename },
      });
      const campaign = await trx.selectFrom("campaigns").select("ownerId").where("id", "=", s.campaignId).executeTakeFirstOrThrow();
      return { disputeId: dispute.id, submissionId: s.id, ownerId: campaign.ownerId };
    });

    await notifyRealtime({
      userIds: [user.id, result.ownerId],
      admins: true,
      event: { type: "dispute", entityType: "submission", entityId: result.submissionId },
    });
    return jsonResponse({ disputeId: result.disputeId, submissionId: result.submissionId, status: "disputed" } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}