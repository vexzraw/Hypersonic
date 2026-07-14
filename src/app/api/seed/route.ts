import { NextResponse } from "next/server";
import { ensureMigrated } from "@/db/migrate";

export const dynamic = "force-dynamic";

/**
 * Endpoint de mantenimiento: fuerza la migración inicial.
 * Útil para verificar que la BD está conectada antes de abrir la app.
 * Visita https://tu-app.onrender.com/api/seed tras el primer deploy.
 */
export async function GET() {
  try {
    await ensureMigrated();
    return NextResponse.json({
      ok: true,
      message: "Base de datos lista. Tablas creadas y salas por defecto insertadas.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
