import { Transaction } from "kysely";
import { DB } from "./schema";
import { ApiError, num } from "./apiUtils";
import { logAudit } from "./auditLog";

export type AllocationResult = {
  amount: number;
  requested: number;
  capped: boolean;
  availableBefore: number;
  availableAfter: number;
  campaignCompleted: boolean;
};

/**
 * Reserves `requested` rupiah from a campaign's available budget, capping at what is
 * actually available (budget protection). Locks the campaign row for the transaction.
 * Sets the campaign to "completed" when the budget becomes exhausted.
 */
export async function allocateBudget(
  trx: Transaction<DB>,
  campaignId: number,
  requested: number,
  actor: { id: number | null; role: string }
): Promise<AllocationResult> {
  const campaign = await trx
    .selectFrom("campaigns")
    .select(["id", "budgetTotal", "budgetUsed", "budgetReserved", "status"])
    .where("id", "=", campaignId)
    .forUpdate()
    .executeTakeFirst();
  if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);

  const total = num(campaign.budgetTotal);
  const used = num(campaign.budgetUsed);
  const reserved = num(campaign.budgetReserved);
  const available = Math.max(0, total - used - reserved);

  if (available <= 0) {
    throw new ApiError(
      "Budget campaign sudah habis. Tidak ada dana yang dapat dialokasikan untuk submission ini.",
      409
    );
  }

  const safeRequested = Math.max(0, Math.floor(requested));
  const amount = Math.min(safeRequested, available);
  const newReserved = reserved + amount;
  const exhausted = used + newReserved >= total;
  const completeNow = exhausted && campaign.status === "active";

  await trx
    .updateTable("campaigns")
    .set({
      budgetReserved: newReserved,
      updatedAt: new Date(),
      ...(completeNow ? { status: "completed" as const } : {}),
    })
    .where("id", "=", campaignId)
    .execute();

  if (completeNow) {
    await logAudit(trx, {
      actorId: actor.id,
      actorRole: "system",
      entityType: "campaign",
      entityId: campaignId,
      action: "budget_exhausted",
      fromStatus: "active",
      toStatus: "completed",
      detail: { budgetTotal: total, budgetUsed: used, budgetReserved: newReserved },
    });
  }

  return {
    amount,
    requested: safeRequested,
    capped: amount < safeRequested,
    availableBefore: available,
    availableAfter: available - amount,
    campaignCompleted: completeNow,
  };
}

/** Moves an already-reserved amount into "used" once the payment is confirmed. */
export async function settlePayment(
  trx: Transaction<DB>,
  campaignId: number,
  amount: number
): Promise<{ budgetUsed: number; budgetReserved: number; budgetTotal: number }> {
  const campaign = await trx
    .selectFrom("campaigns")
    .select(["id", "budgetTotal", "budgetUsed", "budgetReserved"])
    .where("id", "=", campaignId)
    .forUpdate()
    .executeTakeFirst();
  if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);

  const total = num(campaign.budgetTotal);
  const used = num(campaign.budgetUsed);
  const reserved = num(campaign.budgetReserved);
  const safeAmount = Math.max(0, Math.floor(amount));

  if (safeAmount > reserved) {
    throw new ApiError("Alokasi budget tidak konsisten: nominal melebihi dana yang dialokasikan", 409);
  }
  if (used + safeAmount > total) {
    throw new ApiError("Pembayaran melebihi budget campaign", 409);
  }

  const newUsed = used + safeAmount;
  const newReserved = reserved - safeAmount;
  await trx
    .updateTable("campaigns")
    .set({ budgetUsed: newUsed, budgetReserved: newReserved, updatedAt: new Date() })
    .where("id", "=", campaignId)
    .execute();

  return { budgetUsed: newUsed, budgetReserved: newReserved, budgetTotal: total };
}