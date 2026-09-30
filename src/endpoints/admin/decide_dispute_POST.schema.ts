import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  disputeId: z.number().int().positive(),
  decision: z.enum(["accept", "reject"]),
  note: z.string().trim().min(3, "Catatan keputusan wajib diisi").max(1000),
  verifiedViews: z.number().int().nonnegative().optional().nullable(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  disputeId: number;
  submissionId: number;
  status: string;
  approvedAmount: number | null;
  capped: boolean;
};

export const postAdminDecideDispute = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/decide_dispute`, {
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