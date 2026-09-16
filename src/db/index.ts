import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { databaseAuthToken, databaseUrl } from "@/lib/env";
import * as schema from "./schema";

type Database = LibSQLDatabase<typeof schema>;

/**
 * One client is reused across requests. In development Next.js re-evaluates
 * modules on every hot reload, which would otherwise open a new connection
 * each time, so the instance is parked on globalThis.
 *
 * The connection is opened lazily, on first use rather than on import. Next
 * imports every route module while collecting page data during `next build`,
 * and an eager client would turn a missing DATABASE_URL into a build crash
 * instead of a clear error on the first query.
 */
const globalForDb = globalThis as unknown as { __aetherquestDb?: Database };

function instance(): Database {
  if (!globalForDb.__aetherquestDb) {
    globalForDb.__aetherquestDb = drizzle(
      createClient({ url: databaseUrl(), authToken: databaseAuthToken() }),
      { schema },
    );
  }
  return globalForDb.__aetherquestDb;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const real = instance();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
export * from "./schema";
