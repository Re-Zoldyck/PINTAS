import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  submissionId: z.number().int().positive(),
  reason: z.string().trim().min(10, "Jelaskan alasan sanggahan minimal 10 karakter").max(2000),
  evidenceFilename: z.string().max(300).optional().nullable(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { disputeId: number; submissionId: number; status: string };

export const postDisputeCreate = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/disputes/create`, {
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