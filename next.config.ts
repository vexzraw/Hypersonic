import type { NextConfig } from "next";

// HYPERSONIC se despliega como app Node en Render (no static export).
// Necesita runtime Node porque tiene API routes y conexión a Postgres.
const nextConfig: NextConfig = {
  // Render inyecta PORT; Next debe escuchar en él.
  // Next.js lee PORT automáticamente, no hace falta configurarlo aquí.
};

export default nextConfig;
