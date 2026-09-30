import { z } from "zod";
import superjson from "superjson";
import { SubmissionStatusArrayValues } from "../../helpers/schema";
import type { SubmissionSummary } from "../../helpers/pintasTypes";

export const schema = z.object({
  campaignId: z.number().int().positive().optional(),
  status: z.enum(SubmissionStatusArrayValues).optional(),
  group: z.enum(["pending", "review", "confirm", "claimable", "all"]).optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { submissions: SubmissionSummary[] };

export const getSubmissionsList = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.campaignId) qs.set("campaignId", String(validated.campaignId));
  if (validated.status) qs.set("status", validated.status);
  if (validated.group) qs.set("group", validated.group);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/submissions/list${suffix}`, {
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