import { z } from "zod";
import superjson from "superjson";
import { UserRoleArrayValues } from "../../helpers/schema";
import type { UserRole } from "../../helpers/schema";

export const schema = z.object({
  role: z.enum(UserRoleArrayValues).optional(),
  q: z.string().max(100).optional(),
});

export type InputType = z.infer<typeof schema>;

export type AdminUserItem = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | null;
  campaignCount: number;
  submissionCount: number;
  paidTotal: number;
};

export type OutputType = { users: AdminUserItem[] };

export const getAdminUsers = async (
  params: InputType = {},
  init?: RequestInit
): Promise<OutputType> => {
  const validated = schema.parse(params);
  const qs = new URLSearchParams();
  if (validated.role) qs.set("role", validated.role);
  if (validated.q) qs.set("q", validated.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await fetch(`/_api/admin/users${suffix}`, {
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