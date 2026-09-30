import { db } from "../../helpers/db";
import { schema, OutputType } from "./update_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { normalizeHandle } from "../../helpers/contentFingerprint";
import { logAudit } from "../../helpers/auditLog";

export async function handle(request: Request) {
  try {
    const sessionUser = await requireUser(request);
    const input = await parseBody(request, (j) => schema.parse(j));

    const seen = new Set<string>();
    const accounts = input.socialAccounts
      .map((a) => ({ platform: a.platform, handle: normalizeHandle(a.handle) }))
      .filter((a) => a.handle.length > 0);
    for (const a of accounts) {
      if (seen.has(a.platform)) throw new ApiError("Setiap platform hanya boleh satu akun", 400);
      seen.add(a.platform);
    }

    const updated = await db.transaction().execute(async (trx) => {
      const [user] = await trx
        .updateTable("users")
        .set({
          displayName: input.displayName,
          bio: input.bio ?? null,
          updatedAt: new Date(),
        })
        .where("id", "=", sessionUser.id)
        .returning(["id", "email", "displayName", "avatarUrl", "role", "bio", "createdAt"])
        .execute();

      await trx.deleteFrom("creatorSocialAccounts").where("userId", "=", sessionUser.id).execute();
      if (accounts.length > 0) {
        await trx
          .insertInto("creatorSocialAccounts")
          .values(accounts.map((a) => ({ userId: sessionUser.id, platform: a.platform, handle: a.handle })))
          .execute();
      }

      await logAudit(trx, {
        actorId: sessionUser.id,
        actorRole: sessionUser.role,
        entityType: "user",
        entityId: sessionUser.id,
        action: "profile_updated",
        detail: { socialAccounts: accounts.map((a) => `${a.platform}:@${a.handle}`) },
      });
      return user;
    });

    return jsonResponse({
      profile: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        bio: updated.bio,
        createdAt: updated.createdAt ? new Date(updated.createdAt) : null,
        socialAccounts: accounts,
      },
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}