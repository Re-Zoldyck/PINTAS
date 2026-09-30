import { z } from "zod";
import superjson from "superjson";
import type { ParticipantStatus } from "../../helpers/schema";

export const schema = z.object({
  campaignId: z.number().int().positive(),
  action: z.enum(["join", "leave"]),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { campaignId: number; status: ParticipantStatus };

export const postCampaignParticipation = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/campaigns/participation`, {
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