import { z } from "zod";
import superjson from "superjson";
import { ClaimStatusArrayValues } from "../../helpers/schema";
import type { ClaimInfo } from "../../helpers/pintasTypes";

export const schema = z.object({
  status: z.enum(ClaimStatusArrayValues).optional(),
  campaignId: z.number().int().positive().optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { claims: ClaimInfo[] };

export const getClaimsList = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.status) qs.set("status", validated.status);
  if (validated.campaignId) qs.set("campaignId", String(validated.campaignId));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/claims/list${suffix}`, {
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