import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria. Cópiala de Render/Neon.");
}

const globalForDb = globalThis as typeof globalThis & {
  __hypersonicPool?: Pool;
};

export const pool =
  globalForDb.__hypersonicPool ??
  new Pool({
    connectionString: databaseUrl,
    // Render a veces reinicia conexiones inactivas; esto lo maneja mejor.
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__hypersonicPool = pool;
}

export const db = drizzle(pool, { schema });
