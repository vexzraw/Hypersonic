import { db } from "./index";
import { sql } from "drizzle-orm";
import { rooms } from "./schema";

let migrated = false;
let migrating: Promise<void> | null = null;

/**
 * Crea las tablas si no existen y deja listas las salas por defecto.
 * Se ejecuta en el primer request. Es idempotente.
 */
export async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  if (migrating) return migrating;
  migrating = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL,
        addressee_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        max_members INTEGER NOT NULL DEFAULT 4,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS room_requests (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        kind TEXT NOT NULL DEFAULT 'voice',
        effect TEXT NOT NULL DEFAULT 'normal',
        audio TEXT NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Salas por defecto
    const defaults = [
      { name: "Sala General", maxMembers: 8 },
      { name: "Música", maxMembers: 4 },
      { name: "Gaming", maxMembers: 4 },
      { name: "Charla libre", maxMembers: 6 },
    ];
    for (const d of defaults) {
      const existing = await db
        .select()
        .from(rooms)
        .where(sql`name = ${d.name} AND is_default = true`);
      if (existing.length === 0) {
        await db
          .insert(rooms)
          .values({
            name: d.name,
            isDefault: true,
            maxMembers: d.maxMembers,
          });
      }
    }

    migrated = true;
    migrating = null;
  })();
  return migrating;
}
