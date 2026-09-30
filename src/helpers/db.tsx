import { type GeneratedAlways, Kysely, CamelCasePlugin } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import { DB, kyselyIdentifierOverrides } from "./schema";
import postgres from "postgres";

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

export const db = new Kysely<DB>({
  plugins: [new PintasCamelCasePlugin()],
  dialect: new PostgresJSDialect({
    postgres: postgres(connectionString, {
      prepare: false,
      idle_timeout: 10,
      max: 3,
      ssl: connectionString.includes("localhost") ? undefined : "require",
    }),
  }),
});
