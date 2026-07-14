import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ user });
  }
  const exclude = Number(req.nextUrl.searchParams.get("exclude") || 0);
  const all = await db.select().from(users).where(ne(users.id, exclude));
  return NextResponse.json({ users: all });
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  const [user] = await db
    .insert(users)
    .values({ name, avatar: body.avatar || null })
    .returning();
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const patch: Partial<{ name: string; avatar: string | null }> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.avatar === "string") patch.avatar = body.avatar;
  const [user] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ user });
}
