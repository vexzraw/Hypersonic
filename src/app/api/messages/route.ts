import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, roomMembers, users } from "@/db/schema";
import { and, eq, gt, desc } from "drizzle-orm";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const roomId = Number(req.nextUrl.searchParams.get("roomId") || 0);
  const after = Number(req.nextUrl.searchParams.get("after") || 0);
  const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
  if (!roomId) return NextResponse.json({ error: "roomId requerido" }, { status: 400 });

  const membership = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  if (!membership.length)
    return NextResponse.json({ error: "No eres miembro de esta sala" }, { status: 403 });

  const rows = await db
    .select({
      id: messages.id,
      roomId: messages.roomId,
      userId: messages.userId,
      kind: messages.kind,
      effect: messages.effect,
      audio: messages.audio,
      durationMs: messages.durationMs,
      createdAt: messages.createdAt,
      userName: users.name,
      userAvatar: users.avatar,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(and(eq(messages.roomId, roomId), gt(messages.id, after)))
    .orderBy(desc(messages.id))
    .limit(after > 0 ? 200 : 40);

  return NextResponse.json({ messages: rows.reverse() });
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const roomId = Number(body.roomId);
  const userId = Number(body.userId);
  const audio = String(body.audio || "");
  if (!roomId || !userId || !audio.startsWith("data:audio"))
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  if (audio.length > 8_000_000)
    return NextResponse.json({ error: "Audio demasiado largo (máx 8MB)" }, { status: 413 });

  const membership = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  if (!membership.length)
    return NextResponse.json({ error: "No eres miembro de esta sala" }, { status: 403 });

  const [msg] = await db
    .insert(messages)
    .values({
      roomId,
      userId,
      kind: body.kind === "live" ? "live" : "voice",
      effect: String(body.effect || "normal"),
      audio,
      durationMs: Number(body.durationMs || 0),
    })
    .returning();
  return NextResponse.json({ message: { ...msg } });
}
