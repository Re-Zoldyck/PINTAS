import { db } from "../../helpers/db";
import { schema } from "./register_with_password_POST.schema";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
} from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
import { logAudit } from "../../helpers/auditLog";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const parsed = schema.parse(json);
    const email = parsed.email.trim().toLowerCase();
    const displayName = parsed.displayName.trim();
    const role = parsed.role;

    const existingUser = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", email)
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      return new Response(
        superjson.stringify({ message: "Email sudah terdaftar" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const passwordHash = await generatePasswordHash(parsed.password);

    const newUser = await db.transaction().execute(async (trx) => {
      const [user] = await trx
        .insertInto("users")
        .values({ email, displayName, role })
        .returning(["id", "email", "displayName", "avatarUrl", "role"])
        .execute();

      await trx
        .insertInto("userPasswords")
        .values({ userId: user.id, passwordHash })
        .execute();

      await logAudit(trx, {
        actorId: user.id,
        actorRole: role,
        entityType: "user",
        entityId: user.id,
        action: "register",
        detail: { role },
      });

      return user;
    });

    const sessionId = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SessionExpirationSeconds * 1000);

    await db
      .insertInto("sessions")
      .values({
        id: sessionId,
        userId: newUser.id,
        createdAt: now,
        lastAccessed: now,
        expiresAt,
      })
      .execute();

    const response = new Response(
      superjson.stringify({
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          avatarUrl: newUser.avatarUrl,
          role: newUser.role,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime(),
    });

    return response;
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Registrasi gagal";
    return new Response(superjson.stringify({ message: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}