import { z } from "zod";
import superjson from "superjson";
import type { AuditEntry, CampaignSummary, SubmissionSummary } from "../../helpers/pintasTypes";
import type { ParticipantStatus } from "../../helpers/schema";

export const schema = z.object({ id: z.number().int().positive() });

export type InputType = z.infer<typeof schema>;

export type CampaignParticipantInfo = {
  creatorId: number;
  creatorName: string;
  status: ParticipantStatus;
  joinedAt: Date;
  submissionCount: number;
  approvedAmount: number;
};

export type OutputType = {
  campaign: CampaignSummary;
  submissions: SubmissionSummary[];
  participants: CampaignParticipantInfo[];
  activity: AuditEntry[];
};

export const getCampaignDetail = async (
  params: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const result = await fetch(`/_api/campaigns/detail?id=${validated.id}`, {
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