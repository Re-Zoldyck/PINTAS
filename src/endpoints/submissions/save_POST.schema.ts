import { z } from "zod";
import superjson from "superjson";
import { SocialPlatformArrayValues } from "../../helpers/schema";
import type { AiResult, SubmissionStatus } from "../../helpers/schema";

export const schema = z.object({
  id: z.number().int().positive().optional(),
  campaignId: z.number().int().positive(),
  title: z.string().trim().min(3, "Judul konten minimal 3 karakter").max(150),
  contentUrl: z.string().trim().url("URL konten tidak valid").max(500),
  platform: z.enum(SocialPlatformArrayValues),
  accountHandle: z.string().trim().min(1, "Akun/handle wajib diisi").max(80),
  caption: z.string().trim().max(3000).default(""),
  hashtags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  viewsClaimed: z.number().int().nonnegative().default(0),
  proofScreenshotFilename: z.string().max(300).optional().nullable(),
  watermarkApplied: z.boolean().default(false),
  editingConfirmed: z.boolean().default(false),
  creatorNotes: z.string().trim().max(1000).optional().nullable(),
  action: z.enum(["save_draft", "submit"]),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  id: number;
  status: SubmissionStatus;
  aiResult: AiResult | null;
  aiSummary: string | null;
};

export const postSubmissionSave = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/submissions/save`, {
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