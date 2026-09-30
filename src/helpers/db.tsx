import { Kysely, CamelCasePlugin, PostgresDialect } from "kysely";
import pg from "pg";
import { DB, kyselyIdentifierOverrides } from "./schema";

// kysely's CamelCasePlugin can't recover a snake_case name that has an underscore
// directly before a digit. The generated schema exports the exact spelling for such
// identifiers; everything else falls through to the default mapping.
class PintasCamelCasePlugin extends CamelCasePlugin {
  protected override snakeCase(str: string): string {
    return kyselyIdentifierOverrides[str] ?? super.snakeCase(str);
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diset (lihat .env.example)");
}

// bigint (int8) dikembalikan sebagai string — sama seperti di Floot; kode memakai num() untuk konversi.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

export const db = new Kysely<DB>({
  plugins: [new PintasCamelCasePlugin()],
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    }),
  }),
});
