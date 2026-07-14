import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
  if (!userId) return NextResponse.json({ error: "userId_required" }, { status: 400 });

  const rows = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)));

  const allUsers = await db.select().from(users);
  const byId = new Map(allUsers.map((u) => [u.id, u]));

  const friends: { id: number; name: string; avatar: string | null }[] = [];
  const incoming: { requestId: number; from: { id: number; name: string; avatar: string | null } }[] = [];
  const outgoing: { requestId: number; to: { id: number; name: string; avatar: string | null } }[] = [];

  for (const f of rows) {
    const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
    const other = byId.get(otherId);
    if (!other) continue;
    const pub = { id: other.id, name: other.name, avatar: other.avatar };
    if (f.status === "accepted") friends.push(pub);
    else if (f.status === "pending" && f.addresseeId === userId)
      incoming.push({ requestId: f.id, from: pub });
    else if (f.status === "pending" && f.requesterId === userId)
      outgoing.push({ requestId: f.id, to: pub });
  }
  return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const requesterId = Number(body.requesterId);
  let addresseeId = Number(body.addresseeId || 0);

  if (!addresseeId && body.addresseeName) {
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.name, String(body.addresseeName).trim()));
    if (!target)
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    addresseeId = target.id;
  }
  if (!requesterId || !addresseeId || requesterId === addresseeId)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
        and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
      )
    );
  const active = existing.find((f) => f.status !== "rejected");
  if (active)
    return NextResponse.json(
      { error: active.status === "accepted" ? "Ya son amigos" : "Ya hay una solicitud pendiente" },
      { status: 409 }
    );

  const [row] = await db
    .insert(friendships)
    .values({ requesterId, addresseeId, status: "pending" })
    .returning();
  return NextResponse.json({ request: row });
}

export async function PATCH(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const id = Number(body.requestId);
  const action = body.action === "accept" ? "accepted" : "rejected";
  const [row] = await db
    .update(friendships)
    .set({ status: action })
    .where(eq(friendships.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ request: row });
}
