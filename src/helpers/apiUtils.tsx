import superjson from "superjson";
import { ZodError } from "zod";
import { getServerUserSession } from "./getServerUserSession";
import { NotAuthenticatedError } from "./getSetServerSession";
import { User } from "./User";
import type { UserRole } from "./schema";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(superjson.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function requireUser(
  request: Request,
  roles?: UserRole[]
): Promise<User> {
  let user: User;
  try {
    const session = await getServerUserSession(request);
    user = session.user;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      throw new ApiError("Sesi tidak valid, silakan login kembali", 401);
    }
    throw error;
  }
  if (roles && !roles.includes(user.role)) {
    throw new ApiError("Akses ditolak untuk peran ini", 403);
  }
  return user;
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  if (error instanceof ZodError) {
    const first = error.errors[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return jsonResponse({ error: `Input tidak valid — ${path}${first?.message ?? ""}` }, 400);
  }
  console.error("Unhandled API error:", error);
  return jsonResponse(
    { error: error instanceof Error ? error.message : "Terjadi kesalahan pada server" },
    500
  );
}

/** Postgres bigint/numeric columns come back as strings — normalize to number. */
export function num(value: string | number | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function parseBody<T>(request: Request, parse: (json: unknown) => T): Promise<T> {
  const text = await request.text();
  const json = text ? superjson.parse(text) : {};
  return parse(json);
}