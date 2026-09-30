import { db } from "../../helpers/db";
import { schema, OutputType } from "./users_GET.schema";
import { handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";

export async function handle(request: Request) {
  try {
    await requireUser(request, ["admin"]);
    const url = new URL(request.url);
    const input = schema.parse({
      role: url.searchParams.get("role") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    });

    let query = db
      .selectFrom("users")
      .select((eb) => [
        "users.id",
        "users.email",
        "users.displayName",
        "users.role",
        "users.isActive",
        "users.createdAt",
        eb
          .selectFrom("campaigns")
          .select((seb) => seb.fn.countAll<number>().as("c"))
          .whereRef("campaigns.ownerId", "=", "users.id")
          .as("campaignCount"),
        eb
          .selectFrom("submissions")
          .select((seb) => seb.fn.countAll<number>().as("c"))
          .whereRef("submissions.creatorId", "=", "users.id")
          .where("submissions.status", "<>", "draft")
          .as("submissionCount"),
        eb
          .selectFrom("claims")
          .select((seb) => seb.fn.coalesce(seb.fn.sum<string>("claims.amount"), seb.val("0")).as("s"))
          .whereRef("claims.creatorId", "=", "users.id")
          .where("claims.status", "=", "paid")
          .as("paidTotal"),
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
        paidTotal: num(r.paidTotal),
      })),
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}