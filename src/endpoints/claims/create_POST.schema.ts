import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  submissionId: z.number().int().positive(),
  realName: z.string().trim().min(3, "Nama asli minimal 3 karakter").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid (contoh: 08123456789)"),
  bankName: z.string().trim().min(2, "Nama bank wajib diisi").max(60),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Nomor rekening harus 6-20 digit angka"),
  bankAccountHolder: z.string().trim().min(3, "Nama pemilik rekening wajib diisi").max(120),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { claimId: number; submissionId: number; amount: number; status: string };

export const postClaimCreate = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/claims/create`, {
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