import { Transaction } from "kysely";
import { DB } from "./schema";
import { ApiError, num } from "./apiUtils";
import { logAudit } from "./auditLog";
import { allocateBudget } from "./budgetLedger";
import { calculatePayout } from "./payout";
import { adminDecidableStatuses } from "./pintasLabels";
import { User } from "./User";

export type DecisionResult = {
  submissionId: number;
  creatorId: number;
  ownerId: number;
  campaignId: number;
  fromStatus: string;
  toStatus: string;
  approvedAmount: number | null;
  calculatedAmount: number | null;
  capped: boolean;
};

async function loadForDecision(trx: Transaction<DB>, submissionId: number) {
  const s = await trx
    .selectFrom("submissions")
    .select(["id", "campaignId", "creatorId", "status", "viewsClaimed", "verifiedViews"])
    .where("id", "=", submissionId)
    .forUpdate()
    .executeTakeFirst();
  if (!s) throw new ApiError("Submission tidak ditemukan", 404);
  if (!adminDecidableStatuses.includes(s.status)) {
    throw new ApiError(`Submission berstatus "${s.status}" tidak dapat diputuskan lagi`, 409);
  }
  const c = await trx
    .selectFrom("campaigns")
    .select(["id", "ownerId", "ratePerThousandViews", "feePerSubmission", "maxPayoutPerSubmission"])
    .where("id", "=", s.campaignId)
    .executeTakeFirst();
  if (!c) throw new ApiError("Campaign tidak ditemukan", 404);
  return { s, c };
}

async function resolvePendingDispute(
  trx: Transaction<DB>,
  submissionId: number,
  admin: User,
  status: "accepted" | "rejected",
  note: string | null
) {
  const pending = await trx
    .selectFrom("disputes")
    .select("id")
    .where("submissionId", "=", submissionId)
    .where("status", "=", "pending")
    .execute();
  for (const d of pending) {
    await trx
      .updateTable("disputes")
      .set({ status, adminId: admin.id, adminNote: note, resolvedAt: new Date() })
      .where("id", "=", d.id)
      .execute();
    await logAudit(trx, {
      actorId: admin.id,
      actorRole: admin.role,
      entityType: "submission",
      entityId: submissionId,
      action: status === "accepted" ? "dispute_accepted" : "dispute_rejected",
      fromStatus: "pending",
      toStatus: status,
      detail: { disputeId: d.id, note },
    });
  }
}

/**
 * Admin approval: computes the payout from the campaign rules and the verified views,
 * reserves it from the campaign budget (capped by what is available) and moves the
 * submission to CLAIMABLE. Also settles any pending dispute as accepted.
 */
export async function approveSubmission(
  trx: Transaction<DB>,
  opts: { submissionId: number; admin: User; note: string | null; verifiedViews?: number | null; viaDispute?: boolean }
): Promise<DecisionResult> {
  const { s, c } = await loadForDecision(trx, opts.submissionId);
  const verifiedViews = Math.max(0, Math.floor(opts.verifiedViews ?? s.viewsClaimed));
  const calculated = calculatePayout(
    {
      ratePerThousandViews: num(c.ratePerThousandViews),
      feePerSubmission: num(c.feePerSubmission),
      maxPayoutPerSubmission: num(c.maxPayoutPerSubmission),
    },
    verifiedViews
  );

  const allocation = await allocateBudget(trx, c.id, calculated, { id: opts.admin.id, role: opts.admin.role });
  const now = new Date();

  await trx
    .updateTable("submissions")
    .set({
      status: "admin_approved",
      adminId: opts.admin.id,
      adminNote: opts.note,
      adminDecidedAt: now,
      verifiedViews,
      calculatedAmount: calculated,
      approvedAmount: allocation.amount,
      updatedAt: now,
    })
    .where("id", "=", s.id)
    .execute();
  await logAudit(trx, {
    actorId: opts.admin.id,
    actorRole: opts.admin.role,
    entityType: "submission",
    entityId: s.id,
    action: opts.viaDispute ? "admin_approved_via_dispute" : "admin_approved",
    fromStatus: s.status,
    toStatus: "admin_approved",
    detail: {
      note: opts.note,
      verifiedViews,
      calculatedAmount: calculated,
      approvedAmount: allocation.amount,
      capped: allocation.capped,
      budgetAvailableBefore: allocation.availableBefore,
      budgetAvailableAfter: allocation.availableAfter,
    },
  });

  await trx.updateTable("submissions").set({ status: "claimable", updatedAt: now }).where("id", "=", s.id).execute();
  await logAudit(trx, {
    actorId: null,
    actorRole: "system",
    entityType: "submission",
    entityId: s.id,
    action: "budget_allocated",
    fromStatus: "admin_approved",
    toStatus: "claimable",
    detail: { approvedAmount: allocation.amount },
  });

  await resolvePendingDispute(trx, s.id, opts.admin, "accepted", opts.note);

  return {
    submissionId: s.id,
    creatorId: s.creatorId,
    ownerId: c.ownerId,
    campaignId: c.id,
    fromStatus: s.status,
    toStatus: "claimable",
    approvedAmount: allocation.amount,
    calculatedAmount: calculated,
    capped: allocation.capped,
  };
}

export async function rejectSubmission(
  trx: Transaction<DB>,
  opts: { submissionId: number; admin: User; note: string; viaDispute?: boolean }
): Promise<DecisionResult> {
  const { s, c } = await loadForDecision(trx, opts.submissionId);
  const now = new Date();
  await trx
    .updateTable("submissions")
    .set({ status: "admin_rejected", adminId: opts.admin.id, adminNote: opts.note, adminDecidedAt: now, updatedAt: now })
    .where("id", "=", s.id)
    .execute();
  await logAudit(trx, {
    actorId: opts.admin.id,
    actorRole: opts.admin.role,
    entityType: "submission",
    entityId: s.id,
    action: opts.viaDispute ? "admin_rejected_via_dispute" : "admin_rejected",
    fromStatus: s.status,
    toStatus: "admin_rejected",
    detail: { note: opts.note },
  });
  await resolvePendingDispute(trx, s.id, opts.admin, "rejected", opts.note);
  return {
    submissionId: s.id,
    creatorId: s.creatorId,
    ownerId: c.ownerId,
    campaignId: c.id,
    fromStatus: s.status,
    toStatus: "admin_rejected",
    approvedAmount: null,
    calculatedAmount: null,
    capped: false,
  };
}