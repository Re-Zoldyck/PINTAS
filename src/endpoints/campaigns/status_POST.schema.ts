import { z } from "zod";
import superjson from "superjson";
import type { CampaignSummary } from "../../helpers/pintasTypes";

export const schema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["activate", "complete", "add_budget"]),
  amount: z.number().int().positive().optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { campaign: CampaignSummary };

export const postCampaignStatus = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/campaigns/status`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};