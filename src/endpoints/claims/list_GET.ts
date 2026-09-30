import { db } from "../../helpers/db";
import { schema, OutputType } from "./list_GET.schema";
import { handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";
import { claimCode, submissionCode } from "../../helpers/pintasLabels";
import type { ClaimInfo } from "../../helpers/pintasTypes";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const campaignIdRaw = url.searchParams.get("campaignId");
    const input = schema.parse({
      status: url.searchParams.get("status") ?? undefined,
      campaignId: campaignIdRaw ? Number(campaignIdRaw) : undefined,
    });

    let query = db
      .selectFrom("claims")
      .innerJoin("submissions", "submissions.id", "claims.submissionId")
      .innerJoin("campaigns", "campaigns.id", "claims.campaignId")
      .innerJoin("users as creator", "creator.id", "claims.creatorId")
      .leftJoin("users as admin", "admin.id", "claims.adminId")
      .select([
        "claims.id",
        "claims.submissionId",
        "claims.campaignId",
        "claims.creatorId",
        "claims.amount",
        "claims.status",
        "claims.adminNote",
        "claims.paymentReference",
        "claims.paidAt",
        "claims.createdAt",
        "claims.realName",
        "claims.phone",
        "claims.bankName",
        "claims.bankAccountNumber",
        "claims.bankAccountHolder",
        "submissions.sequenceNo",
        "submissions.title as submissionTitle",
        "campaigns.name as campaignName",
        "creator.displayName as creatorName",
        "admin.displayName as adminName",
      ]);
    if (user.role === "creator") query = query.where("claims.creatorId", "=", user.id);
    if (user.role === "owner") query = query.where("campaigns.ownerId", "=", user.id);
    if (input.status) query = query.where("claims.status", "=", input.status);
    if (input.campaignId) query = query.where("claims.campaignId", "=", input.campaignId);

    const rows = await query.orderBy("claims.createdAt", "desc").limit(300).execute();
    const claims: ClaimInfo[] = rows.map((r) => ({
      id: r.id,
      code: claimCode(r.id),
      submissionId: r.submissionId,
      submissionCode: submissionCode(r.sequenceNo),
      submissionTitle: r.submissionTitle,
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      creatorId: r.creatorId,
      creatorName: r.creatorName,
      amount: num(r.amount),
      status: r.status,
      adminNote: r.adminNote,
      adminName: r.adminName ?? null,
      paymentReference: r.paymentReference,
      paidAt: r.paidAt ? new Date(r.paidAt) : null,
      createdAt: new Date(r.createdAt),
      // Data pribadi hanya untuk Admin (pemroses pembayaran) dan creator pemilik claim.
      personal:
        user.role === "admin" || (user.role === "creator" && r.creatorId === user.id)
          ? {
              realName: r.realName,
              phone: r.phone,
              bankName: r.bankName,
              bankAccountNumber: r.bankAccountNumber,
              bankAccountHolder: r.bankAccountHolder,
            }
          : null,
    }));
    return jsonResponse({ claims } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}