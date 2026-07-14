import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureMigrated();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      name: "HYPERSONIC",
      version: "2.0.0",
      time: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    );
  }
}
