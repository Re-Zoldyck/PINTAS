import { Kysely, Transaction } from "kysely";
import { DB, JsonObject } from "./schema";

type Db = Kysely<DB> | Transaction<DB>;

export type AuditEntryInput = {
  actorId: number | null;
  actorRole: string | null;
  entityType: "campaign" | "submission" | "dispute" | "claim" | "user" | "participation";
  entityId: number;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: JsonObject | null;
};

export async function logAudit(trx: Db, entry: AuditEntryInput): Promise<void> {
  await trx
    .insertInto("auditLogs")
    .values({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus ?? null,
      detail: entry.detail ?? null,
    })
    .execute();
}