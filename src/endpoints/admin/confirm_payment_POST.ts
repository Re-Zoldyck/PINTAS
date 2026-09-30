import { db } from "../../helpers/db";
import { schema, OutputType } from "./confirm_payment_POST.schema";
import { ApiError, handleApiError, jsonResponse, num, parseBody, requireUser } from "../../helpers/apiUtils";
import { settlePayment } from "../../helpers/budgetLedger";
import { logAudit } from "../../helpers/auditLog";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema.parse(j));
    const note = input.note?.trim() || null;

    const result = await db.transaction().execute(async (trx) => {
      const claim = await trx
        .selectFrom("claims")
        .select(["id", "submissionId", "campaignId", "creatorId", "amount", "status"])
        .where("id", "=", input.claimId)
        .forUpdate()
        .executeTakeFirst();
      if (!claim) throw new ApiError("Claim tidak ditemukan", 404);
      if (claim.status !== "pending") throw new ApiError("Claim ini sudah diproses", 409);

      const submission = await trx
        .selectFrom("submissions")
        .select(["id", "status", "approvedAmount"])
        .where("id", "=", claim.submissionId)
        .forUpdate()
        .executeTakeFirst();
      if (!submission) throw new ApiError("Submission tidak ditemukan", 404);
      if (submission.status !== "claimed") throw new ApiError("Submission tidak dalam status Claim Diajukan", 409);

      const campaign = await trx
        .selectFrom("campaigns")
        .select(["ownerId"])
        .where("id", "=", claim.campaignId)
        .executeTakeFirstOrThrow();

      const amount = num(claim.amount);
      const now = new Date();

      if (input.decision === "paid") {
        const ledger = await settlePayment(trx, claim.campaignId, amount);
        await trx
          .updateTable("claims")
          .set({ status: "paid", adminId: admin.id, adminNote: note, paymentReference: input.paymentReference?.trim() || null, paidAt: now })
          .where("id", "=", claim.id)
          .execute();
        await trx.updateTable("submissions").set({ status: "paid", updatedAt: now }).where("id", "=", submission.id).execute();
        await logAudit(trx, {
          actorId: admin.id,
          actorRole: admin.role,
          entityType: "submission",
          entityId: submission.id,
          action: "payment_confirmed",
          fromStatus: "claimed",
          toStatus: "paid",
          detail: { claimId: claim.id, amount, paymentReference: input.paymentReference ?? null, budgetUsedAfter: ledger.budgetUsed, budgetReservedAfter: ledger.budgetReserved },
        });
        await logAudit(trx, {
          actorId: admin.id,
          actorRole: admin.role,
          entityType: "campaign",
          entityId: claim.campaignId,
          action: "payment_settled",
          detail: { claimId: claim.id, submissionId: submission.id, amount, budgetUsed: ledger.budgetUsed, budgetReserved: ledger.budgetReserved, budgetTotal: ledger.budgetTotal },
        });
        return { claim, submissionStatus: "paid", claimStatus: "paid", ownerId: campaign.ownerId, amount };
      }

      if (!note) throw new ApiError("Alasan penolakan claim wajib diisi", 400);
      await trx
        .updateTable("claims")
        .set({ status: "rejected", adminId: admin.id, adminNote: note })
        .where("id", "=", claim.id)
        .execute();
      await trx.updateTable("submissions").set({ status: "claimable", updatedAt: now }).where("id", "=", submission.id).execute();
      await logAudit(trx, {
        actorId: admin.id,
        actorRole: admin.role,
        entityType: "submission",
        entityId: submission.id,
        action: "claim_rejected",
        fromStatus: "claimed",
        toStatus: "claimable",
        detail: { claimId: claim.id, note },
      });
      return { claim, submissionStatus: "claimable", claimStatus: "rejected", ownerId: campaign.ownerId, amount };
    });

    await notifyRealtime({
      userIds: [result.claim.creatorId, result.ownerId],
      admins: true,
      event: { type: "payment", entityType: "submission", entityId: result.claim.submissionId },
    });

    return jsonResponse({
      claimId: result.claim.id,
      submissionId: result.claim.submissionId,
      claimStatus: result.claimStatus,
      submissionStatus: result.submissionStatus,
      amount: result.amount,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}