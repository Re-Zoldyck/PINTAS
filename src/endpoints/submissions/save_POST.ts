import { sql } from "kysely";
import { db } from "../../helpers/db";
import { schema, OutputType } from "./save_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { analyzeContentUrl, normalizeHandle, normalizeHashtag } from "../../helpers/contentFingerprint";
import { logAudit } from "../../helpers/auditLog";
import { runAiVerification } from "../../helpers/aiVerification";
import { notifyRealtime } from "../../helpers/realtimeNotify";
import type { AiResult, SubmissionStatus } from "../../helpers/schema";

const AI_STATUS: Record<AiResult, SubmissionStatus> = {
  pass: "ai_passed",
  fail: "ai_failed",
  need_review: "need_admin_review",
};

export async function handle(request: Request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema.parse(j));

    const urlInfo = analyzeContentUrl(input.contentUrl);
    if (!urlInfo.ok) throw new ApiError("URL konten tidak valid", 400);
    const hashtags = Array.from(new Set(input.hashtags.map(normalizeHashtag).filter(Boolean)));
    const accountHandle = normalizeHandle(input.accountHandle);
    if (!accountHandle) throw new ApiError("Akun/handle wajib diisi", 400);

    const outcome = await db.transaction().execute(async (trx) => {
      const campaign = await trx
        .selectFrom("campaigns")
        .select(["id", "status", "ownerId", "requiredPlatform", "watermarkRequired"])
        .where("id", "=", input.campaignId)
        .executeTakeFirst();
      if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);
      if (campaign.status !== "active") {
        throw new ApiError("Campaign ini tidak sedang aktif, submission baru tidak dapat dikirim", 409);
      }

      // Pastikan creator tercatat sebagai peserta (mengambil campaign).
      const participant = await trx
        .selectFrom("campaignParticipants")
        .select(["id", "status"])
        .where("campaignId", "=", campaign.id)
        .where("creatorId", "=", user.id)
        .executeTakeFirst();
      if (!participant) {
        await trx
          .insertInto("campaignParticipants")
          .values({ campaignId: campaign.id, creatorId: user.id, status: "active" })
          .execute();
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: campaign.id,
          action: "creator_joined",
          detail: { creatorId: user.id, via: "submission" },
        });
      } else if (participant.status === "stopped") {
        await trx
          .updateTable("campaignParticipants")
          .set({ status: "active", stoppedAt: null })
          .where("id", "=", participant.id)
          .execute();
      }

      const baseValues = {
        title: input.title,
        contentUrl: input.contentUrl.trim(),
        contentFingerprint: urlInfo.fingerprint,
        platform: input.platform,
        accountHandle,
        caption: input.caption,
        hashtags,
        viewsClaimed: input.viewsClaimed,
        proofScreenshotFilename: input.proofScreenshotFilename || null,
        watermarkApplied: input.watermarkApplied,
        editingConfirmed: input.editingConfirmed,
        creatorNotes: input.creatorNotes || null,
        updatedAt: new Date(),
      };

      let submissionId: number;
      if (input.id) {
        const existing = await trx
          .selectFrom("submissions")
          .select(["id", "creatorId", "status", "campaignId"])
          .where("id", "=", input.id)
          .forUpdate()
          .executeTakeFirst();
        if (!existing || existing.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
        if (existing.status !== "draft") throw new ApiError("Hanya submission berstatus Draft yang dapat diubah", 409);
        if (existing.campaignId !== campaign.id) throw new ApiError("Campaign submission tidak dapat diubah", 400);
        await trx.updateTable("submissions").set(baseValues).where("id", "=", existing.id).execute();
        submissionId = existing.id;
      } else {
        // Serialize per (campaign, creator) so sequence numbers never collide.
        await sql`SELECT pg_advisory_xact_lock(hashtext(${`sub:${campaign.id}:${user.id}`}))`.execute(trx);
        const last = await trx
          .selectFrom("submissions")
          .select((eb) => eb.fn.max("sequenceNo").as("m"))
          .where("campaignId", "=", campaign.id)
          .where("creatorId", "=", user.id)
          .executeTakeFirst();
        const sequenceNo = (last?.m ?? 0) + 1;
        const [created] = await trx
          .insertInto("submissions")
          .values({
            campaignId: campaign.id,
            creatorId: user.id,
            sequenceNo,
            status: "draft",
            ...baseValues,
          })
          .returning("id")
          .execute();
        submissionId = created.id;
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "submission",
          entityId: submissionId,
          action: "submission_created",
          fromStatus: null,
          toStatus: "draft",
          detail: { sequenceNo, campaignId: campaign.id },
        });
      }

      if (input.action === "save_draft") {
        return { id: submissionId, status: "draft" as SubmissionStatus, aiResult: null, aiSummary: null, ownerId: campaign.ownerId };
      }

      // SUBMIT → AI VERIFYING → hasil AI
      const now = new Date();
      await trx
        .updateTable("submissions")
        .set({ status: "submitted", submittedAt: now, updatedAt: now })
        .where("id", "=", submissionId)
        .execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: submissionId,
        action: "submitted",
        fromStatus: "draft",
        toStatus: "submitted",
      });
      await trx.updateTable("submissions").set({ status: "ai_verifying" }).where("id", "=", submissionId).execute();
      await logAudit(trx, {
        actorId: null,
        actorRole: "ai",
        entityType: "submission",
        entityId: submissionId,
        action: "ai_verification_started",
        fromStatus: "submitted",
        toStatus: "ai_verifying",
      });

      const ai = await runAiVerification(trx, submissionId);
      const nextStatus = AI_STATUS[ai.result];
      await trx
        .updateTable("submissions")
        .set({
          status: nextStatus,
          aiResult: ai.result,
          aiChecks: ai.checks,
          aiSummary: ai.summary,
          aiVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where("id", "=", submissionId)
        .execute();
      await logAudit(trx, {
        actorId: null,
        actorRole: "ai",
        entityType: "submission",
        entityId: submissionId,
        action: "ai_verification_completed",
        fromStatus: "ai_verifying",
        toStatus: nextStatus,
        detail: {
          result: ai.result,
          summary: ai.summary,
          fails: ai.checks.filter((c) => c.status === "fail").map((c) => c.key),
          reviews: ai.checks.filter((c) => c.status === "review").map((c) => c.key),
        },
      });

      return { id: submissionId, status: nextStatus, aiResult: ai.result, aiSummary: ai.summary, ownerId: campaign.ownerId };
    });

    await notifyRealtime({
      userIds: [user.id, outcome.ownerId],
      admins: true,
      event: { type: "submission", entityType: "submission", entityId: outcome.id },
    });

    return jsonResponse({
      id: outcome.id,
      status: outcome.status,
      aiResult: outcome.aiResult,
      aiSummary: outcome.aiSummary,
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}