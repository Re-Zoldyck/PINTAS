import { db } from "../../helpers/db";
import { schema, OutputType } from "./audit_logs_GET.schema";
import { handleApiError, jsonResponse, num, requireUser } from "../../helpers/apiUtils";

export async function handle(request: Request) {
  try {
    await requireUser(request, ["admin"]);
    const url = new URL(request.url);
    const entityIdRaw = url.searchParams.get("entityId");
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const input = schema.parse({
      entityType: url.searchParams.get("entityType") ?? undefined,
      entityId: entityIdRaw ? Number(entityIdRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    let query = db
      .selectFrom("auditLogs")
      .leftJoin("users as actor", "actor.id", "auditLogs.actorId")
      .select([
        "auditLogs.id",
        "auditLogs.actorId",
        "actor.displayName as actorName",
        "auditLogs.actorRole",
        "auditLogs.entityType",
        "auditLogs.entityId",
        "auditLogs.action",
        "auditLogs.fromStatus",
        "auditLogs.toStatus",
        "auditLogs.detail",
        "auditLogs.createdAt",
      ]);
    let countQuery = db.selectFrom("auditLogs").select((eb) => eb.fn.countAll<number>().as("c"));
    if (input.entityType) {
      query = query.where("auditLogs.entityType", "=", input.entityType);
      countQuery = countQuery.where("auditLogs.entityType", "=", input.entityType);
    }
    if (input.entityId) {
      query = query.where("auditLogs.entityId", "=", input.entityId);
      countQuery = countQuery.where("auditLogs.entityId", "=", input.entityId);
    }
    const [rows, count] = await Promise.all([
      query.orderBy("auditLogs.createdAt", "desc").limit(limit).offset(offset).execute(),
      countQuery.executeTakeFirst(),
    ]);
    return jsonResponse({
      logs: rows.map((l) => ({ ...l, createdAt: new Date(l.createdAt) })),
      total: num(count?.c),
    } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}