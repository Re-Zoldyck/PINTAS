import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  submissionId: z.number().int().positive(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(1000).optional().nullable(),
  verifiedViews: z.number().int().nonnegative().optional().nullable(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  submissionId: number;
  status: string;
  approvedAmount: number | null;
  calculatedAmount: number | null;
  capped: boolean;
};

export const postAdminReviewSubmission = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/review_submission`, {
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