import { db } from "../../helpers/db";
import { schema, OutputType } from "./update_user_POST.schema";
import { ApiError, handleApiError, jsonResponse, parseBody, requireUser } from "../../helpers/apiUtils";
import { logAudit } from "../../helpers/auditLog";

export async function handle(request: Request) {
  try {
    const admin = await requireUser(request, ["admin"]);
    const input = await parseBody(request, (j) => schema.parse(j));
    if (input.userId === admin.id && (input.isActive === false || (input.role && input.role !== "admin"))) {
      throw new ApiError("Anda tidak dapat menonaktifkan atau mengubah peran akun sendiri", 400);
    }

    const updated = await db.transaction().execute(async (trx) => {
      const target = await trx
        .selectFrom("users")
        .select(["id", "role", "isActive"])
        .where("id", "=", input.userId)
        .forUpdate()
        .executeTakeFirst();
      if (!target) throw new ApiError("Pengguna tidak ditemukan", 404);
      const nextActive = input.isActive ?? target.isActive;
      const nextRole = input.role ?? target.role;
      await trx
        .updateTable("users")
        .set({ isActive: nextActive, role: nextRole, updatedAt: new Date() })
        .where("id", "=", target.id)
        .execute();
      if (!nextActive) {
        await trx.deleteFrom("sessions").where("userId", "=", target.id).execute();
      }
      await logAudit(trx, {
        actorId: admin.id,
        actorRole: admin.role,
        entityType: "user",
        entityId: target.id,
        action: "user_updated_by_admin",
        fromStatus: `${target.role}/${target.isActive ? "active" : "inactive"}`,
        toStatus: `${nextRole}/${nextActive ? "active" : "inactive"}`,
      });
      return { userId: target.id, isActive: nextActive, role: nextRole };
    });
    return jsonResponse(updated satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}