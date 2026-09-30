import { z } from "zod";
import superjson from "superjson";
import { DisputeStatusArrayValues } from "../../helpers/schema";
import type { DisputeInfo } from "../../helpers/pintasTypes";

export const schema = z.object({
  status: z.enum(DisputeStatusArrayValues).optional(),
});

export type InputType = z.infer<typeof schema>;

export type DisputeListItem = DisputeInfo & {
  submissionCode: string;
  submissionTitle: string;
  submissionStatus: string;
  campaignId: number;
  campaignName: string;
  creatorName: string;
  aiSummary: string | null;
};

export type OutputType = { disputes: DisputeListItem[] };

export const getDisputesList = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.status) qs.set("status", validated.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/disputes/list${suffix}`, {
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