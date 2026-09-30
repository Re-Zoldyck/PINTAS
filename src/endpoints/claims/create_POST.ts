import { db } from "../../helpers/db";
import { schema, OutputType } from "./create_POST.schema";
import { ApiError, handleApiError, jsonResponse, num, parseBody, requireUser } from "../../helpers/apiUtils";
import { logAudit } from "../../helpers/auditLog";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const result = await db.transaction().execute(async (trx) => {
      const s = await trx
        .selectFrom("submissions")
        .select(["id", "creatorId", "campaignId", "status", "approvedAmount"])
        .where("id", "=", input.submissionId)
        .forUpdate()
        .executeTakeFirst();
      if (!s || s.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
      if (s.status !== "claimable") {
        throw new ApiError(
          s.status === "claimed" || s.status === "paid"
            ? "Submission ini sudah pernah di-claim"
            : "Submission belum dapat di-claim (butuh persetujuan Admin)",
          409
        );
      }
      const amount = num(s.approvedAmount);
      if (amount <= 0) throw new ApiError("Nominal pembayaran untuk submission ini adalah Rp0", 409);

      const active = await trx
        .selectFrom("claims")
        .select("id")
        .where("submissionId", "=", s.id)
        .where("status", "<>", "rejected")
        .executeTakeFirst();
      if (active) throw new ApiError("Claim untuk submission ini sudah ada", 409);

      const [claim] = await trx
        .insertInto("claims")
        .values({
          submissionId: s.id,
          campaignId: s.campaignId,
          creatorId: user.id,
          amount,
          realName: input.realName,
          phone: input.phone,
          bankName: input.bankName,
          bankAccountNumber: input.bankAccountNumber,
          bankAccountHolder: input.bankAccountHolder,
          status: "pending",
        })
        .returning("id")
        .execute();

      const now = new Date();
      await trx.updateTable("submissions").set({ status: "claimed", updatedAt: now }).where("id", "=", s.id).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: s.id,
        action: "claim_submitted",
        fromStatus: "claimable",
        toStatus: "claimed",
        detail: { claimId: claim.id, amount },
      });
      const campaign = await trx.selectFrom("campaigns").select("ownerId").where("id", "=", s.campaignId).executeTakeFirstOrThrow();
      return { claimId: claim.id, submissionId: s.id, amount, ownerId: campaign.ownerId };
    });

    await notifyRealtime({
      userIds: [user.id, result.ownerId],
      admins: true,
      event: { type: "claim", entityType: "submission", entityId: result.submissionId },
    });
    return jsonResponse({ claimId: result.claimId, submissionId: result.submissionId, amount: result.amount, status: "claimed" } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}