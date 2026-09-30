import { z } from "zod";
import superjson from "superjson";
import { CampaignPlatformArrayValues, DuplicatePolicyArrayValues } from "../../helpers/schema";
import type { CampaignSummary } from "../../helpers/pintasTypes";

export const MIN_CAMPAIGN_BUDGET = 4_000_000;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const schema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(3, "Nama campaign minimal 3 karakter").max(120),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(4000),
  budgetTotal: z
    .number()
    .int()
    .min(MIN_CAMPAIGN_BUDGET, "Budget minimum campaign adalah Rp4.000.000"),
  startDate: dateString,
  endDate: dateString,
  target: z.string().trim().min(3, "Target campaign wajib diisi").max(500),
  targetViews: z.number().int().nonnegative().optional().nullable(),
  requiredPlatform: z.enum(CampaignPlatformArrayValues),
  watermarkRequired: z.boolean(),
  watermarkLogoUrl: z.string().optional().nullable(),
  watermarkLogoFilename: z.string().optional().nullable(),
  minViews: z.number().int().nonnegative(),
  duplicatePolicy: z.enum(DuplicatePolicyArrayValues),
  requiredCaption: z.string().trim().max(500).optional().nullable(),
  requiredHashtags: z.array(z.string().trim().min(1).max(60)).max(20),
  editingRequirement: z.string().trim().max(1000).optional().nullable(),
  ratePerThousandViews: z.number().int().nonnegative(),
  feePerSubmission: z.number().int().nonnegative(),
  maxPayoutPerSubmission: z.number().int().nonnegative(),
  publish: z.boolean().default(false),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { campaign: CampaignSummary };

export const postCampaignSave = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/campaigns/save`, {
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