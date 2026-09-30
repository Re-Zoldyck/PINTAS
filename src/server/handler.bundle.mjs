// src/helpers/db.tsx
import { Kysely, CamelCasePlugin, PostgresDialect } from "kysely";
import pg from "pg";

// src/helpers/schema.tsx
var UserRoleArrayValues = ["admin", "creator", "owner"];
var SocialPlatformArrayValues = ["facebook", "instagram", "tiktok", "x", "youtube"];
var CampaignPlatformArrayValues = ["any", "facebook", "instagram", "tiktok", "x", "youtube"];
var CampaignStatusArrayValues = ["active", "completed", "draft", "expired"];
var DuplicatePolicyArrayValues = ["fail", "need_review"];
var SubmissionStatusArrayValues = ["admin_approved", "admin_rejected", "ai_failed", "ai_passed", "ai_verifying", "claimable", "claimed", "disputed", "draft", "need_admin_review", "paid", "submitted"];
var DisputeStatusArrayValues = ["accepted", "pending", "rejected"];
var ClaimStatusArrayValues = ["paid", "pending", "rejected"];
var kyselyIdentifierOverrides = {};

// src/helpers/db.tsx
var PintasCamelCasePlugin = class extends CamelCasePlugin {
  snakeCase(str) {
    return kyselyIdentifierOverrides[str] ?? super.snakeCase(str);
  }
};
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diset (lihat .env.example)");
}
var isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
var db = new Kysely({
  plugins: [new PintasCamelCasePlugin()],
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 1e4,
      ssl: isLocal ? void 0 : { rejectUnauthorized: false }
    })
  })
});

// src/endpoints/admin/audit_logs_GET.schema.ts
import { z } from "zod";
import superjson from "superjson";
var schema = z.object({
  entityType: z.enum(["campaign", "submission", "claim", "dispute", "user", "participation"]).optional(),
  entityId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional()
});

// src/helpers/apiUtils.tsx
import superjson2 from "superjson";
import { ZodError } from "zod";

// src/helpers/getSetServerSession.tsx
import { jwtVerify, SignJWT } from "jose";
var encoder = new TextEncoder();
var secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET belum diset (lihat .env.example)");
}
var cookieSecure = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
var SessionExpirationSeconds = 60 * 60 * 24 * 7;
var CleanupProbability = 0.1;
var CookieName = "pintas_session";
var NotAuthenticatedError = class extends Error {
  constructor(message) {
    super(message ?? "Not authenticated");
    this.name = "NotAuthenticatedError";
  }
};
async function getServerSessionOrThrow(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").reduce((cookies2, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies2[name] = decodeURIComponent(value);
    }
    return cookies2;
  }, {});
  const sessionCookie = cookies[CookieName];
  if (!sessionCookie) {
    throw new NotAuthenticatedError();
  }
  try {
    const { payload } = await jwtVerify(sessionCookie, encoder.encode(secret));
    return {
      id: payload.id,
      createdAt: payload.createdAt,
      lastAccessed: payload.lastAccessed,
      passwordChangeRequired: payload.passwordChangeRequired
    };
  } catch (error) {
    throw new NotAuthenticatedError();
  }
}
async function setServerSession(response, session) {
  const token = await new SignJWT({
    id: session.id,
    createdAt: session.createdAt,
    lastAccessed: session.lastAccessed,
    passwordChangeRequired: session.passwordChangeRequired
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1d").sign(encoder.encode(secret));
  const cookieValue = [
    `${CookieName}=${token}`,
    "HttpOnly",
    ...cookieSecure ? ["Secure"] : [],
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SessionExpirationSeconds}`
  ].join("; ");
  response.headers.set("Set-Cookie", cookieValue);
}
function clearServerSession(response) {
  const cookieValue = [
    `${CookieName}=`,
    "HttpOnly",
    ...cookieSecure ? ["Secure"] : [],
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
    // Expire immediately
  ].join("; ");
  response.headers.set("Set-Cookie", cookieValue);
}

// src/helpers/getServerUserSession.tsx
async function getServerUserSession(request) {
  const session = await getServerSessionOrThrow(request);
  if (Math.random() < CleanupProbability) {
    const expirationDate = new Date(
      Date.now() - SessionExpirationSeconds * 1e3
    );
    try {
      await db.deleteFrom("sessions").where("lastAccessed", "<", expirationDate).execute();
    } catch (cleanupError) {
      console.error("Session cleanup error:", cleanupError);
    }
  }
  const results = await db.selectFrom("sessions").innerJoin("users", "sessions.userId", "users.id").select([
    "sessions.id as sessionId",
    "sessions.createdAt as sessionCreatedAt",
    "sessions.lastAccessed as sessionLastAccessed",
    "users.id",
    "users.email",
    "users.displayName",
    "users.role",
    "users.avatarUrl",
    "users.isActive"
  ]).where("sessions.id", "=", session.id).limit(1).execute();
  if (results.length === 0) {
    throw new NotAuthenticatedError();
  }
  const result = results[0];
  if (!result.isActive) {
    throw new NotAuthenticatedError("Akun dinonaktifkan");
  }
  const user = {
    id: result.id,
    email: result.email,
    displayName: result.displayName,
    avatarUrl: result.avatarUrl,
    role: result.role
  };
  const now = /* @__PURE__ */ new Date();
  await db.updateTable("sessions").set({ lastAccessed: now }).where("id", "=", session.id).execute();
  return {
    user,
    // make sure to update the session in cookie
    session: {
      ...session,
      lastAccessed: now
    }
  };
}

// src/helpers/apiUtils.tsx
var ApiError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
};
function jsonResponse(data, status = 200) {
  return new Response(superjson2.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function requireUser(request, roles) {
  let user;
  try {
    const session = await getServerUserSession(request);
    user = session.user;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      throw new ApiError("Sesi tidak valid, silakan login kembali", 401);
    }
    throw error;
  }
  if (roles && !roles.includes(user.role)) {
    throw new ApiError("Akses ditolak untuk peran ini", 403);
  }
  return user;
}
function handleApiError(error) {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  if (error instanceof ZodError) {
    const first = error.errors[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return jsonResponse({ error: `Input tidak valid \u2014 ${path}${first?.message ?? ""}` }, 400);
  }
  console.error("Unhandled API error:", error);
  return jsonResponse(
    { error: error instanceof Error ? error.message : "Terjadi kesalahan pada server" },
    500
  );
}
function num(value) {
  if (value === null || value === void 0) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
async function parseBody(request, parse) {
  const text = await request.text();
  const json = text ? superjson2.parse(text) : {};
  return parse(json);
}

// src/endpoints/admin/audit_logs_GET.ts
async function handle(request) {
  try {
    await requireUser(request, ["admin"]);
    const url = new URL(request.url);
    const entityIdRaw = url.searchParams.get("entityId");
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const input = schema.parse({
      entityType: url.searchParams.get("entityType") ?? void 0,
      entityId: entityIdRaw ? Number(entityIdRaw) : void 0,
      limit: limitRaw ? Number(limitRaw) : void 0,
      offset: offsetRaw ? Number(offsetRaw) : void 0
    });
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    let query = db.selectFrom("auditLogs").leftJoin("users as actor", "actor.id", "auditLogs.actorId").select([
      "auditLogs.id",
      "auditLogs.actorId",
      "actor.displayName as actorName",
      "auditLogs.actorRole",
      "auditLogs.entityType",
      "auditLogs.entityId",
      "auditLogs.action",
      "auditLogs.fromStatus",
      "auditLogs.toStatus",
      "auditLogs.detail",
      "auditLogs.createdAt"
    ]);
    let countQuery = db.selectFrom("auditLogs").select((eb) => eb.fn.countAll().as("c"));
    if (input.entityType) {
      query = query.where("auditLogs.entityType", "=", input.entityType);
      countQuery = countQuery.where("auditLogs.entityType", "=", input.entityType);
    }
    if (input.entityId) {
      query = query.where("auditLogs.entityId", "=", input.entityId);
      countQuery = countQuery.where("auditLogs.entityId", "=", input.entityId);
    }
    const [rows, count] = await Promise.all([
      query.orderBy("auditLogs.createdAt", "desc").limit(limit).offset(offset).execute(),
      countQuery.executeTakeFirst()
    ]);
    return jsonResponse({
      logs: rows.map((l) => ({ ...l, createdAt: new Date(l.createdAt) })),
      total: num(count?.c)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/admin/confirm_payment_POST.schema.ts
import { z as z2 } from "zod";
import superjson3 from "superjson";
var schema2 = z2.object({
  claimId: z2.number().int().positive(),
  decision: z2.enum(["paid", "reject"]),
  paymentReference: z2.string().trim().max(120).optional().nullable(),
  note: z2.string().trim().max(1e3).optional().nullable()
});

// src/helpers/auditLog.tsx
async function logAudit(trx, entry) {
  await trx.insertInto("auditLogs").values({
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus ?? null,
    detail: entry.detail ?? null
  }).execute();
}

// src/helpers/budgetLedger.tsx
async function allocateBudget(trx, campaignId, requested, actor) {
  const campaign = await trx.selectFrom("campaigns").select(["id", "budgetTotal", "budgetUsed", "budgetReserved", "status"]).where("id", "=", campaignId).forUpdate().executeTakeFirst();
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
  await trx.updateTable("campaigns").set({
    budgetReserved: newReserved,
    updatedAt: /* @__PURE__ */ new Date(),
    ...completeNow ? { status: "completed" } : {}
  }).where("id", "=", campaignId).execute();
  if (completeNow) {
    await logAudit(trx, {
      actorId: actor.id,
      actorRole: "system",
      entityType: "campaign",
      entityId: campaignId,
      action: "budget_exhausted",
      fromStatus: "active",
      toStatus: "completed",
      detail: { budgetTotal: total, budgetUsed: used, budgetReserved: newReserved }
    });
  }
  return {
    amount,
    requested: safeRequested,
    capped: amount < safeRequested,
    availableBefore: available,
    availableAfter: available - amount,
    campaignCompleted: completeNow
  };
}
async function settlePayment(trx, campaignId, amount) {
  const campaign = await trx.selectFrom("campaigns").select(["id", "budgetTotal", "budgetUsed", "budgetReserved"]).where("id", "=", campaignId).forUpdate().executeTakeFirst();
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
  await trx.updateTable("campaigns").set({ budgetUsed: newUsed, budgetReserved: newReserved, updatedAt: /* @__PURE__ */ new Date() }).where("id", "=", campaignId).execute();
  return { budgetUsed: newUsed, budgetReserved: newReserved, budgetTotal: total };
}

// src/helpers/realtimeNotify.tsx
async function notifyRealtime(_opts) {
  return;
}

// src/endpoints/admin/confirm_payment_POST.ts
async function handle2(request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema2.parse(j));
    const note = input.note?.trim() || null;
    const result = await db.transaction().execute(async (trx) => {
      const claim = await trx.selectFrom("claims").select(["id", "submissionId", "campaignId", "creatorId", "amount", "status"]).where("id", "=", input.claimId).forUpdate().executeTakeFirst();
      if (!claim) throw new ApiError("Claim tidak ditemukan", 404);
      if (claim.status !== "pending") throw new ApiError("Claim ini sudah diproses", 409);
      const submission = await trx.selectFrom("submissions").select(["id", "status", "approvedAmount"]).where("id", "=", claim.submissionId).forUpdate().executeTakeFirst();
      if (!submission) throw new ApiError("Submission tidak ditemukan", 404);
      if (submission.status !== "claimed") throw new ApiError("Submission tidak dalam status Claim Diajukan", 409);
      const campaign = await trx.selectFrom("campaigns").select(["ownerId"]).where("id", "=", claim.campaignId).executeTakeFirstOrThrow();
      const amount = num(claim.amount);
      const now = /* @__PURE__ */ new Date();
      if (input.decision === "paid") {
        const ledger = await settlePayment(trx, claim.campaignId, amount);
        await trx.updateTable("claims").set({ status: "paid", adminId: admin.id, adminNote: note, paymentReference: input.paymentReference?.trim() || null, paidAt: now }).where("id", "=", claim.id).execute();
        await trx.updateTable("submissions").set({ status: "paid", updatedAt: now }).where("id", "=", submission.id).execute();
        await logAudit(trx, {
          actorId: admin.id,
          actorRole: admin.role,
          entityType: "submission",
          entityId: submission.id,
          action: "payment_confirmed",
          fromStatus: "claimed",
          toStatus: "paid",
          detail: { claimId: claim.id, amount, paymentReference: input.paymentReference ?? null, budgetUsedAfter: ledger.budgetUsed, budgetReservedAfter: ledger.budgetReserved }
        });
        await logAudit(trx, {
          actorId: admin.id,
          actorRole: admin.role,
          entityType: "campaign",
          entityId: claim.campaignId,
          action: "payment_settled",
          detail: { claimId: claim.id, submissionId: submission.id, amount, budgetUsed: ledger.budgetUsed, budgetReserved: ledger.budgetReserved, budgetTotal: ledger.budgetTotal }
        });
        return { claim, submissionStatus: "paid", claimStatus: "paid", ownerId: campaign.ownerId, amount };
      }
      if (!note) throw new ApiError("Alasan penolakan claim wajib diisi", 400);
      await trx.updateTable("claims").set({ status: "rejected", adminId: admin.id, adminNote: note }).where("id", "=", claim.id).execute();
      await trx.updateTable("submissions").set({ status: "claimable", updatedAt: now }).where("id", "=", submission.id).execute();
      await logAudit(trx, {
        actorId: admin.id,
        actorRole: admin.role,
        entityType: "submission",
        entityId: submission.id,
        action: "claim_rejected",
        fromStatus: "claimed",
        toStatus: "claimable",
        detail: { claimId: claim.id, note }
      });
      return { claim, submissionStatus: "claimable", claimStatus: "rejected", ownerId: campaign.ownerId, amount };
    });
    await notifyRealtime({
      userIds: [result.claim.creatorId, result.ownerId],
      admins: true,
      event: { type: "payment", entityType: "submission", entityId: result.claim.submissionId }
    });
    return jsonResponse({
      claimId: result.claim.id,
      submissionId: result.claim.submissionId,
      claimStatus: result.claimStatus,
      submissionStatus: result.submissionStatus,
      amount: result.amount
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/admin/decide_dispute_POST.schema.ts
import { z as z3 } from "zod";
import superjson4 from "superjson";
var schema3 = z3.object({
  disputeId: z3.number().int().positive(),
  decision: z3.enum(["accept", "reject"]),
  note: z3.string().trim().min(3, "Catatan keputusan wajib diisi").max(1e3),
  verifiedViews: z3.number().int().nonnegative().optional().nullable()
});

// src/helpers/payout.tsx
function calculatePayout(rule, views) {
  const safeViews = Math.max(0, Math.floor(Number(views) || 0));
  const viewsPart = Math.floor(safeViews * Math.max(0, rule.ratePerThousandViews) / 1e3);
  let amount = Math.max(0, rule.feePerSubmission) + viewsPart;
  if (rule.maxPayoutPerSubmission > 0) {
    amount = Math.min(amount, rule.maxPayoutPerSubmission);
  }
  return Math.max(0, Math.floor(amount));
}

// src/helpers/pintasLabels.tsx
var platformLabel = {
  any: "Semua platform",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)"
};
var campaignCode = (id) => `CMP-${String(id).padStart(4, "0")}`;
var submissionCode = (sequenceNo) => `#${String(sequenceNo).padStart(3, "0")}`;
var claimCode = (id) => `CLM-${String(id).padStart(4, "0")}`;
var adminDecidableStatuses = [
  "ai_passed",
  "ai_failed",
  "need_admin_review",
  "disputed"
];

// src/helpers/submissionDecisions.tsx
async function loadForDecision(trx, submissionId) {
  const s = await trx.selectFrom("submissions").select(["id", "campaignId", "creatorId", "status", "viewsClaimed", "verifiedViews"]).where("id", "=", submissionId).forUpdate().executeTakeFirst();
  if (!s) throw new ApiError("Submission tidak ditemukan", 404);
  if (!adminDecidableStatuses.includes(s.status)) {
    throw new ApiError(`Submission berstatus "${s.status}" tidak dapat diputuskan lagi`, 409);
  }
  const c = await trx.selectFrom("campaigns").select(["id", "ownerId", "ratePerThousandViews", "feePerSubmission", "maxPayoutPerSubmission"]).where("id", "=", s.campaignId).executeTakeFirst();
  if (!c) throw new ApiError("Campaign tidak ditemukan", 404);
  return { s, c };
}
async function resolvePendingDispute(trx, submissionId, admin, status, note) {
  const pending = await trx.selectFrom("disputes").select("id").where("submissionId", "=", submissionId).where("status", "=", "pending").execute();
  for (const d of pending) {
    await trx.updateTable("disputes").set({ status, adminId: admin.id, adminNote: note, resolvedAt: /* @__PURE__ */ new Date() }).where("id", "=", d.id).execute();
    await logAudit(trx, {
      actorId: admin.id,
      actorRole: admin.role,
      entityType: "submission",
      entityId: submissionId,
      action: status === "accepted" ? "dispute_accepted" : "dispute_rejected",
      fromStatus: "pending",
      toStatus: status,
      detail: { disputeId: d.id, note }
    });
  }
}
async function approveSubmission(trx, opts) {
  const { s, c } = await loadForDecision(trx, opts.submissionId);
  const verifiedViews = Math.max(0, Math.floor(opts.verifiedViews ?? s.viewsClaimed));
  const calculated = calculatePayout(
    {
      ratePerThousandViews: num(c.ratePerThousandViews),
      feePerSubmission: num(c.feePerSubmission),
      maxPayoutPerSubmission: num(c.maxPayoutPerSubmission)
    },
    verifiedViews
  );
  const allocation = await allocateBudget(trx, c.id, calculated, { id: opts.admin.id, role: opts.admin.role });
  const now = /* @__PURE__ */ new Date();
  await trx.updateTable("submissions").set({
    status: "admin_approved",
    adminId: opts.admin.id,
    adminNote: opts.note,
    adminDecidedAt: now,
    verifiedViews,
    calculatedAmount: calculated,
    approvedAmount: allocation.amount,
    updatedAt: now
  }).where("id", "=", s.id).execute();
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
      budgetAvailableAfter: allocation.availableAfter
    }
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
    detail: { approvedAmount: allocation.amount }
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
    capped: allocation.capped
  };
}
async function rejectSubmission(trx, opts) {
  const { s, c } = await loadForDecision(trx, opts.submissionId);
  const now = /* @__PURE__ */ new Date();
  await trx.updateTable("submissions").set({ status: "admin_rejected", adminId: opts.admin.id, adminNote: opts.note, adminDecidedAt: now, updatedAt: now }).where("id", "=", s.id).execute();
  await logAudit(trx, {
    actorId: opts.admin.id,
    actorRole: opts.admin.role,
    entityType: "submission",
    entityId: s.id,
    action: opts.viaDispute ? "admin_rejected_via_dispute" : "admin_rejected",
    fromStatus: s.status,
    toStatus: "admin_rejected",
    detail: { note: opts.note }
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
    capped: false
  };
}

// src/endpoints/admin/decide_dispute_POST.ts
async function handle3(request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema3.parse(j));
    const result = await db.transaction().execute(async (trx) => {
      const dispute = await trx.selectFrom("disputes").select(["id", "submissionId", "status"]).where("id", "=", input.disputeId).forUpdate().executeTakeFirst();
      if (!dispute) throw new ApiError("Sanggahan tidak ditemukan", 404);
      if (dispute.status !== "pending") throw new ApiError("Sanggahan ini sudah diputuskan", 409);
      if (input.decision === "accept") {
        return approveSubmission(trx, {
          submissionId: dispute.submissionId,
          admin,
          note: input.note,
          verifiedViews: input.verifiedViews ?? null,
          viaDispute: true
        });
      }
      return rejectSubmission(trx, { submissionId: dispute.submissionId, admin, note: input.note, viaDispute: true });
    });
    await notifyRealtime({
      userIds: [result.creatorId, result.ownerId],
      admins: true,
      event: { type: "dispute", entityType: "submission", entityId: result.submissionId }
    });
    return jsonResponse({
      disputeId: input.disputeId,
      submissionId: result.submissionId,
      status: result.toStatus,
      approvedAmount: result.approvedAmount,
      capped: result.capped
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/admin/review_submission_POST.schema.ts
import { z as z4 } from "zod";
import superjson5 from "superjson";
var schema4 = z4.object({
  submissionId: z4.number().int().positive(),
  decision: z4.enum(["approve", "reject"]),
  note: z4.string().trim().max(1e3).optional().nullable(),
  verifiedViews: z4.number().int().nonnegative().optional().nullable()
});

// src/endpoints/admin/review_submission_POST.ts
async function handle4(request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema4.parse(j));
    const note = input.note?.trim() || null;
    const result = await db.transaction().execute(async (trx) => {
      if (input.decision === "approve") {
        return approveSubmission(trx, {
          submissionId: input.submissionId,
          admin,
          note,
          verifiedViews: input.verifiedViews ?? null
        });
      }
      if (!note) throw new ApiError("Alasan penolakan wajib diisi", 400);
      return rejectSubmission(trx, { submissionId: input.submissionId, admin, note });
    });
    await notifyRealtime({
      userIds: [result.creatorId, result.ownerId],
      admins: true,
      event: { type: "submission", entityType: "submission", entityId: result.submissionId }
    });
    return jsonResponse({
      submissionId: result.submissionId,
      status: result.toStatus,
      approvedAmount: result.approvedAmount,
      calculatedAmount: result.calculatedAmount,
      capped: result.capped
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/admin/update_user_POST.schema.ts
import { z as z5 } from "zod";
import superjson6 from "superjson";
var schema5 = z5.object({
  userId: z5.number().int().positive(),
  isActive: z5.boolean().optional(),
  role: z5.enum(UserRoleArrayValues).optional()
});

// src/endpoints/admin/update_user_POST.ts
async function handle5(request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema5.parse(j));
    if (input.userId === admin.id && (input.isActive === false || input.role && input.role !== "admin")) {
      throw new ApiError("Anda tidak dapat menonaktifkan atau mengubah peran akun sendiri", 400);
    }
    const updated = await db.transaction().execute(async (trx) => {
      const target = await trx.selectFrom("users").select(["id", "role", "isActive"]).where("id", "=", input.userId).forUpdate().executeTakeFirst();
      if (!target) throw new ApiError("Pengguna tidak ditemukan", 404);
      const nextActive = input.isActive ?? target.isActive;
      const nextRole = input.role ?? target.role;
      await trx.updateTable("users").set({ isActive: nextActive, role: nextRole, updatedAt: /* @__PURE__ */ new Date() }).where("id", "=", target.id).execute();
      if (!nextActive) {
        await trx.deleteFrom("sessions").where("userId", "=", target.id).execute();
      }
      await logAudit(trx, {
        actorId: admin.id,
        actorRole: admin.role,
        entityType: "user",
        entityId: target.id,
        action: "user_updated_by_admin",
        fromStatus: `${target.role}/${target.isActive ? "active" : "inactive"}`,
        toStatus: `${nextRole}/${nextActive ? "active" : "inactive"}`
      });
      return { userId: target.id, isActive: nextActive, role: nextRole };
    });
    return jsonResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/admin/users_GET.schema.ts
import { z as z6 } from "zod";
import superjson7 from "superjson";
var schema6 = z6.object({
  role: z6.enum(UserRoleArrayValues).optional(),
  q: z6.string().max(100).optional()
});

// src/endpoints/admin/users_GET.ts
async function handle6(request) {
  try {
    await requireUser(request, ["admin"]);
    const url = new URL(request.url);
    const input = schema6.parse({
      role: url.searchParams.get("role") ?? void 0,
      q: url.searchParams.get("q") ?? void 0
    });
    let query = db.selectFrom("users").select((eb) => [
      "users.id",
      "users.email",
      "users.displayName",
      "users.role",
      "users.isActive",
      "users.createdAt",
      eb.selectFrom("campaigns").select((seb) => seb.fn.countAll().as("c")).whereRef("campaigns.ownerId", "=", "users.id").as("campaignCount"),
      eb.selectFrom("submissions").select((seb) => seb.fn.countAll().as("c")).whereRef("submissions.creatorId", "=", "users.id").where("submissions.status", "<>", "draft").as("submissionCount"),
      eb.selectFrom("claims").select((seb) => seb.fn.coalesce(seb.fn.sum("claims.amount"), seb.val("0")).as("s")).whereRef("claims.creatorId", "=", "users.id").where("claims.status", "=", "paid").as("paidTotal")
    ]);
    if (input.role) query = query.where("users.role", "=", input.role);
    if (input.q) {
      const like = `%${input.q}%`;
      query = query.where((eb) => eb.or([eb("users.email", "ilike", like), eb("users.displayName", "ilike", like)]));
    }
    const rows = await query.orderBy("users.createdAt", "desc").limit(300).execute();
    return jsonResponse({
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.displayName,
        role: r.role,
        isActive: r.isActive,
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
        campaignCount: num(r.campaignCount),
        submissionCount: num(r.submissionCount),
        paidTotal: num(r.paidTotal)
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/auth/login_with_password_POST.ts
import { sql } from "kysely";

// src/endpoints/auth/login_with_password_POST.schema.ts
import { z as z7 } from "zod";
import superjson8 from "superjson";
var schema7 = z7.object({
  email: z7.string().email("Email is required"),
  password: z7.string().min(1, "Password is required")
});

// src/endpoints/auth/login_with_password_POST.ts
import { compare } from "bcryptjs";
import { randomBytes } from "crypto";
import superjson9 from "superjson";
var RATE_LIMIT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutWindowMinutes: 15,
  lockoutDurationMinutes: 15,
  cleanupProbability: 0.1
};
function safeToDate(value) {
  if (value === null || value === void 0) {
    return null;
  }
  if (typeof value === "bigint") {
    return new Date(Number(value));
  }
  return new Date(value);
}
async function handle7(request) {
  try {
    const json = superjson9.parse(await request.text());
    const { email, password } = schema7.parse(json);
    const normalizedEmail = email.toLowerCase();
    const now = /* @__PURE__ */ new Date();
    const windowStart = new Date(
      now.getTime() - RATE_LIMIT_CONFIG.lockoutWindowMinutes * 60 * 1e3
    );
    const result = await db.transaction().execute(async (trx) => {
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedEmail},0))`.execute(
        trx
      );
      const rateLimitQuery = await trx.selectFrom("loginAttempts").select([
        trx.fn.countAll().as("failedCount"),
        trx.fn.max(trx.dynamic.ref("attemptedAt")).as("lastFailedAt")
      ]).where("email", "=", normalizedEmail).where("success", "=", false).where("attemptedAt", ">=", windowStart).where("attemptedAt", "is not", null).executeTakeFirst();
      const { failedCount = 0, lastFailedAt = null } = rateLimitQuery || {};
      const safeLastFailedAt = safeToDate(lastFailedAt);
      if (rateLimitQuery && failedCount >= RATE_LIMIT_CONFIG.maxFailedAttempts && safeLastFailedAt) {
        const lockoutEnd = new Date(
          safeLastFailedAt.getTime() + RATE_LIMIT_CONFIG.lockoutDurationMinutes * 60 * 1e3
        );
        if (now < lockoutEnd) {
          const remainingMinutes = Math.ceil(
            (lockoutEnd.getTime() - now.getTime()) / (60 * 1e3)
          );
          return {
            type: "rate_limited",
            remainingMinutes
          };
        }
      }
      const userResults = await trx.selectFrom("users").innerJoin("userPasswords", "users.id", "userPasswords.userId").select([
        "users.id",
        "users.email",
        "users.displayName",
        "users.avatarUrl",
        "users.role",
        "userPasswords.passwordHash"
      ]).where(sql`LOWER(users.email)`, "=", normalizedEmail).limit(1).execute();
      if (userResults.length === 0) {
        await trx.insertInto("loginAttempts").values({
          email: normalizedEmail,
          attemptedAt: now,
          success: false
        }).execute();
        return {
          type: "auth_failed"
        };
      }
      const user2 = userResults[0];
      const passwordValid = await compare(password, user2.passwordHash);
      if (!passwordValid) {
        await trx.insertInto("loginAttempts").values({
          email: normalizedEmail,
          attemptedAt: now,
          success: false
        }).execute();
        return {
          type: "auth_failed"
        };
      }
      await trx.insertInto("loginAttempts").values({
        email: normalizedEmail,
        attemptedAt: now,
        success: true
      }).execute();
      const sessionId = randomBytes(32).toString("hex");
      const expiresAt = new Date(
        now.getTime() + SessionExpirationSeconds * 1e3
      );
      await trx.insertInto("sessions").values({
        id: sessionId,
        userId: user2.id,
        createdAt: now,
        lastAccessed: now,
        expiresAt
      }).execute();
      await trx.deleteFrom("loginAttempts").where("email", "=", normalizedEmail).where("success", "=", false).execute();
      return {
        type: "success",
        user: user2,
        sessionId,
        sessionCreatedAt: now
      };
    });
    if (Math.random() < RATE_LIMIT_CONFIG.cleanupProbability) {
      const cleanupBefore = new Date(
        now.getTime() - RATE_LIMIT_CONFIG.lockoutWindowMinutes * 60 * 1e3
      );
      try {
        const deleteResult = await db.deleteFrom("loginAttempts").where("attemptedAt", "<", cleanupBefore).where("attemptedAt", "is not", null).executeTakeFirst();
      } catch {
      }
    }
    if (result.type === "rate_limited") {
      return new Response(
        superjson9.stringify({
          message: `Too many failed login attempts. Account locked for ${result.remainingMinutes} more minutes.`
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    if (result.type === "auth_failed") {
      return new Response(
        superjson9.stringify({ message: "Invalid email or password" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    const user = result.user;
    const userData = {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
      role: user.role
    };
    const response = new Response(
      superjson9.stringify({
        user: userData
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    await setServerSession(response, {
      id: result.sessionId,
      createdAt: result.sessionCreatedAt.getTime(),
      lastAccessed: result.sessionCreatedAt.getTime()
    });
    return response;
  } catch (error) {
    return new Response(
      superjson9.stringify({ message: "Authentication failed" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// src/endpoints/auth/logout_POST.ts
import superjson10 from "superjson";
async function handle8(request) {
  try {
    const session = await getServerSessionOrThrow(request);
    await db.deleteFrom("sessions").where("id", "=", session.id).execute();
    const response = new Response(
      superjson10.stringify({
        success: true,
        message: "Logged out successfully"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    clearServerSession(response);
    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(
        superjson10.stringify({ error: "Not authenticated" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    console.error("Logout error:", error);
    return new Response(
      superjson10.stringify({
        error: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// src/endpoints/auth/register_with_password_POST.schema.ts
import { z as z8 } from "zod";
import superjson11 from "superjson";
var schema8 = z8.object({
  email: z8.string().email("Email tidak valid"),
  password: z8.string().min(8, "Password minimal 8 karakter"),
  displayName: z8.string().min(2, "Nama minimal 2 karakter").max(80),
  role: z8.enum(["owner", "creator"], {
    errorMap: () => ({ message: "Pilih peran: Owner atau Creator" })
  })
});

// src/endpoints/auth/register_with_password_POST.ts
import { randomBytes as randomBytes2 } from "crypto";

// src/helpers/generatePasswordHash.tsx
import { hash } from "bcryptjs";
async function generatePasswordHash(password) {
  const saltRounds = 10;
  const passwordHash = await hash(password, saltRounds);
  return passwordHash;
}

// src/endpoints/auth/register_with_password_POST.ts
import superjson12 from "superjson";
async function handle9(request) {
  try {
    const json = superjson12.parse(await request.text());
    const parsed = schema8.parse(json);
    const email = parsed.email.trim().toLowerCase();
    const displayName = parsed.displayName.trim();
    const role = parsed.role;
    const existingUser = await db.selectFrom("users").select("id").where("email", "=", email).limit(1).execute();
    if (existingUser.length > 0) {
      return new Response(
        superjson12.stringify({ message: "Email sudah terdaftar" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    const passwordHash = await generatePasswordHash(parsed.password);
    const newUser = await db.transaction().execute(async (trx) => {
      const [user] = await trx.insertInto("users").values({ email, displayName, role }).returning(["id", "email", "displayName", "avatarUrl", "role"]).execute();
      await trx.insertInto("userPasswords").values({ userId: user.id, passwordHash }).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: role,
        entityType: "user",
        entityId: user.id,
        action: "register",
        detail: { role }
      });
      return user;
    });
    const sessionId = randomBytes2(32).toString("hex");
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + SessionExpirationSeconds * 1e3);
    await db.insertInto("sessions").values({
      id: sessionId,
      userId: newUser.id,
      createdAt: now,
      lastAccessed: now,
      expiresAt
    }).execute();
    const response = new Response(
      superjson12.stringify({
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          avatarUrl: newUser.avatarUrl,
          role: newUser.role
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime()
    });
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Registrasi gagal";
    return new Response(superjson12.stringify({ message: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// src/endpoints/auth/session_GET.ts
import superjson13 from "superjson";
async function handle10(request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const response = new Response(
      superjson13.stringify({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    await setServerSession(response, {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime()
    });
    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(
        superjson13.stringify({ error: "Not authenticated" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    console.error("Session validation error:", error);
    return new Response(
      superjson13.stringify({ error: "Session validation failed" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// src/endpoints/campaigns/detail_GET.schema.ts
import { z as z9 } from "zod";
import superjson14 from "superjson";
var schema9 = z9.object({ id: z9.number().int().positive() });

// src/helpers/campaignQueries.tsx
import { sql as sql2 } from "kysely";
async function expireCampaigns(dbx) {
  const expired = await dbx.updateTable("campaigns").set({ status: "expired", updatedAt: /* @__PURE__ */ new Date() }).where("status", "=", "active").where("endDate", "<", sql2`CURRENT_DATE`).returning("id").execute();
  for (const row of expired) {
    await logAudit(dbx, {
      actorId: null,
      actorRole: "system",
      entityType: "campaign",
      entityId: row.id,
      action: "campaign_expired",
      fromStatus: "active",
      toStatus: "expired"
    });
  }
}
function campaignBaseQuery(dbx) {
  return dbx.selectFrom("campaigns").innerJoin("users as owner", "owner.id", "campaigns.ownerId").select((eb) => [
    "campaigns.id",
    "campaigns.name",
    "campaigns.description",
    "campaigns.ownerId",
    "owner.displayName as ownerName",
    "campaigns.status",
    "campaigns.startDate",
    "campaigns.endDate",
    "campaigns.target",
    "campaigns.targetViews",
    "campaigns.requiredPlatform",
    "campaigns.watermarkRequired",
    "campaigns.watermarkLogoUrl",
    "campaigns.minViews",
    "campaigns.duplicatePolicy",
    "campaigns.requiredCaption",
    "campaigns.requiredHashtags",
    "campaigns.editingRequirement",
    "campaigns.ratePerThousandViews",
    "campaigns.feePerSubmission",
    "campaigns.maxPayoutPerSubmission",
    "campaigns.budgetTotal",
    "campaigns.budgetUsed",
    "campaigns.budgetReserved",
    "campaigns.createdAt",
    "campaigns.updatedAt",
    eb.selectFrom("campaignParticipants").select(eb.fn.countAll().as("c")).whereRef("campaignParticipants.campaignId", "=", "campaigns.id").where("campaignParticipants.status", "=", "active").as("participantCount"),
    eb.selectFrom("submissions").select(eb.fn.countAll().as("c")).whereRef("submissions.campaignId", "=", "campaigns.id").where("submissions.status", "<>", "draft").as("submissionCount"),
    eb.selectFrom("submissions").select(eb.fn.countAll().as("c")).whereRef("submissions.campaignId", "=", "campaigns.id").where("submissions.status", "in", ["admin_approved", "claimable", "claimed", "paid"]).as("approvedCount"),
    eb.selectFrom("claims").select((seb) => seb.fn.coalesce(seb.fn.sum("claims.amount"), sql2`0`).as("s")).whereRef("claims.campaignId", "=", "campaigns.id").where("claims.status", "=", "paid").as("totalPaid")
  ]);
}
function toCampaignSummary(row, myParticipation = null) {
  return {
    id: row.id,
    code: campaignCode(row.id),
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    status: row.status,
    startDate: new Date(row.startDate),
    endDate: new Date(row.endDate),
    target: row.target,
    targetViews: row.targetViews,
    requiredPlatform: row.requiredPlatform,
    watermarkRequired: row.watermarkRequired,
    watermarkLogoUrl: row.watermarkLogoUrl,
    minViews: row.minViews,
    duplicatePolicy: row.duplicatePolicy,
    requiredCaption: row.requiredCaption,
    requiredHashtags: row.requiredHashtags ?? [],
    editingRequirement: row.editingRequirement,
    ratePerThousandViews: num(row.ratePerThousandViews),
    feePerSubmission: num(row.feePerSubmission),
    maxPayoutPerSubmission: num(row.maxPayoutPerSubmission),
    budgetTotal: num(row.budgetTotal),
    budgetUsed: num(row.budgetUsed),
    budgetReserved: num(row.budgetReserved),
    participantCount: num(row.participantCount),
    submissionCount: num(row.submissionCount),
    approvedCount: num(row.approvedCount),
    totalPaid: num(row.totalPaid),
    myParticipation,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

// src/helpers/submissionQueries.tsx
function submissionBaseQuery(dbx) {
  return dbx.selectFrom("submissions").innerJoin("campaigns", "campaigns.id", "submissions.campaignId").innerJoin("users as creator", "creator.id", "submissions.creatorId").select([
    "submissions.id",
    "submissions.campaignId",
    "campaigns.name as campaignName",
    "campaigns.ownerId as campaignOwnerId",
    "submissions.creatorId",
    "creator.displayName as creatorName",
    "submissions.sequenceNo",
    "submissions.title",
    "submissions.contentUrl",
    "submissions.platform",
    "submissions.accountHandle",
    "submissions.viewsClaimed",
    "submissions.verifiedViews",
    "submissions.status",
    "submissions.aiResult",
    "submissions.calculatedAmount",
    "submissions.approvedAmount",
    "submissions.proofScreenshotFilename",
    "submissions.submittedAt",
    "submissions.createdAt",
    "submissions.updatedAt"
  ]);
}
function toSubmissionSummary(row) {
  return {
    id: row.id,
    code: submissionCode(row.sequenceNo),
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    campaignOwnerId: row.campaignOwnerId,
    creatorId: row.creatorId,
    creatorName: row.creatorName,
    sequenceNo: row.sequenceNo,
    title: row.title,
    contentUrl: row.contentUrl,
    platform: row.platform,
    accountHandle: row.accountHandle,
    viewsClaimed: row.viewsClaimed,
    verifiedViews: row.verifiedViews,
    status: row.status,
    aiResult: row.aiResult,
    calculatedAmount: row.calculatedAmount === null ? null : num(row.calculatedAmount),
    approvedAmount: row.approvedAmount === null ? null : num(row.approvedAmount),
    hasProof: !!row.proofScreenshotFilename,
    submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

// src/endpoints/campaigns/detail_GET.ts
async function handle11(request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema9.parse({ id: Number(url.searchParams.get("id")) });
    await expireCampaigns(db);
    const row = await campaignBaseQuery(db).where("campaigns.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);
    let myParticipation = null;
    if (user.role === "creator") {
      const part = await db.selectFrom("campaignParticipants").select("status").where("campaignId", "=", input.id).where("creatorId", "=", user.id).executeTakeFirst();
      myParticipation = part?.status ?? null;
      if (row.status !== "active" && !myParticipation) {
        throw new ApiError("Campaign ini tidak tersedia", 404);
      }
    } else if (user.role === "owner" && row.ownerId !== user.id) {
      throw new ApiError("Campaign ini bukan milik Anda", 403);
    }
    let submissionQuery = submissionBaseQuery(db).where("submissions.campaignId", "=", input.id);
    if (user.role === "creator") {
      submissionQuery = submissionQuery.where("submissions.creatorId", "=", user.id);
    } else {
      submissionQuery = submissionQuery.where("submissions.status", "<>", "draft");
    }
    const submissionRows = await submissionQuery.orderBy("submissions.updatedAt", "desc").limit(300).execute();
    let participants = [];
    let activity = [];
    if (user.role !== "creator") {
      const partRows = await db.selectFrom("campaignParticipants").innerJoin("users", "users.id", "campaignParticipants.creatorId").select((eb) => [
        "campaignParticipants.creatorId",
        "users.displayName as creatorName",
        "campaignParticipants.status",
        "campaignParticipants.joinedAt",
        eb.selectFrom("submissions").select((seb) => seb.fn.countAll().as("c")).whereRef("submissions.creatorId", "=", "campaignParticipants.creatorId").whereRef("submissions.campaignId", "=", "campaignParticipants.campaignId").where("submissions.status", "<>", "draft").as("submissionCount"),
        eb.selectFrom("submissions").select((seb) => seb.fn.coalesce(seb.fn.sum("submissions.approvedAmount"), seb.val("0")).as("s")).whereRef("submissions.creatorId", "=", "campaignParticipants.creatorId").whereRef("submissions.campaignId", "=", "campaignParticipants.campaignId").where("submissions.status", "in", ["claimable", "claimed", "paid"]).as("approvedAmount")
      ]).where("campaignParticipants.campaignId", "=", input.id).orderBy("campaignParticipants.joinedAt", "desc").execute();
      participants = partRows.map((p) => ({
        creatorId: p.creatorId,
        creatorName: p.creatorName,
        status: p.status,
        joinedAt: new Date(p.joinedAt),
        submissionCount: num(p.submissionCount),
        approvedAmount: num(p.approvedAmount)
      }));
      const logs = await db.selectFrom("auditLogs").leftJoin("users as actor", "actor.id", "auditLogs.actorId").select([
        "auditLogs.id",
        "auditLogs.actorId",
        "actor.displayName as actorName",
        "auditLogs.actorRole",
        "auditLogs.entityType",
        "auditLogs.entityId",
        "auditLogs.action",
        "auditLogs.fromStatus",
        "auditLogs.toStatus",
        "auditLogs.detail",
        "auditLogs.createdAt"
      ]).where("auditLogs.entityType", "=", "campaign").where("auditLogs.entityId", "=", input.id).orderBy("auditLogs.createdAt", "desc").limit(30).execute();
      activity = logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
    }
    return jsonResponse({
      campaign: toCampaignSummary(row, myParticipation),
      submissions: submissionRows.map(toSubmissionSummary),
      participants,
      activity
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/campaigns/list_GET.schema.ts
import { z as z10 } from "zod";
import superjson15 from "superjson";
var schema10 = z10.object({
  scope: z10.enum(["available", "joined", "mine", "all"]).optional(),
  status: z10.enum(CampaignStatusArrayValues).optional(),
  q: z10.string().max(100).optional()
});

// src/endpoints/campaigns/list_GET.ts
async function handle12(request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema10.parse({
      scope: url.searchParams.get("scope") ?? void 0,
      status: url.searchParams.get("status") ?? void 0,
      q: url.searchParams.get("q") ?? void 0
    });
    await expireCampaigns(db);
    let query = campaignBaseQuery(db);
    if (user.role === "owner") {
      query = query.where("campaigns.ownerId", "=", user.id);
    } else if (user.role === "creator") {
      if (input.scope === "joined") {
        query = query.where(
          "campaigns.id",
          "in",
          (eb) => eb.selectFrom("campaignParticipants").select("campaignParticipants.campaignId").where("campaignParticipants.creatorId", "=", user.id)
        );
      } else {
        query = query.where("campaigns.status", "=", "active");
      }
    }
    if (input.status) query = query.where("campaigns.status", "=", input.status);
    if (input.q) query = query.where("campaigns.name", "ilike", `%${input.q}%`);
    const rows = await query.orderBy("campaigns.createdAt", "desc").limit(200).execute();
    const participation = /* @__PURE__ */ new Map();
    if (user.role === "creator" && rows.length > 0) {
      const parts = await db.selectFrom("campaignParticipants").select(["campaignId", "status"]).where("creatorId", "=", user.id).where("campaignId", "in", rows.map((r) => r.id)).execute();
      for (const p of parts) participation.set(p.campaignId, p.status);
    }
    return jsonResponse({
      campaigns: rows.map((r) => toCampaignSummary(r, participation.get(r.id) ?? null))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/campaigns/participation_POST.schema.ts
import { z as z11 } from "zod";
import superjson16 from "superjson";
var schema11 = z11.object({
  campaignId: z11.number().int().positive(),
  action: z11.enum(["join", "leave"])
});

// src/endpoints/campaigns/participation_POST.ts
async function handle13(request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema11.parse(j));
    const result = await db.transaction().execute(async (trx) => {
      const campaign = await trx.selectFrom("campaigns").select(["id", "status", "ownerId"]).where("id", "=", input.campaignId).executeTakeFirst();
      if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);
      const existing = await trx.selectFrom("campaignParticipants").select(["id", "status"]).where("campaignId", "=", input.campaignId).where("creatorId", "=", user.id).executeTakeFirst();
      if (input.action === "join") {
        if (campaign.status !== "active") throw new ApiError("Campaign ini tidak sedang aktif", 409);
        if (existing?.status === "active") return { status: "active", ownerId: campaign.ownerId };
        if (existing) {
          await trx.updateTable("campaignParticipants").set({ status: "active", stoppedAt: null, joinedAt: /* @__PURE__ */ new Date() }).where("id", "=", existing.id).execute();
        } else {
          await trx.insertInto("campaignParticipants").values({ campaignId: input.campaignId, creatorId: user.id, status: "active" }).execute();
        }
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: input.campaignId,
          action: existing ? "creator_rejoined" : "creator_joined",
          detail: { creatorId: user.id }
        });
        return { status: "active", ownerId: campaign.ownerId };
      }
      if (!existing || existing.status === "stopped") {
        return { status: "stopped", ownerId: campaign.ownerId };
      }
      await trx.updateTable("campaignParticipants").set({ status: "stopped", stoppedAt: /* @__PURE__ */ new Date() }).where("id", "=", existing.id).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "campaign",
        entityId: input.campaignId,
        action: "creator_stopped",
        detail: { creatorId: user.id }
      });
      return { status: "stopped", ownerId: campaign.ownerId };
    });
    await notifyRealtime({ userIds: [result.ownerId, user.id], event: { type: "participation", entityId: input.campaignId } });
    return jsonResponse({ campaignId: input.campaignId, status: result.status });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/campaigns/save_POST.schema.ts
import { z as z12 } from "zod";
import superjson17 from "superjson";
var MIN_CAMPAIGN_BUDGET = 4e6;
var dateString = z12.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
var schema12 = z12.object({
  id: z12.number().int().positive().optional(),
  name: z12.string().trim().min(3, "Nama campaign minimal 3 karakter").max(120),
  description: z12.string().trim().min(10, "Deskripsi minimal 10 karakter").max(4e3),
  budgetTotal: z12.number().int().min(MIN_CAMPAIGN_BUDGET, "Budget minimum campaign adalah Rp4.000.000"),
  startDate: dateString,
  endDate: dateString,
  target: z12.string().trim().min(3, "Target campaign wajib diisi").max(500),
  targetViews: z12.number().int().nonnegative().optional().nullable(),
  requiredPlatform: z12.enum(CampaignPlatformArrayValues),
  watermarkRequired: z12.boolean(),
  watermarkLogoUrl: z12.string().optional().nullable(),
  watermarkLogoFilename: z12.string().optional().nullable(),
  minViews: z12.number().int().nonnegative(),
  duplicatePolicy: z12.enum(DuplicatePolicyArrayValues),
  requiredCaption: z12.string().trim().max(500).optional().nullable(),
  requiredHashtags: z12.array(z12.string().trim().min(1).max(60)).max(20),
  editingRequirement: z12.string().trim().max(1e3).optional().nullable(),
  ratePerThousandViews: z12.number().int().nonnegative(),
  feePerSubmission: z12.number().int().nonnegative(),
  maxPayoutPerSubmission: z12.number().int().nonnegative(),
  publish: z12.boolean().default(false)
});

// src/helpers/contentFingerprint.tsx
var HOST_PLATFORM = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/^youtu\.be$/, "youtube"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/^fb\.watch$/, "facebook"],
  [/(^|\.)x\.com$/, "x"],
  [/(^|\.)twitter\.com$/, "x"]
];
function normalizeHandle(handle27) {
  return (handle27 ?? "").trim().replace(/^@+/, "").toLowerCase();
}
function analyzeContentUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, fingerprint: rawUrl.trim().toLowerCase(), platform: null, handle: null, host: "" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, fingerprint: rawUrl.trim().toLowerCase(), platform: null, handle: null, host: url.hostname };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "").replace(/^vm\./, "").replace(/^vt\./, "");
  let platform = null;
  for (const [re, p] of HOST_PLATFORM) {
    if (re.test(host)) {
      platform = p;
      break;
    }
  }
  let path = url.pathname.replace(/\/+$/, "").toLowerCase();
  let fingerprint = `${host}${path}`;
  let handle27 = null;
  const segments = path.split("/").filter(Boolean);
  if (platform === "youtube") {
    const v = url.searchParams.get("v");
    if (host === "youtu.be" && segments[0]) {
      fingerprint = `youtube.com/watch/${segments[0]}`;
    } else if (v) {
      fingerprint = `youtube.com/watch/${v.toLowerCase()}`;
    } else if (segments[0] === "shorts" && segments[1]) {
      fingerprint = `youtube.com/watch/${segments[1]}`;
    }
    const at = segments.find((s) => s.startsWith("@"));
    if (at) handle27 = normalizeHandle(at);
  } else if (platform === "tiktok") {
    const at = segments.find((s) => s.startsWith("@"));
    if (at) handle27 = normalizeHandle(at);
    const videoIdx = segments.indexOf("video");
    if (videoIdx >= 0 && segments[videoIdx + 1]) {
      fingerprint = `tiktok.com/video/${segments[videoIdx + 1]}`;
    }
  } else if (platform === "x") {
    const statusIdx = segments.indexOf("status");
    if (statusIdx >= 1) {
      handle27 = normalizeHandle(segments[statusIdx - 1]);
      if (segments[statusIdx + 1]) fingerprint = `x.com/status/${segments[statusIdx + 1]}`;
    }
  } else if (platform === "instagram") {
    const kindIdx = segments.findIndex((s) => s === "reel" || s === "p" || s === "reels");
    if (kindIdx >= 0 && segments[kindIdx + 1]) {
      fingerprint = `instagram.com/media/${segments[kindIdx + 1]}`;
      if (kindIdx >= 1) handle27 = normalizeHandle(segments[kindIdx - 1]);
    }
  } else if (platform === "facebook") {
    if (segments[0] === "reel" && segments[1]) {
      fingerprint = `facebook.com/reel/${segments[1]}`;
    } else if (segments.includes("videos")) {
      const idx = segments.indexOf("videos");
      if (idx >= 1) handle27 = normalizeHandle(segments[idx - 1]);
      const id = segments[idx + 1];
      if (id) fingerprint = `facebook.com/videos/${id}`;
    }
  }
  return { ok: true, fingerprint, platform, handle: handle27, host };
}
function extractHashtags(text) {
  const found = /* @__PURE__ */ new Set();
  const re = /#([\p{L}\p{N}_]+)/gu;
  let m;
  while ((m = re.exec(text)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found);
}
function normalizeHashtag(tag) {
  return tag.trim().replace(/^#+/, "").toLowerCase();
}

// src/endpoints/campaigns/save_POST.ts
function validateForPublish(input) {
  if (input.watermarkRequired && !input.watermarkLogoUrl) {
    throw new ApiError("Campaign yang mewajibkan watermark harus menyertakan file logo PNG", 400);
  }
  if (input.ratePerThousandViews <= 0 && input.feePerSubmission <= 0) {
    throw new ApiError("Aturan pembayaran harus memiliki tarif per 1.000 views atau fee per submission", 400);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (input.endDate < today) {
    throw new ApiError("Tanggal berakhir campaign sudah lewat", 400);
  }
}
async function handle14(request) {
  try {
    const user = await requireUser(request, ["owner"]);
    const input = await parseBody(request, (j) => schema12.parse(j));
    if (input.endDate < input.startDate) {
      throw new ApiError("Tanggal berakhir harus setelah tanggal mulai", 400);
    }
    const hashtags = Array.from(new Set(input.requiredHashtags.map(normalizeHashtag).filter(Boolean)));
    if (input.publish) validateForPublish(input);
    const campaignId = await db.transaction().execute(async (trx) => {
      if (input.id) {
        const existing = await trx.selectFrom("campaigns").select(["id", "ownerId", "status", "budgetTotal"]).where("id", "=", input.id).forUpdate().executeTakeFirst();
        if (!existing) throw new ApiError("Campaign tidak ditemukan", 404);
        if (existing.ownerId !== user.id) throw new ApiError("Campaign ini bukan milik Anda", 403);
        if (existing.status === "draft") {
          const newStatus = input.publish ? "active" : "draft";
          await trx.updateTable("campaigns").set({
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
            updatedAt: /* @__PURE__ */ new Date()
          }).where("id", "=", existing.id).execute();
          await logAudit(trx, {
            actorId: user.id,
            actorRole: user.role,
            entityType: "campaign",
            entityId: existing.id,
            action: input.publish ? "campaign_published" : "campaign_updated",
            fromStatus: "draft",
            toStatus: newStatus
          });
        } else {
          await trx.updateTable("campaigns").set({
            name: input.name,
            description: input.description,
            target: input.target,
            targetViews: input.targetViews ?? null,
            endDate: input.endDate,
            editingRequirement: input.editingRequirement || null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where("id", "=", existing.id).execute();
          await logAudit(trx, {
            actorId: user.id,
            actorRole: user.role,
            entityType: "campaign",
            entityId: existing.id,
            action: "campaign_updated",
            fromStatus: existing.status,
            toStatus: existing.status,
            detail: { note: "Perubahan terbatas (nama, deskripsi, target, tanggal berakhir)" }
          });
        }
        return existing.id;
      }
      const status = input.publish ? "active" : "draft";
      const [created] = await trx.insertInto("campaigns").values({
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
        status
      }).returning("id").execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "campaign",
        entityId: created.id,
        action: input.publish ? "campaign_created_active" : "campaign_created_draft",
        fromStatus: null,
        toStatus: status,
        detail: { budgetTotal: input.budgetTotal }
      });
      return created.id;
    });
    const row = await campaignBaseQuery(db).where("campaigns.id", "=", campaignId).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);
    await notifyRealtime({ userIds: [user.id], admins: true, event: { type: "campaign", entityId: campaignId } });
    return jsonResponse({ campaign: toCampaignSummary(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/campaigns/status_POST.schema.ts
import { z as z13 } from "zod";
import superjson18 from "superjson";
var schema13 = z13.object({
  id: z13.number().int().positive(),
  action: z13.enum(["activate", "complete", "add_budget"]),
  amount: z13.number().int().positive().optional()
});

// src/endpoints/campaigns/status_POST.ts
async function handle15(request) {
  try {
    const user = await requireUser(request, ["owner", "admin"]);
    const input = await parseBody(request, (j) => schema13.parse(j));
    const ownerId = await db.transaction().execute(async (trx) => {
      const c = await trx.selectFrom("campaigns").selectAll().where("id", "=", input.id).forUpdate().executeTakeFirst();
      if (!c) throw new ApiError("Campaign tidak ditemukan", 404);
      if (user.role === "owner" && c.ownerId !== user.id) {
        throw new ApiError("Campaign ini bukan milik Anda", 403);
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const endDate = new Date(c.endDate).toISOString().slice(0, 10);
      if (input.action === "activate") {
        if (user.role !== "owner") throw new ApiError("Hanya Owner yang dapat mengaktifkan campaign", 403);
        if (c.status !== "draft") throw new ApiError("Hanya campaign berstatus Draft yang dapat diaktifkan", 409);
        if (c.watermarkRequired && !c.watermarkLogoUrl) throw new ApiError("Unggah logo watermark PNG sebelum mengaktifkan campaign", 400);
        if (num(c.ratePerThousandViews) <= 0 && num(c.feePerSubmission) <= 0) throw new ApiError("Lengkapi aturan pembayaran sebelum mengaktifkan campaign", 400);
        if (endDate < today) throw new ApiError("Tanggal berakhir campaign sudah lewat; perbarui periode terlebih dahulu", 400);
        await trx.updateTable("campaigns").set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where("id", "=", c.id).execute();
        await logAudit(trx, { actorId: user.id, actorRole: user.role, entityType: "campaign", entityId: c.id, action: "campaign_published", fromStatus: "draft", toStatus: "active" });
      } else if (input.action === "complete") {
        if (c.status !== "active") throw new ApiError("Hanya campaign aktif yang dapat diselesaikan", 409);
        await trx.updateTable("campaigns").set({ status: "completed", updatedAt: /* @__PURE__ */ new Date() }).where("id", "=", c.id).execute();
        await logAudit(trx, { actorId: user.id, actorRole: user.role, entityType: "campaign", entityId: c.id, action: "campaign_completed", fromStatus: "active", toStatus: "completed" });
      } else if (input.action === "add_budget") {
        if (user.role !== "owner") throw new ApiError("Hanya Owner yang dapat menambah budget", 403);
        if (!input.amount || input.amount <= 0) throw new ApiError("Nominal tambahan budget wajib diisi", 400);
        if (c.status === "expired") throw new ApiError("Campaign sudah berakhir; perpanjang periode terlebih dahulu", 409);
        const newTotal = num(c.budgetTotal) + input.amount;
        const reactivate = c.status === "completed" && endDate >= today;
        await trx.updateTable("campaigns").set({ budgetTotal: newTotal, updatedAt: /* @__PURE__ */ new Date(), ...reactivate ? { status: "active" } : {} }).where("id", "=", c.id).execute();
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: c.id,
          action: "budget_added",
          fromStatus: c.status,
          toStatus: reactivate ? "active" : c.status,
          detail: { amount: input.amount, budgetTotalBefore: num(c.budgetTotal), budgetTotalAfter: newTotal }
        });
      }
      return c.ownerId;
    });
    const row = await campaignBaseQuery(db).where("campaigns.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Campaign tidak ditemukan", 404);
    await notifyRealtime({ userIds: [ownerId], admins: true, event: { type: "campaign", entityId: input.id } });
    return jsonResponse({ campaign: toCampaignSummary(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/claims/create_POST.schema.ts
import { z as z14 } from "zod";
import superjson19 from "superjson";
var schema14 = z14.object({
  submissionId: z14.number().int().positive(),
  realName: z14.string().trim().min(3, "Nama asli minimal 3 karakter").max(120),
  phone: z14.string().trim().regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid (contoh: 08123456789)"),
  bankName: z14.string().trim().min(2, "Nama bank wajib diisi").max(60),
  bankAccountNumber: z14.string().trim().regex(/^[0-9]{6,20}$/, "Nomor rekening harus 6-20 digit angka"),
  bankAccountHolder: z14.string().trim().min(3, "Nama pemilik rekening wajib diisi").max(120)
});

// src/endpoints/claims/create_POST.ts
async function handle16(request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema14.parse(j));
    const result = await db.transaction().execute(async (trx) => {
      const s = await trx.selectFrom("submissions").select(["id", "creatorId", "campaignId", "status", "approvedAmount"]).where("id", "=", input.submissionId).forUpdate().executeTakeFirst();
      if (!s || s.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
      if (s.status !== "claimable") {
        throw new ApiError(
          s.status === "claimed" || s.status === "paid" ? "Submission ini sudah pernah di-claim" : "Submission belum dapat di-claim (butuh persetujuan Admin)",
          409
        );
      }
      const amount = num(s.approvedAmount);
      if (amount <= 0) throw new ApiError("Nominal pembayaran untuk submission ini adalah Rp0", 409);
      const active = await trx.selectFrom("claims").select("id").where("submissionId", "=", s.id).where("status", "<>", "rejected").executeTakeFirst();
      if (active) throw new ApiError("Claim untuk submission ini sudah ada", 409);
      const [claim] = await trx.insertInto("claims").values({
        submissionId: s.id,
        campaignId: s.campaignId,
        creatorId: user.id,
        amount,
        realName: input.realName,
        phone: input.phone,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountHolder: input.bankAccountHolder,
        status: "pending"
      }).returning("id").execute();
      const now = /* @__PURE__ */ new Date();
      await trx.updateTable("submissions").set({ status: "claimed", updatedAt: now }).where("id", "=", s.id).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: s.id,
        action: "claim_submitted",
        fromStatus: "claimable",
        toStatus: "claimed",
        detail: { claimId: claim.id, amount }
      });
      const campaign = await trx.selectFrom("campaigns").select("ownerId").where("id", "=", s.campaignId).executeTakeFirstOrThrow();
      return { claimId: claim.id, submissionId: s.id, amount, ownerId: campaign.ownerId };
    });
    await notifyRealtime({
      userIds: [user.id, result.ownerId],
      admins: true,
      event: { type: "claim", entityType: "submission", entityId: result.submissionId }
    });
    return jsonResponse({ claimId: result.claimId, submissionId: result.submissionId, amount: result.amount, status: "claimed" });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/claims/list_GET.schema.ts
import { z as z15 } from "zod";
import superjson20 from "superjson";
var schema15 = z15.object({
  status: z15.enum(ClaimStatusArrayValues).optional(),
  campaignId: z15.number().int().positive().optional()
});

// src/endpoints/claims/list_GET.ts
async function handle17(request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const campaignIdRaw = url.searchParams.get("campaignId");
    const input = schema15.parse({
      status: url.searchParams.get("status") ?? void 0,
      campaignId: campaignIdRaw ? Number(campaignIdRaw) : void 0
    });
    let query = db.selectFrom("claims").innerJoin("submissions", "submissions.id", "claims.submissionId").innerJoin("campaigns", "campaigns.id", "claims.campaignId").innerJoin("users as creator", "creator.id", "claims.creatorId").leftJoin("users as admin", "admin.id", "claims.adminId").select([
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
      "admin.displayName as adminName"
    ]);
    if (user.role === "creator") query = query.where("claims.creatorId", "=", user.id);
    if (user.role === "owner") query = query.where("campaigns.ownerId", "=", user.id);
    if (input.status) query = query.where("claims.status", "=", input.status);
    if (input.campaignId) query = query.where("claims.campaignId", "=", input.campaignId);
    const rows = await query.orderBy("claims.createdAt", "desc").limit(300).execute();
    const claims = rows.map((r) => ({
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
      personal: user.role === "admin" || user.role === "creator" && r.creatorId === user.id ? {
        realName: r.realName,
        phone: r.phone,
        bankName: r.bankName,
        bankAccountNumber: r.bankAccountNumber,
        bankAccountHolder: r.bankAccountHolder
      } : null
    }));
    return jsonResponse({ claims });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/dashboard/summary_GET.ts
import { sql as sql3 } from "kysely";
async function claimsFor(where, includePersonal, limit = 8) {
  const rows = await where(baseClaims()).orderBy("claims.createdAt", "desc").limit(limit).execute();
  return rows.map((r) => ({
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
    personal: includePersonal ? { realName: r.realName, phone: r.phone, bankName: r.bankName, bankAccountNumber: r.bankAccountNumber, bankAccountHolder: r.bankAccountHolder } : null
  }));
}
function baseClaims() {
  return db.selectFrom("claims").innerJoin("submissions", "submissions.id", "claims.submissionId").innerJoin("campaigns", "campaigns.id", "claims.campaignId").innerJoin("users as creator", "creator.id", "claims.creatorId").leftJoin("users as admin", "admin.id", "claims.adminId").select([
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
    "admin.displayName as adminName"
  ]);
}
async function handle18(request) {
  try {
    const user = await requireUser(request);
    await expireCampaigns(db);
    if (user.role === "owner") {
      const campaignRows = await campaignBaseQuery(db).where("campaigns.ownerId", "=", user.id).orderBy("campaigns.createdAt", "desc").execute();
      const campaigns = campaignRows.map((r) => toCampaignSummary(r));
      const totalBudget = campaigns.reduce((a, c) => a + c.budgetTotal, 0);
      const totalUsed = campaigns.reduce((a, c) => a + c.budgetUsed, 0);
      const totalReserved = campaigns.reduce((a, c) => a + c.budgetReserved, 0);
      const subStats2 = await db.selectFrom("submissions").innerJoin("campaigns", "campaigns.id", "submissions.campaignId").select((eb) => [
        eb.fn.countAll().as("total"),
        sql3`count(*) filter (where submissions.status in ('submitted','ai_verifying','ai_passed','ai_failed','need_admin_review','disputed'))`.as("pending"),
        sql3`count(*) filter (where submissions.status in ('admin_approved','claimable','claimed','paid'))`.as("approved"),
        sql3`count(*) filter (where submissions.status = 'admin_rejected')`.as("rejected")
      ]).where("campaigns.ownerId", "=", user.id).where("submissions.status", "<>", "draft").executeTakeFirst();
      const creators = await db.selectFrom("campaignParticipants").innerJoin("campaigns", "campaigns.id", "campaignParticipants.campaignId").select(sql3`count(distinct campaign_participants.creator_id)`.as("c")).where("campaigns.ownerId", "=", user.id).executeTakeFirst();
      const payments = await db.selectFrom("claims").innerJoin("campaigns", "campaigns.id", "claims.campaignId").select([
        sql3`coalesce(sum(claims.amount) filter (where claims.status = 'paid'), 0)`.as("paid"),
        sql3`coalesce(sum(claims.amount) filter (where claims.status = 'pending'), 0)`.as("pending")
      ]).where("campaigns.ownerId", "=", user.id).executeTakeFirst();
      const recent = await submissionBaseQuery(db).where("campaigns.ownerId", "=", user.id).where("submissions.status", "<>", "draft").orderBy("submissions.updatedAt", "desc").limit(8).execute();
      return jsonResponse({
        role: "owner",
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalBudget,
        totalUsed,
        totalReserved,
        totalRemaining: Math.max(0, totalBudget - totalUsed - totalReserved),
        pctUsed: totalBudget > 0 ? Math.round((totalUsed + totalReserved) / totalBudget * 1e3) / 10 : 0,
        totalCreators: num(creators?.c),
        totalSubmissions: num(subStats2?.total),
        pendingSubmissions: num(subStats2?.pending),
        approvedSubmissions: num(subStats2?.approved),
        rejectedSubmissions: num(subStats2?.rejected),
        totalPayments: num(payments?.paid),
        pendingPayments: num(payments?.pending),
        campaigns,
        recentSubmissions: recent.map(toSubmissionSummary)
      });
    }
    if (user.role === "creator") {
      const available = await db.selectFrom("campaigns").select((eb) => eb.fn.countAll().as("c")).where("status", "=", "active").executeTakeFirst();
      const joinedRows = await campaignBaseQuery(db).where(
        "campaigns.id",
        "in",
        (eb) => eb.selectFrom("campaignParticipants").select("campaignParticipants.campaignId").where("campaignParticipants.creatorId", "=", user.id)
      ).orderBy("campaigns.createdAt", "desc").limit(12).execute();
      const parts = await db.selectFrom("campaignParticipants").select(["campaignId", "status"]).where("creatorId", "=", user.id).execute();
      const partMap = new Map(parts.map((p) => [p.campaignId, p.status]));
      const stats = await db.selectFrom("submissions").select([
        sql3`count(*) filter (where status <> 'draft')`.as("total"),
        sql3`count(*) filter (where status in ('submitted','ai_verifying','ai_passed','ai_failed','need_admin_review','disputed'))`.as("pending"),
        sql3`count(*) filter (where status in ('admin_approved','claimable','claimed','paid'))`.as("approved"),
        sql3`count(*) filter (where status = 'admin_rejected')`.as("rejected"),
        sql3`count(*) filter (where status = 'claimable')`.as("claimableCount"),
        sql3`coalesce(sum(approved_amount) filter (where status = 'claimable'), 0)`.as("claimableAmount"),
        sql3`coalesce(sum(approved_amount) filter (where status in ('claimable','claimed','paid')), 0)`.as("earning"),
        sql3`coalesce(sum(approved_amount) filter (where status in ('claimed','paid')), 0)`.as("claimed"),
        sql3`coalesce(sum(approved_amount) filter (where status = 'paid'), 0)`.as("paid"),
        sql3`coalesce(sum(approved_amount) filter (where status = 'claimed'), 0)`.as("awaiting")
      ]).where("creatorId", "=", user.id).executeTakeFirst();
      const recent = await submissionBaseQuery(db).where("submissions.creatorId", "=", user.id).orderBy("submissions.updatedAt", "desc").limit(8).execute();
      const recentClaims2 = await claimsFor((q) => q.where("claims.creatorId", "=", user.id), true, 6);
      return jsonResponse({
        role: "creator",
        availableCampaigns: num(available?.c),
        joinedCampaigns: parts.filter((p) => p.status === "active").length,
        totalSubmissions: num(stats?.total),
        pendingSubmissions: num(stats?.pending),
        approvedSubmissions: num(stats?.approved),
        rejectedSubmissions: num(stats?.rejected),
        claimableCount: num(stats?.claimableCount),
        claimableAmount: num(stats?.claimableAmount),
        totalEarning: num(stats?.earning),
        totalClaimed: num(stats?.claimed),
        totalPaid: num(stats?.paid),
        awaitingPayment: num(stats?.awaiting),
        recentSubmissions: recent.map(toSubmissionSummary),
        joined: joinedRows.map((r) => toCampaignSummary(r, partMap.get(r.id) ?? null)),
        recentClaims: recentClaims2
      });
    }
    const subStats = await db.selectFrom("submissions").select([
      sql3`count(*) filter (where status in ('submitted','ai_verifying'))`.as("pendingAi"),
      sql3`count(*) filter (where status = 'need_admin_review')`.as("needReview"),
      sql3`count(*) filter (where status in ('ai_passed','ai_failed'))`.as("awaiting"),
      sql3`count(*) filter (where status = 'claimable')`.as("claimPending")
    ]).executeTakeFirst();
    const disputeStats = await db.selectFrom("disputes").select((eb) => eb.fn.countAll().as("c")).where("status", "=", "pending").executeTakeFirst();
    const claimStats = await db.selectFrom("claims").select([
      sql3`count(*) filter (where status = 'pending')`.as("pendingCount"),
      sql3`coalesce(sum(amount) filter (where status = 'pending'), 0)`.as("pendingAmount")
    ]).executeTakeFirst();
    const campaignStats = await db.selectFrom("campaigns").select([
      sql3`count(*) filter (where status = 'active')`.as("active"),
      sql3`coalesce(sum(budget_total) filter (where status = 'active'), 0)`.as("budget"),
      sql3`coalesce(sum(budget_used) filter (where status = 'active'), 0)`.as("used"),
      sql3`coalesce(sum(budget_reserved) filter (where status = 'active'), 0)`.as("reserved")
    ]).executeTakeFirst();
    const userStats = await db.selectFrom("users").select([
      sql3`count(*)`.as("total"),
      sql3`count(*) filter (where role = 'creator')`.as("creators"),
      sql3`count(*) filter (where role = 'owner')`.as("owners")
    ]).executeTakeFirst();
    const queue = await submissionBaseQuery(db).where("submissions.status", "in", ["need_admin_review", "disputed", "ai_passed", "ai_failed"]).orderBy("submissions.submittedAt", "asc").limit(10).execute();
    const disputeRows = await db.selectFrom("disputes").innerJoin("submissions", "submissions.id", "disputes.submissionId").innerJoin("campaigns", "campaigns.id", "submissions.campaignId").innerJoin("users as creator", "creator.id", "disputes.creatorId").select([
      "disputes.id",
      "disputes.submissionId",
      "disputes.creatorId",
      "disputes.reason",
      "disputes.status",
      "disputes.adminNote",
      "disputes.createdAt",
      "disputes.resolvedAt",
      "submissions.sequenceNo",
      "submissions.title as submissionTitle",
      "submissions.status as submissionStatus",
      "submissions.aiSummary",
      "campaigns.id as campaignId",
      "campaigns.name as campaignName",
      "creator.displayName as creatorName"
    ]).where("disputes.status", "=", "pending").orderBy("disputes.createdAt", "asc").limit(6).execute();
    const recentClaims = await claimsFor((q) => q.where("claims.status", "=", "pending"), true, 6);
    return jsonResponse({
      role: "admin",
      pendingAi: num(subStats?.pendingAi),
      needReview: num(subStats?.needReview),
      awaitingConfirmation: num(subStats?.awaiting),
      disputesPending: num(disputeStats?.c),
      claimPending: num(subStats?.claimPending),
      paymentPending: num(claimStats?.pendingCount),
      paymentPendingAmount: num(claimStats?.pendingAmount),
      activeCampaigns: num(campaignStats?.active),
      runningBudget: num(campaignStats?.budget),
      runningUsed: num(campaignStats?.used),
      runningReserved: num(campaignStats?.reserved),
      totalUsers: num(userStats?.total),
      totalCreators: num(userStats?.creators),
      totalOwners: num(userStats?.owners),
      queue: queue.map(toSubmissionSummary),
      recentDisputes: disputeRows.map((r) => ({
        id: r.id,
        submissionId: r.submissionId,
        creatorId: r.creatorId,
        reason: r.reason,
        evidenceUrl: null,
        status: r.status,
        adminNote: r.adminNote,
        adminName: null,
        createdAt: new Date(r.createdAt),
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
        submissionCode: submissionCode(r.sequenceNo),
        submissionTitle: r.submissionTitle,
        submissionStatus: r.submissionStatus,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        creatorName: r.creatorName,
        aiSummary: r.aiSummary
      })),
      recentClaims
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/disputes/create_POST.schema.ts
import { z as z16 } from "zod";
import superjson21 from "superjson";
var schema16 = z16.object({
  submissionId: z16.number().int().positive(),
  reason: z16.string().trim().min(10, "Jelaskan alasan sanggahan minimal 10 karakter").max(2e3),
  evidenceFilename: z16.string().max(300).optional().nullable()
});

// src/endpoints/disputes/create_POST.ts
async function handle19(request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema16.parse(j));
    const result = await db.transaction().execute(async (trx) => {
      const s = await trx.selectFrom("submissions").select(["id", "creatorId", "status", "campaignId"]).where("id", "=", input.submissionId).forUpdate().executeTakeFirst();
      if (!s || s.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
      if (s.status !== "ai_failed") {
        throw new ApiError("Sanggahan hanya dapat diajukan untuk submission dengan hasil AI FAILED", 409);
      }
      const existing = await trx.selectFrom("disputes").select("id").where("submissionId", "=", s.id).where("status", "=", "pending").executeTakeFirst();
      if (existing) throw new ApiError("Sanggahan untuk submission ini sedang diperiksa", 409);
      const [dispute] = await trx.insertInto("disputes").values({
        submissionId: s.id,
        creatorId: user.id,
        reason: input.reason,
        evidenceFilename: input.evidenceFilename || null
      }).returning("id").execute();
      const now = /* @__PURE__ */ new Date();
      await trx.updateTable("submissions").set({ status: "disputed", updatedAt: now }).where("id", "=", s.id).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: s.id,
        action: "dispute_submitted",
        fromStatus: "ai_failed",
        toStatus: "disputed",
        detail: { disputeId: dispute.id, hasEvidence: !!input.evidenceFilename }
      });
      const campaign = await trx.selectFrom("campaigns").select("ownerId").where("id", "=", s.campaignId).executeTakeFirstOrThrow();
      return { disputeId: dispute.id, submissionId: s.id, ownerId: campaign.ownerId };
    });
    await notifyRealtime({
      userIds: [user.id, result.ownerId],
      admins: true,
      event: { type: "dispute", entityType: "submission", entityId: result.submissionId }
    });
    return jsonResponse({ disputeId: result.disputeId, submissionId: result.submissionId, status: "disputed" });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/disputes/list_GET.schema.ts
import { z as z17 } from "zod";
import superjson22 from "superjson";
var schema17 = z17.object({
  status: z17.enum(DisputeStatusArrayValues).optional()
});

// src/endpoints/disputes/list_GET.ts
async function handle20(request) {
  try {
    const user = await requireUser(request, ["creator", "admin", "owner"]);
    const url = new URL(request.url);
    const input = schema17.parse({ status: url.searchParams.get("status") ?? void 0 });
    let query = db.selectFrom("disputes").innerJoin("submissions", "submissions.id", "disputes.submissionId").innerJoin("campaigns", "campaigns.id", "submissions.campaignId").innerJoin("users as creator", "creator.id", "disputes.creatorId").leftJoin("users as admin", "admin.id", "disputes.adminId").select([
      "disputes.id",
      "disputes.submissionId",
      "disputes.creatorId",
      "disputes.reason",
      "disputes.status",
      "disputes.adminNote",
      "admin.displayName as adminName",
      "disputes.createdAt",
      "disputes.resolvedAt",
      "submissions.sequenceNo",
      "submissions.title as submissionTitle",
      "submissions.status as submissionStatus",
      "submissions.aiSummary",
      "campaigns.id as campaignId",
      "campaigns.name as campaignName",
      "creator.displayName as creatorName"
    ]);
    if (user.role === "creator") query = query.where("disputes.creatorId", "=", user.id);
    if (user.role === "owner") query = query.where("campaigns.ownerId", "=", user.id);
    if (input.status) query = query.where("disputes.status", "=", input.status);
    const rows = await query.orderBy("disputes.createdAt", "desc").limit(200).execute();
    const disputes = rows.map((r) => ({
      id: r.id,
      submissionId: r.submissionId,
      creatorId: r.creatorId,
      reason: r.reason,
      evidenceUrl: null,
      status: r.status,
      adminNote: r.adminNote,
      adminName: r.adminName ?? null,
      createdAt: new Date(r.createdAt),
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
      submissionCode: submissionCode(r.sequenceNo),
      submissionTitle: r.submissionTitle,
      submissionStatus: r.submissionStatus,
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      creatorName: r.creatorName,
      aiSummary: r.aiSummary
    }));
    return jsonResponse({ disputes });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/profile/me_GET.ts
async function handle21(request) {
  try {
    const sessionUser = await requireUser(request);
    const user = await db.selectFrom("users").select(["id", "email", "displayName", "avatarUrl", "role", "bio", "createdAt"]).where("id", "=", sessionUser.id).executeTakeFirst();
    if (!user) throw new ApiError("Pengguna tidak ditemukan", 404);
    const socialAccounts = await db.selectFrom("creatorSocialAccounts").select(["platform", "handle"]).where("userId", "=", user.id).orderBy("platform").execute();
    return jsonResponse({
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt ? new Date(user.createdAt) : null,
        socialAccounts
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/profile/update_POST.schema.ts
import { z as z18 } from "zod";
import superjson23 from "superjson";
var schema18 = z18.object({
  displayName: z18.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  bio: z18.string().trim().max(500).optional().nullable(),
  socialAccounts: z18.array(
    z18.object({
      platform: z18.enum(SocialPlatformArrayValues),
      handle: z18.string().trim().min(1, "Handle wajib diisi").max(80)
    })
  ).max(5)
});

// src/endpoints/profile/update_POST.ts
async function handle22(request) {
  try {
    const sessionUser = await requireUser(request);
    const input = await parseBody(request, (j) => schema18.parse(j));
    const seen = /* @__PURE__ */ new Set();
    const accounts = input.socialAccounts.map((a) => ({ platform: a.platform, handle: normalizeHandle(a.handle) })).filter((a) => a.handle.length > 0);
    for (const a of accounts) {
      if (seen.has(a.platform)) throw new ApiError("Setiap platform hanya boleh satu akun", 400);
      seen.add(a.platform);
    }
    const updated = await db.transaction().execute(async (trx) => {
      const [user] = await trx.updateTable("users").set({
        displayName: input.displayName,
        bio: input.bio ?? null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where("id", "=", sessionUser.id).returning(["id", "email", "displayName", "avatarUrl", "role", "bio", "createdAt"]).execute();
      await trx.deleteFrom("creatorSocialAccounts").where("userId", "=", sessionUser.id).execute();
      if (accounts.length > 0) {
        await trx.insertInto("creatorSocialAccounts").values(accounts.map((a) => ({ userId: sessionUser.id, platform: a.platform, handle: a.handle }))).execute();
      }
      await logAudit(trx, {
        actorId: sessionUser.id,
        actorRole: sessionUser.role,
        entityType: "user",
        entityId: sessionUser.id,
        action: "profile_updated",
        detail: { socialAccounts: accounts.map((a) => `${a.platform}:@${a.handle}`) }
      });
      return user;
    });
    return jsonResponse({
      profile: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        bio: updated.bio,
        createdAt: updated.createdAt ? new Date(updated.createdAt) : null,
        socialAccounts: accounts
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/submissions/detail_GET.schema.ts
import { z as z19 } from "zod";
import superjson24 from "superjson";
var schema19 = z19.object({ id: z19.number().int().positive() });

// src/helpers/storageUrls.tsx
async function privateFileUrl(filename, _expiresInSeconds = 3600) {
  if (!filename) return null;
  return filename;
}

// src/endpoints/submissions/detail_GET.ts
async function handle23(request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema19.parse({ id: Number(url.searchParams.get("id")) });
    const row = await submissionBaseQuery(db).where("submissions.id", "=", input.id).executeTakeFirst();
    if (!row) throw new ApiError("Submission tidak ditemukan", 404);
    const isCreatorOwner = user.role === "creator" && row.creatorId === user.id;
    const isCampaignOwner = user.role === "owner" && row.campaignOwnerId === user.id;
    const isAdmin = user.role === "admin";
    if (!isCreatorOwner && !isCampaignOwner && !isAdmin) {
      throw new ApiError("Anda tidak memiliki akses ke submission ini", 403);
    }
    if (!isCreatorOwner && row.status === "draft") {
      throw new ApiError("Submission masih berupa draft", 404);
    }
    const full = await db.selectFrom("submissions").leftJoin("users as admin", "admin.id", "submissions.adminId").select([
      "submissions.caption",
      "submissions.hashtags",
      "submissions.watermarkApplied",
      "submissions.editingConfirmed",
      "submissions.creatorNotes",
      "submissions.aiChecks",
      "submissions.aiSummary",
      "submissions.aiVerifiedAt",
      "submissions.adminNote",
      "submissions.adminDecidedAt",
      "submissions.proofScreenshotFilename",
      "admin.displayName as adminName"
    ]).where("submissions.id", "=", input.id).executeTakeFirstOrThrow();
    const campaignRow = await campaignBaseQuery(db).where("campaigns.id", "=", row.campaignId).executeTakeFirstOrThrow();
    const campaign = toCampaignSummary(campaignRow);
    const disputeRow = await db.selectFrom("disputes").leftJoin("users as admin", "admin.id", "disputes.adminId").select([
      "disputes.id",
      "disputes.submissionId",
      "disputes.creatorId",
      "disputes.reason",
      "disputes.evidenceFilename",
      "disputes.status",
      "disputes.adminNote",
      "admin.displayName as adminName",
      "disputes.createdAt",
      "disputes.resolvedAt"
    ]).where("disputes.submissionId", "=", input.id).orderBy("disputes.createdAt", "desc").executeTakeFirst();
    const claimRow = await db.selectFrom("claims").leftJoin("users as admin", "admin.id", "claims.adminId").selectAll("claims").select("admin.displayName as adminName").where("claims.submissionId", "=", input.id).orderBy("claims.createdAt", "desc").executeTakeFirst();
    const logs = await db.selectFrom("auditLogs").leftJoin("users as actor", "actor.id", "auditLogs.actorId").select([
      "auditLogs.id",
      "auditLogs.actorId",
      "actor.displayName as actorName",
      "auditLogs.actorRole",
      "auditLogs.entityType",
      "auditLogs.entityId",
      "auditLogs.action",
      "auditLogs.fromStatus",
      "auditLogs.toStatus",
      "auditLogs.detail",
      "auditLogs.createdAt"
    ]).where("auditLogs.entityType", "=", "submission").where("auditLogs.entityId", "=", input.id).orderBy("auditLogs.createdAt", "asc").execute();
    const dispute = disputeRow ? {
      id: disputeRow.id,
      submissionId: disputeRow.submissionId,
      creatorId: disputeRow.creatorId,
      reason: disputeRow.reason,
      evidenceUrl: await privateFileUrl(disputeRow.evidenceFilename),
      status: disputeRow.status,
      adminNote: disputeRow.adminNote,
      adminName: disputeRow.adminName ?? null,
      createdAt: new Date(disputeRow.createdAt),
      resolvedAt: disputeRow.resolvedAt ? new Date(disputeRow.resolvedAt) : null
    } : null;
    const claim = claimRow ? {
      id: claimRow.id,
      code: claimCode(claimRow.id),
      submissionId: claimRow.submissionId,
      submissionCode: submissionCode(row.sequenceNo),
      submissionTitle: row.title,
      campaignId: claimRow.campaignId,
      campaignName: row.campaignName,
      creatorId: claimRow.creatorId,
      creatorName: row.creatorName,
      amount: num(claimRow.amount),
      status: claimRow.status,
      adminNote: claimRow.adminNote,
      adminName: claimRow.adminName ?? null,
      paymentReference: claimRow.paymentReference,
      paidAt: claimRow.paidAt ? new Date(claimRow.paidAt) : null,
      createdAt: new Date(claimRow.createdAt),
      personal: isAdmin || isCreatorOwner ? {
        realName: claimRow.realName,
        phone: claimRow.phone,
        bankName: claimRow.bankName,
        bankAccountNumber: claimRow.bankAccountNumber,
        bankAccountHolder: claimRow.bankAccountHolder
      } : null
    } : null;
    const history = logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
    const summary = toSubmissionSummary(row);
    const estimatedPayout = calculatePayout(
      {
        ratePerThousandViews: campaign.ratePerThousandViews,
        feePerSubmission: campaign.feePerSubmission,
        maxPayoutPerSubmission: campaign.maxPayoutPerSubmission
      },
      row.verifiedViews ?? row.viewsClaimed
    );
    return jsonResponse({
      submission: {
        ...summary,
        caption: full.caption,
        hashtags: full.hashtags ?? [],
        watermarkApplied: full.watermarkApplied,
        editingConfirmed: full.editingConfirmed,
        creatorNotes: full.creatorNotes,
        aiChecks: full.aiChecks ?? null,
        aiSummary: full.aiSummary,
        aiVerifiedAt: full.aiVerifiedAt ? new Date(full.aiVerifiedAt) : null,
        adminNote: full.adminNote,
        adminName: full.adminName ?? null,
        adminDecidedAt: full.adminDecidedAt ? new Date(full.adminDecidedAt) : null,
        proofScreenshotUrl: await privateFileUrl(full.proofScreenshotFilename),
        proofScreenshotFilename: full.proofScreenshotFilename,
        campaign,
        dispute,
        claim,
        history,
        estimatedPayout
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/submissions/list_GET.schema.ts
import { z as z20 } from "zod";
import superjson25 from "superjson";
var schema20 = z20.object({
  campaignId: z20.number().int().positive().optional(),
  status: z20.enum(SubmissionStatusArrayValues).optional(),
  group: z20.enum(["pending", "review", "confirm", "claimable", "all"]).optional()
});

// src/endpoints/submissions/list_GET.ts
var GROUPS = {
  pending: ["submitted", "ai_verifying", "ai_passed", "ai_failed", "need_admin_review", "disputed"],
  review: ["need_admin_review", "disputed"],
  confirm: ["ai_passed", "ai_failed", "need_admin_review", "disputed"],
  claimable: ["claimable", "claimed"]
};
async function handle24(request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const campaignIdRaw = url.searchParams.get("campaignId");
    const input = schema20.parse({
      campaignId: campaignIdRaw ? Number(campaignIdRaw) : void 0,
      status: url.searchParams.get("status") ?? void 0,
      group: url.searchParams.get("group") ?? void 0
    });
    let query = submissionBaseQuery(db);
    if (user.role === "creator") {
      query = query.where("submissions.creatorId", "=", user.id);
    } else if (user.role === "owner") {
      query = query.where("campaigns.ownerId", "=", user.id).where("submissions.status", "<>", "draft");
    } else {
      query = query.where("submissions.status", "<>", "draft");
    }
    if (input.campaignId) query = query.where("submissions.campaignId", "=", input.campaignId);
    if (input.status) query = query.where("submissions.status", "=", input.status);
    if (input.group && input.group !== "all" && GROUPS[input.group]) {
      query = query.where("submissions.status", "in", GROUPS[input.group]);
    }
    const rows = await query.orderBy("submissions.updatedAt", "desc").limit(300).execute();
    return jsonResponse({ submissions: rows.map(toSubmissionSummary) });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/submissions/save_POST.ts
import { sql as sql4 } from "kysely";

// src/endpoints/submissions/save_POST.schema.ts
import { z as z21 } from "zod";
import superjson26 from "superjson";
var schema21 = z21.object({
  id: z21.number().int().positive().optional(),
  campaignId: z21.number().int().positive(),
  title: z21.string().trim().min(3, "Judul konten minimal 3 karakter").max(150),
  contentUrl: z21.string().trim().url("URL konten tidak valid").max(500),
  platform: z21.enum(SocialPlatformArrayValues),
  accountHandle: z21.string().trim().min(1, "Akun/handle wajib diisi").max(80),
  caption: z21.string().trim().max(3e3).default(""),
  hashtags: z21.array(z21.string().trim().min(1).max(60)).max(30).default([]),
  viewsClaimed: z21.number().int().nonnegative().default(0),
  proofScreenshotFilename: z21.string().max(300).optional().nullable(),
  watermarkApplied: z21.boolean().default(false),
  editingConfirmed: z21.boolean().default(false),
  creatorNotes: z21.string().trim().max(1e3).optional().nullable(),
  action: z21.enum(["save_draft", "submit"])
});

// src/helpers/aiVerification.tsx
var IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
var SUSPICIOUS_VIEWS = 5e6;
async function runAiVerification(dbx, submissionId) {
  const s = await dbx.selectFrom("submissions").selectAll().where("id", "=", submissionId).executeTakeFirst();
  if (!s) throw new ApiError("Submission tidak ditemukan", 404);
  const c = await dbx.selectFrom("campaigns").selectAll().where("id", "=", s.campaignId).executeTakeFirst();
  if (!c) throw new ApiError("Campaign tidak ditemukan", 404);
  const accounts = await dbx.selectFrom("creatorSocialAccounts").select(["platform", "handle"]).where("userId", "=", s.creatorId).execute();
  const registered = /* @__PURE__ */ new Map();
  for (const a of accounts) registered.set(a.platform, normalizeHandle(a.handle));
  const duplicates = await dbx.selectFrom("submissions").select(["id", "campaignId", "creatorId", "sequenceNo", "viewsClaimed", "status", "createdAt"]).where("contentFingerprint", "=", s.contentFingerprint).where("id", "<>", s.id).where("status", "<>", "draft").orderBy("createdAt", "asc").execute();
  const checks = [];
  const urlInfo = analyzeContentUrl(s.contentUrl);
  const handle27 = normalizeHandle(s.accountHandle);
  if (!urlInfo.ok) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: "URL konten tidak valid (harus diawali http:// atau https://)." });
  } else if (c.requiredPlatform !== "any" && s.platform !== c.requiredPlatform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: `Campaign mewajibkan ${platformLabel[c.requiredPlatform]}, submission memakai ${platformLabel[s.platform]}.` });
  } else if (urlInfo.platform && urlInfo.platform !== s.platform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: `Domain URL (${urlInfo.host}) adalah ${platformLabel[urlInfo.platform]}, tidak sesuai platform yang dipilih (${platformLabel[s.platform]}).` });
  } else if (!urlInfo.platform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "review", detail: `Domain ${urlInfo.host || "URL"} tidak dikenali sebagai platform yang didukung. Admin perlu memeriksa tautan secara manual.` });
  } else {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "pass", detail: `URL berasal dari ${platformLabel[urlInfo.platform]} dan sesuai ketentuan campaign.` });
  }
  const registeredHandle = registered.get(s.platform);
  if (!handle27) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: "Akun/handle pada submission kosong." });
  } else if (!registeredHandle) {
    checks.push({ key: "account", label: "Akun creator", status: "review", detail: `Akun @${handle27} belum terdaftar di profil creator untuk ${platformLabel[s.platform]}. Admin perlu memastikan kepemilikan akun.` });
  } else if (registeredHandle !== handle27) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: `Akun pada submission (@${handle27}) berbeda dengan akun terdaftar di profil (@${registeredHandle}).` });
  } else if (urlInfo.handle && urlInfo.handle !== handle27) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: `Handle pada URL (@${urlInfo.handle}) berbeda dengan akun submission (@${handle27}).` });
  } else {
    checks.push({ key: "account", label: "Akun creator", status: "pass", detail: `Akun @${handle27} cocok dengan akun ${platformLabel[s.platform]} yang terdaftar di profil.` });
  }
  if (!c.watermarkRequired) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "skip", detail: "Campaign tidak mewajibkan watermark." });
  } else if (!s.watermarkApplied) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "fail", detail: "Campaign mewajibkan watermark logo, tetapi creator menyatakan konten tanpa watermark." });
  } else if (!s.proofScreenshotFilename) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "review", detail: "Watermark dinyatakan ada, tetapi tidak ada screenshot bukti untuk memastikan logo yang dipakai benar." });
  } else {
    checks.push({ key: "watermark", label: "Watermark logo", status: "pass", detail: "Watermark dinyatakan ada dan bukti screenshot terlampir. Kecocokan dengan logo resmi campaign dikonfirmasi Admin secara visual." });
  }
  const views = s.viewsClaimed;
  if (c.minViews > 0 && views < c.minViews) {
    checks.push({ key: "views", label: "Ketentuan views", status: "fail", detail: `Views yang diklaim (${views.toLocaleString("id-ID")}) di bawah minimum campaign (${c.minViews.toLocaleString("id-ID")}).` });
  } else if (views > 0 && !s.proofScreenshotFilename) {
    checks.push({ key: "views", label: "Ketentuan views", status: "review", detail: `Views diklaim ${views.toLocaleString("id-ID")} tanpa screenshot bukti. Views tanpa bukti tidak dapat dijadikan dasar pembayaran.` });
  } else if (views > 0) {
    checks.push({ key: "views", label: "Ketentuan views", status: "pass", detail: `Views ${views.toLocaleString("id-ID")} dinyatakan sesuai screenshot bukti yang dilampirkan${c.minViews > 0 ? ` (minimum ${c.minViews.toLocaleString("id-ID")})` : ""}.` });
  } else {
    checks.push({ key: "views", label: "Ketentuan views", status: "pass", detail: "Tidak ada views yang diklaim; pembayaran hanya memakai komponen tetap per submission (jika ada)." });
  }
  const sameOwnCampaign = duplicates.find((d) => d.creatorId === s.creatorId && d.campaignId === s.campaignId);
  const other = duplicates[0];
  if (sameOwnCampaign) {
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status: "fail", detail: `Konten dengan URL yang sama sudah pernah kamu submit di campaign ini (submission ${submissionCode(sameOwnCampaign.sequenceNo)}).` });
  } else if (other) {
    const where = other.creatorId === s.creatorId ? "di campaign lain oleh akun yang sama" : "oleh creator lain";
    const status = c.duplicatePolicy === "fail" ? "fail" : "review";
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status, detail: `Konten dengan URL yang sama pernah disubmit ${where} (ID submission ${other.id}). Sesuai aturan campaign ditandai ${status === "fail" ? "FAIL" : "NEED REVIEW"}.` });
  } else {
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status: "pass", detail: "Tidak ditemukan submission lain dengan konten yang sama." });
  }
  const captionKeywords = (c.requiredCaption ?? "").split(/[,;|\n]/).map((k) => k.trim()).filter(Boolean);
  if (captionKeywords.length === 0) {
    checks.push({ key: "caption", label: "Caption", status: "skip", detail: "Campaign tidak menetapkan ketentuan caption." });
  } else {
    const captionLower = s.caption.toLowerCase();
    const missing = captionKeywords.filter((k) => !captionLower.includes(k.toLowerCase()));
    if (missing.length > 0) {
      checks.push({ key: "caption", label: "Caption", status: "fail", detail: `Caption tidak memuat kata/kalimat wajib: ${missing.map((m) => `"${m}"`).join(", ")}.` });
    } else {
      checks.push({ key: "caption", label: "Caption", status: "pass", detail: `Caption memuat semua kata/kalimat wajib (${captionKeywords.length}).` });
    }
  }
  const requiredTags = c.requiredHashtags.map(normalizeHashtag).filter(Boolean);
  if (requiredTags.length === 0) {
    checks.push({ key: "hashtags", label: "Hashtag", status: "skip", detail: "Campaign tidak menetapkan hashtag wajib." });
  } else {
    const present = /* @__PURE__ */ new Set([
      ...s.hashtags.map(normalizeHashtag),
      ...extractHashtags(s.caption)
    ]);
    const missingTags = requiredTags.filter((t) => !present.has(t));
    if (missingTags.length > 0) {
      checks.push({ key: "hashtags", label: "Hashtag", status: "fail", detail: `Hashtag wajib tidak ditemukan: ${missingTags.map((t) => "#" + t).join(" ")}.` });
    } else {
      checks.push({ key: "hashtags", label: "Hashtag", status: "pass", detail: `Semua hashtag wajib ada (${requiredTags.map((t) => "#" + t).join(" ")}).` });
    }
  }
  if (!c.editingRequirement) {
    checks.push({ key: "editing", label: "Requirement editing", status: "skip", detail: "Campaign tidak menetapkan requirement editing khusus." });
  } else if (!s.editingConfirmed) {
    checks.push({ key: "editing", label: "Requirement editing", status: "fail", detail: "Creator belum mengonfirmasi bahwa konten memenuhi requirement editing campaign." });
  } else {
    checks.push({ key: "editing", label: "Requirement editing", status: "pass", detail: "Creator mengonfirmasi requirement editing terpenuhi; Admin memastikan secara visual saat konfirmasi." });
  }
  const needsProof = c.watermarkRequired || c.minViews > 0 || views > 0;
  if (s.proofScreenshotFilename) {
    if (!IMAGE_EXT.test(s.proofScreenshotFilename)) {
      checks.push({ key: "proof", label: "Validitas bukti", status: "fail", detail: "File bukti bukan berkas gambar (screenshot)." });
    } else {
      checks.push({ key: "proof", label: "Validitas bukti", status: "pass", detail: "Screenshot bukti terlampir dalam format gambar yang valid." });
    }
  } else if (needsProof) {
    checks.push({ key: "proof", label: "Validitas bukti", status: "review", detail: "Screenshot bukti tidak dilampirkan padahal campaign memerlukan bukti (views/watermark)." });
  } else {
    checks.push({ key: "proof", label: "Validitas bukti", status: "pass", detail: "Bukti minimal (URL konten) tersedia; campaign tidak mensyaratkan screenshot." });
  }
  const manipulationFlags = [];
  if (views >= SUSPICIOUS_VIEWS) {
    manipulationFlags.push(`angka views sangat tinggi (${views.toLocaleString("id-ID")})`);
  }
  const earlierHigher = duplicates.find((d) => d.viewsClaimed > views);
  if (earlierHigher) {
    manipulationFlags.push(`views lebih rendah dari submission sebelumnya untuk konten yang sama (${earlierHigher.viewsClaimed.toLocaleString("id-ID")})`);
  }
  if (c.minViews > 0 && views >= c.minViews && views < c.minViews * 1.02 && views !== c.minViews) {
    manipulationFlags.push("angka views tepat di ambang minimum campaign");
  }
  if (manipulationFlags.length > 0) {
    checks.push({ key: "manipulation", label: "Indikasi manipulasi bukti", status: "review", detail: `Perlu verifikasi manual: ${manipulationFlags.join("; ")}.` });
  } else {
    checks.push({ key: "manipulation", label: "Indikasi manipulasi bukti", status: "pass", detail: "Tidak ditemukan indikasi manipulasi pada data submission." });
  }
  const fails = checks.filter((x) => x.status === "fail").length;
  const reviews = checks.filter((x) => x.status === "review").length;
  const passes = checks.filter((x) => x.status === "pass").length;
  const skips = checks.filter((x) => x.status === "skip").length;
  let result;
  let summary;
  if (fails > 0) {
    result = "fail";
    summary = `FAIL \u2014 ${fails} requirement tidak terpenuhi, ${reviews} perlu review, ${passes} lolos${skips ? `, ${skips} tidak berlaku` : ""}. Creator dapat mengajukan sanggahan.`;
  } else if (reviews > 0) {
    result = "need_review";
    summary = `NEED REVIEW \u2014 ${passes} lolos, ${reviews} perlu pemeriksaan manual Admin${skips ? `, ${skips} tidak berlaku` : ""}.`;
  } else {
    result = "pass";
    summary = `PASS \u2014 ${passes} pemeriksaan lolos${skips ? `, ${skips} tidak berlaku` : ""}. Menunggu konfirmasi akhir Admin.`;
  }
  return { result, checks, summary };
}

// src/endpoints/submissions/save_POST.ts
var AI_STATUS = {
  pass: "ai_passed",
  fail: "ai_failed",
  need_review: "need_admin_review"
};
async function handle25(request) {
  try {
    const user = await requireUser(request, ["creator"]);
    const input = await parseBody(request, (j) => schema21.parse(j));
    const urlInfo = analyzeContentUrl(input.contentUrl);
    if (!urlInfo.ok) throw new ApiError("URL konten tidak valid", 400);
    const hashtags = Array.from(new Set(input.hashtags.map(normalizeHashtag).filter(Boolean)));
    const accountHandle = normalizeHandle(input.accountHandle);
    if (!accountHandle) throw new ApiError("Akun/handle wajib diisi", 400);
    const outcome = await db.transaction().execute(async (trx) => {
      const campaign = await trx.selectFrom("campaigns").select(["id", "status", "ownerId", "requiredPlatform", "watermarkRequired"]).where("id", "=", input.campaignId).executeTakeFirst();
      if (!campaign) throw new ApiError("Campaign tidak ditemukan", 404);
      if (campaign.status !== "active") {
        throw new ApiError("Campaign ini tidak sedang aktif, submission baru tidak dapat dikirim", 409);
      }
      const participant = await trx.selectFrom("campaignParticipants").select(["id", "status"]).where("campaignId", "=", campaign.id).where("creatorId", "=", user.id).executeTakeFirst();
      if (!participant) {
        await trx.insertInto("campaignParticipants").values({ campaignId: campaign.id, creatorId: user.id, status: "active" }).execute();
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "campaign",
          entityId: campaign.id,
          action: "creator_joined",
          detail: { creatorId: user.id, via: "submission" }
        });
      } else if (participant.status === "stopped") {
        await trx.updateTable("campaignParticipants").set({ status: "active", stoppedAt: null }).where("id", "=", participant.id).execute();
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
        updatedAt: /* @__PURE__ */ new Date()
      };
      let submissionId;
      if (input.id) {
        const existing = await trx.selectFrom("submissions").select(["id", "creatorId", "status", "campaignId"]).where("id", "=", input.id).forUpdate().executeTakeFirst();
        if (!existing || existing.creatorId !== user.id) throw new ApiError("Submission tidak ditemukan", 404);
        if (existing.status !== "draft") throw new ApiError("Hanya submission berstatus Draft yang dapat diubah", 409);
        if (existing.campaignId !== campaign.id) throw new ApiError("Campaign submission tidak dapat diubah", 400);
        await trx.updateTable("submissions").set(baseValues).where("id", "=", existing.id).execute();
        submissionId = existing.id;
      } else {
        await sql4`SELECT pg_advisory_xact_lock(hashtext(${`sub:${campaign.id}:${user.id}`}))`.execute(trx);
        const last = await trx.selectFrom("submissions").select((eb) => eb.fn.max("sequenceNo").as("m")).where("campaignId", "=", campaign.id).where("creatorId", "=", user.id).executeTakeFirst();
        const sequenceNo = (last?.m ?? 0) + 1;
        const [created] = await trx.insertInto("submissions").values({
          campaignId: campaign.id,
          creatorId: user.id,
          sequenceNo,
          status: "draft",
          ...baseValues
        }).returning("id").execute();
        submissionId = created.id;
        await logAudit(trx, {
          actorId: user.id,
          actorRole: user.role,
          entityType: "submission",
          entityId: submissionId,
          action: "submission_created",
          fromStatus: null,
          toStatus: "draft",
          detail: { sequenceNo, campaignId: campaign.id }
        });
      }
      if (input.action === "save_draft") {
        return { id: submissionId, status: "draft", aiResult: null, aiSummary: null, ownerId: campaign.ownerId };
      }
      const now = /* @__PURE__ */ new Date();
      await trx.updateTable("submissions").set({ status: "submitted", submittedAt: now, updatedAt: now }).where("id", "=", submissionId).execute();
      await logAudit(trx, {
        actorId: user.id,
        actorRole: user.role,
        entityType: "submission",
        entityId: submissionId,
        action: "submitted",
        fromStatus: "draft",
        toStatus: "submitted"
      });
      await trx.updateTable("submissions").set({ status: "ai_verifying" }).where("id", "=", submissionId).execute();
      await logAudit(trx, {
        actorId: null,
        actorRole: "ai",
        entityType: "submission",
        entityId: submissionId,
        action: "ai_verification_started",
        fromStatus: "submitted",
        toStatus: "ai_verifying"
      });
      const ai = await runAiVerification(trx, submissionId);
      const nextStatus = AI_STATUS[ai.result];
      await trx.updateTable("submissions").set({
        status: nextStatus,
        aiResult: ai.result,
        aiChecks: ai.checks,
        aiSummary: ai.summary,
        aiVerifiedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where("id", "=", submissionId).execute();
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
          reviews: ai.checks.filter((c) => c.status === "review").map((c) => c.key)
        }
      });
      return { id: submissionId, status: nextStatus, aiResult: ai.result, aiSummary: ai.summary, ownerId: campaign.ownerId };
    });
    await notifyRealtime({
      userIds: [user.id, outcome.ownerId],
      admins: true,
      event: { type: "submission", entityType: "submission", entityId: outcome.id }
    });
    return jsonResponse({
      id: outcome.id,
      status: outcome.status,
      aiResult: outcome.aiResult,
      aiSummary: outcome.aiSummary
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/endpoints/uploads/presign_POST.ts
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
var MAX_BYTES = 4 * 1024 * 1024;
var EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};
var KINDS = ["proof", "dispute", "watermark"];
async function handle26(request) {
  try {
    const user = await requireUser(request);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError("Penyimpanan file belum dikonfigurasi (BLOB_READ_WRITE_TOKEN)", 500);
    }
    const form = await request.formData().catch(() => {
      throw new ApiError("Body harus multipart/form-data", 400);
    });
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");
    if (!KINDS.includes(kind)) throw new ApiError("Jenis unggahan tidak valid", 400);
    if (!(file instanceof File)) throw new ApiError("File tidak ditemukan", 400);
    if (file.size <= 0) throw new ApiError("File kosong", 400);
    if (file.size > MAX_BYTES) throw new ApiError("Ukuran file maksimal 4 MB", 400);
    const ext = EXT[file.type];
    if (!ext) throw new ApiError("Format file harus PNG, JPG, atau WebP", 400);
    let visibility;
    if (kind === "watermark") {
      if (user.role !== "owner" && user.role !== "admin") {
        throw new ApiError("Hanya Owner yang dapat mengunggah logo watermark", 403);
      }
      if (file.type !== "image/png") throw new ApiError("Logo watermark harus berupa file PNG", 400);
      visibility = "public";
    } else {
      if (user.role !== "creator") throw new ApiError("Hanya Creator yang dapat mengunggah bukti", 403);
      visibility = "private";
    }
    const pathname = `${kind}/${user.id}/${nanoid(14)}.${ext}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true
    });
    return jsonResponse({ url: blob.url, filename: blob.url, visibility });
  } catch (error) {
    return handleApiError(error);
  }
}

// src/server/routes.ts
var routes = {
  "admin/audit_logs:GET": handle,
  "admin/confirm_payment:POST": handle2,
  "admin/decide_dispute:POST": handle3,
  "admin/review_submission:POST": handle4,
  "admin/update_user:POST": handle5,
  "admin/users:GET": handle6,
  "auth/login_with_password:POST": handle7,
  "auth/logout:POST": handle8,
  "auth/register_with_password:POST": handle9,
  "auth/session:GET": handle10,
  "campaigns/detail:GET": handle11,
  "campaigns/list:GET": handle12,
  "campaigns/participation:POST": handle13,
  "campaigns/save:POST": handle14,
  "campaigns/status:POST": handle15,
  "claims/create:POST": handle16,
  "claims/list:GET": handle17,
  "dashboard/summary:GET": handle18,
  "disputes/create:POST": handle19,
  "disputes/list:GET": handle20,
  "profile/me:GET": handle21,
  "profile/update:POST": handle22,
  "submissions/detail:GET": handle23,
  "submissions/list:GET": handle24,
  "submissions/save:POST": handle25,
  "uploads/presign:POST": handle26
};

// server/handler.ts
async function handler(req, res) {
  const host = String(req.headers.host ?? "localhost");
  const url = new URL(req.url ?? "/", `https://${host}`);
  const route = (url.searchParams.get("route") ?? url.pathname.replace(/^\/api\/?/, "")).replace(/^\/+|\/+$/g, "");
  url.searchParams.delete("route");
  url.pathname = `/_api/${route}`;
  const method = (req.method ?? "GET").toUpperCase();
  const handle27 = routes[`${route}:${method}`];
  if (!handle27) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ json: { error: `Endpoint tidak ditemukan: ${method} ${route}` } }));
    return;
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== void 0) headers.set(k, String(v));
  }
  let body;
  if (method !== "GET" && method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    body = Buffer.concat(chunks);
  }
  const request = new Request(url.toString(), { method, headers, body: body && body.length ? body : void 0 });
  let response;
  try {
    response = await handle27(request);
  } catch (error) {
    console.error("Unhandled endpoint error", route, error);
    response = new Response(JSON.stringify({ json: { error: "Terjadi kesalahan pada server" } }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie?.();
  if (cookies && cookies.length) res.setHeader("set-cookie", cookies);
  else {
    const single = response.headers.get("set-cookie");
    if (single) res.setHeader("set-cookie", single);
  }
  const out = Buffer.from(await response.arrayBuffer());
  res.end(out);
}
var config = { api: { bodyParser: false } };
export {
  config,
  handler as default
};
