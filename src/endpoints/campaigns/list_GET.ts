import { db } from "../../helpers/db";
import { schema, OutputType } from "./list_GET.schema";
import { handleApiError, jsonResponse, requireUser } from "../../helpers/apiUtils";
import { campaignBaseQuery, expireCampaigns, toCampaignSummary } from "../../helpers/campaignQueries";
import type { ParticipantStatus } from "../../helpers/schema";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const input = schema.parse({
      scope: url.searchParams.get("scope") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    });

    await expireCampaigns(db);

    let query = campaignBaseQuery(db);
    if (user.role === "owner") {
      query = query.where("campaigns.ownerId", "=", user.id);
    } else if (user.role === "creator") {
      if (input.scope === "joined") {
        query = query.where("campaigns.id", "in", (eb) =>
          eb
            .selectFrom("campaignParticipants")
            .select("campaignParticipants.campaignId")
            .where("campaignParticipants.creatorId", "=", user.id)
        );
      } else {
        query = query.where("campaigns.status", "=", "active");
      }
    }
    if (input.status) query = query.where("campaigns.status", "=", input.status);
    if (input.q) query = query.where("campaigns.name", "ilike", `%${input.q}%`);

    const rows = await query.orderBy("campaigns.createdAt", "desc").limit(200).execute();

    const participation = new Map<number, ParticipantStatus>();
    if (user.role === "creator" && rows.length > 0) {
      const parts = await db
        .selectFrom("campaignParticipants")
        .select(["campaignId", "status"])
        .where("creatorId", "=", user.id)
        .where("campaignId", "in", rows.map((r) => r.id))
        .execute();
      for (const p of parts) participation.set(p.campaignId, p.status);
    }

    return jsonResponse({
      campaigns: rows.map((r) => toCampaignSummary(r, participation.get(r.id) ?? null)),
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}