import { z } from "zod";
import superjson from "superjson";
import { SocialPlatformArrayValues } from "../../helpers/schema";
import type { ProfileData } from "./me_GET.schema";

export const schema = z.object({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  bio: z.string().trim().max(500).optional().nullable(),
  socialAccounts: z
    .array(
      z.object({
        platform: z.enum(SocialPlatformArrayValues),
        handle: z.string().trim().min(1, "Handle wajib diisi").max(80),
      })
    )
    .max(5),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { profile: ProfileData };

export const postProfileUpdate = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/profile/update`, {
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