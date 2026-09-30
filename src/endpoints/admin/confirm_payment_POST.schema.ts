import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  claimId: z.number().int().positive(),
  decision: z.enum(["paid", "reject"]),
  paymentReference: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  claimId: number;
  submissionId: number;
  claimStatus: string;
  submissionStatus: string;
  amount: number;
};

export const postAdminConfirmPayment = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/confirm_payment`, {
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