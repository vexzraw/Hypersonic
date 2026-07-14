import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, roomMembers, roomRequests, users, friendships } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const userId = Number(req.nextUrl.searchParams.get("userId") || 0);

  const allRooms = await db.select().from(rooms);
  const allMembers = await db.select().from(roomMembers);
  const allRequests = await db.select().from(roomRequests);
  const allUsers = await db.select().from(users);
  const byId = new Map(allUsers.map((u) => [u.id, u]));

  const result = allRooms
    .map((room) => {
      const members = allMembers
        .filter((m) => m.roomId === room.id)
        .map((m) => {
          const u = byId.get(m.userId);
          return u ? { id: u.id, name: u.name, avatar: u.avatar } : null;
        })
        .filter(Boolean) as { id: number; name: string; avatar: string | null }[];
      const isMember = allMembers.some((m) => m.roomId === room.id && m.userId === userId);
      const myRequest = allRequests.find(
        (r) => r.roomId === room.id && r.userId === userId && r.status === "pending"
      );
      const pending = isMember
        ? allRequests
            .filter((r) => r.roomId === room.id && r.status === "pending")
            .map((r) => {
              const u = byId.get(r.userId);
              return u
                ? { requestId: r.id, user: { id: u.id, name: u.name, avatar: u.avatar } }
                : null;
            })
            .filter(Boolean) as { requestId: number; user: { id: number; name: string; avatar: string | null } }[]
        : [];
      return {
        id: room.id,
        name: room.name,
        isDefault: room.isDefault,
        maxMembers: room.maxMembers,
        members,
        isMember,
        requested: Boolean(myRequest),
        pendingRequests: pending,
      };
    })
    .sort((a, b) => a.id - b.id);

  return NextResponse.json({ rooms: result });
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const userId = Number(body.userId);
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  if (body.action === "create") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const [room] = await db.insert(rooms).values({ name, maxMembers: 4 }).returning();
    await db.insert(roomMembers).values({ roomId: room.id, userId });
    return NextResponse.json({ room });
  }

  const roomId = Number(body.roomId);
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return NextResponse.json({ error: "Sala no existe" }, { status: 404 });

  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId));
  if (members.some((m) => m.userId === userId))
    return NextResponse.json({ error: "Ya eres miembro" }, { status: 409 });
  if (members.length >= room.maxMembers)
    return NextResponse.json({ error: "La sala está llena" }, { status: 409 });

  if (members.length === 0) {
    await db.insert(roomMembers).values({ roomId, userId });
    return NextResponse.json({ joined: true });
  }

  const friends = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      )
    );
  const friendIds = new Set(
    friends.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
  );
  if (!members.some((m) => friendIds.has(m.userId)))
    return NextResponse.json(
      { error: "Debes ser amigo de un miembro de la sala para solicitar unirte" },
      { status: 403 }
    );

  const existing = await db
    .select()
    .from(roomRequests)
    .where(
      and(
        eq(roomRequests.roomId, roomId),
        eq(roomRequests.userId, userId),
        eq(roomRequests.status, "pending")
      )
    );
  if (existing.length)
    return NextResponse.json({ error: "Ya enviaste una solicitud" }, { status: 409 });

  await db.insert(roomRequests).values({ roomId, userId });
  return NextResponse.json({ requested: true });
}

export async function PATCH(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const requestId = Number(body.requestId);
  const action = body.action === "accept" ? "accepted" : "rejected";
  const [request] = await db.select().from(roomRequests).where(eq(roomRequests.id, requestId));
  if (!request) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "accepted") {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, request.roomId));
    const members = await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.roomId, request.roomId));
    if (room && members.length >= room.maxMembers)
      return NextResponse.json({ error: "La sala está llena" }, { status: 409 });
    if (!members.some((m) => m.userId === request.userId))
      await db.insert(roomMembers).values({ roomId: request.roomId, userId: request.userId });
  }
  await db.update(roomRequests).set({ status: action }).where(eq(roomRequests.id, requestId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureMigrated();
  const roomId = Number(req.nextUrl.searchParams.get("roomId") || 0);
  const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
  if (!roomId || !userId)
    return NextResponse.json({ error: "params" }, { status: 400 });
  await db
    .delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  return NextResponse.json({ ok: true });
}
