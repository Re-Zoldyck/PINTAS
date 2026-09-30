import { db } from "../../helpers/db";
import { schema, OutputType } from "./status_POST.schema";
import { ApiError, handleApiError, jsonResponse, num, parseBody, requireUser } from "../../helpers/apiUtils";
import { campaignBaseQuery, toCampaignSummary } from "../../helpers/campaignQueries";
import { logAudit } from "../../helpers/auditLog";
import { notifyRealtime } from "../../helpers/realtimeNotify";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["owner", "admin"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const ownerId = await db.transaction().execute(async (trx) => {
      const c = await trx
        .selectFrom("campaigns")
        .selectAll()
        .where("id", "=", input.id)
        .forUpdate()
        .executeTakeFirst();
      if (!c) throw new ApiError("Campaign tidak ditemukan", 404);
      if (user.role === "owner" && c.ownerId !== user.id) {
        throw new ApiError("Campaign ini bukan milik Anda", 403);
      }
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(c.endDate).toISOString().slice(0, 10);

      if (input.action === "activate") {
        if (user.role !== "owner") throw new ApiError("Hanya Owner yang dapat mengaktifkan campaign", 403);
        if (c.status !== "draft") throw new ApiError("Hanya campaign berstatus Draft yang dapat diaktifkan", 409);
        if (c.watermarkRequired && !c.watermarkLogoUrl) throw new ApiError("Unggah logo watermark PNG sebelum mengaktifkan campaign", 400);
        if (num(c.ratePerThousandViews) <= 0 && num(c.feePerSubmission) <= 0) throw new ApiError("Lengkapi aturan pembayaran sebelum mengaktifkan campaign", 400);
        if (endDate < today) throw new ApiError("Tanggal berakhir campaign sudah lewat; perbarui periode terlebih dahulu", 400);
        await trx.updateTable("campaigns").set({ status: "active", updatedAt: new Date() }).where("id", "=", c.id).execute();
        await logAudit(trx, { actorId: user.id, actorRole: user.role, entityType: "campaign", entityId: c.id, action: "campaign_published", fromStatus: "draft", toStatus: "active" });
      } else if (input.action === "complete") {
        if (c.status !== "active") throw new ApiError("Hanya campaign aktif yang dapat diselesaikan", 409);
        await trx.updateTable("campaigns").set({ status: "completed", updatedAt: new Date() }).where("id", "=", c.id).execute();
        await logAudit(trx, { actorId: user.id, actorRole: user.role, entityType: "campaign", entityId: c.id, action: "campaign_completed", fromStatus: "active", toStatus: "completed" });
      } else if (input.action === "add_budget") {
        if (user.role !== "owner") throw new ApiError("Hanya Owner yang dapat menambah budget", 403);
        if (!input.amount || input.amount <= 0) throw new ApiError("Nominal tambahan budget wajib diisi", 400);
        if (c.status === "expired") throw new ApiError("Campaign sudah berakhir; perpanjang periode terlebih dahulu", 409);
        const newTotal = num(c.budgetTotal) + input.amount;
        const reactivate = c.status === "completed" && endDate >= today;
        await trx
          .updateTable("campaigns")
          .set({ budgetTotal: newTotal, updatedAt: new Date(), ...(reactivate ? { status: "active" as const } : {}) })
          .where("id", "=", c.id)
          .execute();
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: c.id,
          action: "budget_added",
          fromStatus: c.status,
          toStatus: reactivate ? "active" : c.status,
          detail: { amount: input.amount, budgetTotalBefore: num(c.budgetTotal), budgetTotalAfter: newTotal },
        });
      }
      return c.ownerId;
    });

    const row = await campaignBaseQuery(db).where("campaigns.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);
    await notifyRealtime({ userIds: [ownerId], admins: true, event: { type: "campaign", entityId: input.id } });
    return jsonResponse({ campaign: toCampaignSummary(row) } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}