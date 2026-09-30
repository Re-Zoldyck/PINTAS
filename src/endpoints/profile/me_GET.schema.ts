import superjson from "superjson";
import type { SocialPlatform, UserRole } from "../../helpers/schema";

export type ProfileData = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  bio: string | null;
  createdAt: Date | null;
  socialAccounts: Array<{ platform: SocialPlatform; handle: string }>;
};

export type OutputType = { profile: ProfileData };

export const getProfileMe = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/profile/me`, {
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