import { db } from "../../helpers/db";
import { schema, OutputType } from "./participation_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { logAudit } from "../../helpers/auditLog";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const result = await db.transaction().execute(async (trx) => {
      const campaign = await trx
        .selectFrom("campaigns")
        .select(["id", "status", "ownerId"])
        .where("id", "=", input.campaignId)
        .executeTakeFirst();
      if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);

      const existing = await trx
        .selectFrom("campaignParticipants")
        .select(["id", "status"])
        .where("campaignId", "=", input.campaignId)
        .where("creatorId", "=", user.id)
        .executeTakeFirst();

      if (input.action === "join") {
        if (campaign.status !== "active") throw new ApiError("Campaign ini tidak sedang aktif", 409);
        if (existing?.status === "active") return { status: "active" as const, ownerId: campaign.ownerId };
        if (existing) {
          await trx
            .updateTable("campaignParticipants")
            .set({ status: "active", stoppedAt: null, joinedAt: new Date() })
            .where("id", "=", existing.id)
            .execute();
        } else {
          await trx
            .insertInto("campaignParticipants")
            .values({ campaignId: input.campaignId, creatorId: user.id, status: "active" })
            .execute();
        }
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: input.campaignId,
          action: existing ? "creator_rejoined" : "creator_joined",
          detail: { creatorId: user.id },
        });
        return { status: "active" as const, ownerId: campaign.ownerId };
      }

      if (!existing || existing.status === "stopped") {
        return { status: "stopped" as const, ownerId: campaign.ownerId };
      }
      await trx
        .updateTable("campaignParticipants")
        .set({ status: "stopped", stoppedAt: new Date() })
        .where("id", "=", existing.id)
        .execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "campaign",
        entityId: input.campaignId,
        action: "creator_stopped",
        detail: { creatorId: user.id },
      });
      return { status: "stopped" as const, ownerId: campaign.ownerId };
    });

    await notifyRealtime({ userIds: [result.ownerId, user.id], event: { type: "participation", entityId: input.campaignId } });
    return jsonResponse({ campaignId: input.campaignId, status: result.status } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}