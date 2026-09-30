import { db } from "../../helpers/db";
import { OutputType } from "./me_GET.schema";
import { ApiError, handleApiError, jsonResponse, requireUser } from "../../helpers/apiUtils";

export async function handle(request: Request) {
  try {
    const sessionUser = await requireUser(request);
    const user = await db
      .selectFrom("users")
      .select(["id", "email", "displayName", "avatarUrl", "role", "bio", "createdAt"])
      .where("id", "=", sessionUser.id)
      .executeTakeFirst();
    if (!user) throw new ApiError("Pengguna tidak ditemukan", 404);

    const socialAccounts = await db
      .selectFrom("creatorSocialAccounts")
      .select(["platform", "handle"])
      .where("userId", "=", user.id)
      .orderBy("platform")
      .execute();

    return jsonResponse({
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt ? new Date(user.createdAt) : null,
        socialAccounts,
      },
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}