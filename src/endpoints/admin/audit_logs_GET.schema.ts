import { z } from "zod";
import superjson from "superjson";
import type { AuditEntry } from "../../helpers/pintasTypes";

export const schema = z.object({
  entityType: z.enum(["campaign", "submission", "claim", "dispute", "user", "participation"]).optional(),
  entityId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { logs: AuditEntry[]; total: number };

export const getAdminAuditLogs = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.entityType) qs.set("entityType", validated.entityType);
  if (validated.entityId) qs.set("entityId", String(validated.entityId));
  if (validated.limit) qs.set("limit", String(validated.limit));
  if (validated.offset) qs.set("offset", String(validated.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/admin/audit_logs${suffix}`, {
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