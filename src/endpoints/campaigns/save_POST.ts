import { db } from "../../helpers/db";
import { schema, OutputType } from "./save_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { campaignBaseQuery, toCampaignSummary } from "../../helpers/campaignQueries";
import { logAudit } from "../../helpers/auditLog";
import { normalizeHashtag } from "../../helpers/contentFingerprint";
import { notifyRealtime } from "../../helpers/realtimeNotify";

function validateForPublish(input: {
  watermarkRequired: boolean;
  watermarkLogoUrl?: string | null;
  ratePerThousandViews: number;
  feePerSubmission: number;
  startDate: string;
  endDate: string;
}) {
  if (input.watermarkRequired && !input.watermarkLogoUrl) {
    throw new ApiError("Campaign yang mewajibkan watermark harus menyertakan file logo PNG", 400);
  }
  if (input.ratePerThousandViews <= 0 && input.feePerSubmission <= 0) {
    throw new ApiError("Aturan pembayaran harus memiliki tarif per 1.000 views atau fee per submission", 400);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (input.endDate < today) {
    throw new ApiError("Tanggal berakhir campaign sudah lewat", 400);
  }
}

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["owner"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    if (input.endDate < input.startDate) {
      throw new ApiError("Tanggal berakhir harus setelah tanggal mulai", 400);
    }
    const hashtags = Array.from(new Set(input.requiredHashtags.map(normalizeHashtag).filter(Boolean)));
    if (input.publish) validateForPublish(input);

    const campaignId = await db.transaction().execute(async (trx) => {
      if (input.id) {
        const existing = await trx
          .selectFrom("campaigns")
          .select(["id", "ownerId", "status", "budgetTotal"])
          .where("id", "=", input.id)
          .forUpdate()
          .executeTakeFirst();
        if (!existing) throw new ApiError("Campaign tidak ditemukan", 404);
        if (existing.ownerId !== user.id) throw new ApiError("Campaign ini bukan milik Anda", 403);

        if (existing.status === "draft") {
          const newStatus = input.publish ? "active" : "draft";
          await trx
            .updateTable("campaigns")
            .set({
              name: input.name,
              description: input.description,
              budgetTotal: input.budgetTotal,
              startDate: input.startDate,
              endDate: input.endDate,
              target: input.target,
              targetViews: input.targetViews ?? null,
              requiredPlatform: input.requiredPlatform,
              watermarkRequired: input.watermarkRequired,
              watermarkLogoUrl: input.watermarkRequired ? input.watermarkLogoUrl ?? null : null,
              watermarkLogoFilename: input.watermarkRequired ? input.watermarkLogoFilename ?? null : null,
              minViews: input.minViews,
              duplicatePolicy: input.duplicatePolicy,
              requiredCaption: input.requiredCaption || null,
              requiredHashtags: hashtags,
              editingRequirement: input.editingRequirement || null,
              ratePerThousandViews: input.ratePerThousandViews,
              feePerSubmission: input.feePerSubmission,
              maxPayoutPerSubmission: input.maxPayoutPerSubmission,
              status: newStatus,
              updatedAt: new Date(),
            })
            .where("id", "=", existing.id)
            .execute();
          await logAudit(trx, {
            actorId: user.id,
            actorRole: user.role,
            entityType: "campaign",
            entityId: existing.id,
            action: input.publish ? "campaign_published" : "campaign_updated",
            fromStatus: "draft",
            toStatus: newStatus,
          });
        } else {
          // Campaign sudah berjalan: hanya teks & perpanjangan periode yang boleh diubah,
          // requirement dan aturan pembayaran dikunci agar adil bagi creator yang sudah bergabung.
          await trx
            .updateTable("campaigns")
            .set({
              name: input.name,
              description: input.description,
              target: input.target,
              targetViews: input.targetViews ?? null,
              endDate: input.endDate,
              editingRequirement: input.editingRequirement || null,
              updatedAt: new Date(),
            })
            .where("id", "=", existing.id)
            .execute();
          await logAudit(trx, {
            actorId: user.id,
            actorRole: user.role,
            entityType: "campaign",
            entityId: existing.id,
            action: "campaign_updated",
            fromStatus: existing.status,
            toStatus: existing.status,
            detail: { note: "Perubahan terbatas (nama, deskripsi, target, tanggal berakhir)" },
          });
        }
        return existing.id;
      }

      const status = input.publish ? "active" : "draft";
      const [created] = await trx
        .insertInto("campaigns")
        .values({
          ownerId: user.id,
          name: input.name,
          description: input.description,
          budgetTotal: input.budgetTotal,
          startDate: input.startDate,
          endDate: input.endDate,
          target: input.target,
          targetViews: input.targetViews ?? null,
          requiredPlatform: input.requiredPlatform,
          watermarkRequired: input.watermarkRequired,
          watermarkLogoUrl: input.watermarkRequired ? input.watermarkLogoUrl ?? null : null,
          watermarkLogoFilename: input.watermarkRequired ? input.watermarkLogoFilename ?? null : null,
          minViews: input.minViews,
          duplicatePolicy: input.duplicatePolicy,
          requiredCaption: input.requiredCaption || null,
          requiredHashtags: hashtags,
          editingRequirement: input.editingRequirement || null,
          ratePerThousandViews: input.ratePerThousandViews,
          feePerSubmission: input.feePerSubmission,
          maxPayoutPerSubmission: input.maxPayoutPerSubmission,
          status,
        })
        .returning("id")
        .execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "campaign",
        entityId: created.id,
        action: input.publish ? "campaign_created_active" : "campaign_created_draft",
        fromStatus: null,
        toStatus: status,
        detail: { budgetTotal: input.budgetTotal },
      });
      return created.id;
    });

    const row = await campaignBaseQuery(db).where("campaigns.id", "=", campaignId).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);
    await notifyRealtime({ userIds: [user.id], admins: true, event: { type: "campaign", entityId: campaignId } });

    return jsonResponse({ campaign: toCampaignSummary(row) } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}