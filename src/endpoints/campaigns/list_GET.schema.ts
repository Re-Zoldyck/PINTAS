import { z } from "zod";
import superjson from "superjson";
import { CampaignStatusArrayValues } from "../../helpers/schema";
import type { CampaignSummary } from "../../helpers/pintasTypes";

export const schema = z.object({
  scope: z.enum(["available", "joined", "mine", "all"]).optional(),
  status: z.enum(CampaignStatusArrayValues).optional(),
  q: z.string().max(100).optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { campaigns: CampaignSummary[] };

export const getCampaignsList = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.scope) qs.set("scope", validated.scope);
  if (validated.status) qs.set("status", validated.status);
  if (validated.q) qs.set("q", validated.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/campaigns/list${suffix}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};