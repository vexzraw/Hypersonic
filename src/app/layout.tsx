import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYPERSONIC · Walkie-Talkie PTT",
  description:
    "HYPERSONIC - Walkie-talkie web con efectos de voz, salas, amigos y modo en vivo. Presiona para hablar.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HYPERSONIC",
  },
};

export const viewport: Viewport = {
  themeColor: "#00ff66",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-theme="matrix" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
