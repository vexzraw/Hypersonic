"use client";

/* =================================================================
   HYPERSONIC - Sistema de notificaciones
   -----------------------------------------------------------------
   - Notificaciones nativas del navegador (con icono HYPERSONIC)
   - Toasts in-app hermosos con avatar, botones de acción, barra de progreso
   - Sonidos personalizables por tipo de evento
   - Vibración en móvil
   - Badge dinámico en el título de la pestaña
   ================================================================= */

import { getCtx } from "./audio";

export type NotifKind =
  | "voice"        // Mensaje de voz
  | "live"         // Fragmento en vivo
  | "friend_request"      // Solicitud de amistad entrante
  | "friend_accepted"     // Aceptaron tu solicitud
  | "room_request"        // Alguien quiere unirse a tu sala
  | "room_accepted"       // Aceptaron tu ingreso a sala
  | "system";             // Mensaje del sistema

export type NotifSoundId = "clasico" | "walkie" | "suave" | "campana" | "urgente" | "silencio";

export const NOTIF_SOUNDS: { id: NotifSoundId; label: string }[] = [
  { id: "clasico", label: "Clásico (bip-bip)" },
  { id: "walkie", label: "Walkie (roger beep)" },
  { id: "suave", label: "Suave (campana柔和)" },
  { id: "campana", label: "Campana (notificación)" },
  { id: "urgente", label: "Urgente (alarma)" },
  { id: "silencio", label: "Silencio" },
];

type NotifConfig = {
  voice: NotifSoundId;
  friend: NotifSoundId;
  room: NotifSoundId;
};

const DEFAULT_CONFIG: NotifConfig = {
  voice: "clasico",
  friend: "campana",
  room: "suave",
};

let config: NotifConfig = { ...DEFAULT_CONFIG };
let toastsEnabled = true;
let nativeEnabled = true;

export function setNotifConfig(c: Partial<NotifConfig>) {
  config = { ...config, ...c };
}
export function getNotifConfig(): NotifConfig {
  return config;
}
export function setToastsEnabled(v: boolean) {
  toastsEnabled = v;
}
export function setNativeEnabled(v: boolean) {
  nativeEnabled = v;
}

/* ---------- Carga/guardado en localStorage ---------- */
export function loadNotifConfig() {
  try {
    const raw = localStorage.getItem("hs_notif_config");
    if (raw) config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    const t = localStorage.getItem("hs_toasts");
    if (t !== null) toastsEnabled = t === "1";
    const n = localStorage.getItem("hs_native");
    if (n !== null) nativeEnabled = n === "1";
  } catch {}
}
export function saveNotifConfig() {
  localStorage.setItem("hs_notif_config", JSON.stringify(config));
  localStorage.setItem("hs_toasts", toastsEnabled ? "1" : "0");
  localStorage.setItem("hs_native", nativeEnabled ? "1" : "0");
}

/* ---------- Sonidos ---------- */
function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  vol = 0.14,
  type: OscillatorType = "sine"
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function playNotifSound(kind: NotifKind) {
  if (!nativeEnabled) return;
  try {
    const ctx = getCtx();
    const soundId: NotifSoundId =
      kind === "voice" || kind === "live"
        ? config.voice
        : kind === "friend_request" || kind === "friend_accepted"
        ? config.friend
        : kind === "room_request" || kind === "room_accepted"
        ? config.room
        : config.voice;
    if (soundId === "silencio") return;

    if (soundId === "clasico") {
      tone(ctx, 880, 0, 0.12);
      tone(ctx, 1320, 0.16, 0.14);
    } else if (soundId === "walkie") {
      tone(ctx, 1050, 0, 0.09, 0.16, "square");
      tone(ctx, 1400, 0.1, 0.07, 0.12, "square");
    } else if (soundId === "suave") {
      tone(ctx, 660, 0, 0.5, 0.09);
      tone(ctx, 990, 0.05, 0.6, 0.06);
    } else if (soundId === "campana") {
      tone(ctx, 1568, 0, 0.4, 0.1);
      tone(ctx, 2093, 0.05, 0.5, 0.08);
      tone(ctx, 2637, 0.1, 0.6, 0.05);
    } else if (soundId === "urgente") {
      tone(ctx, 1000, 0, 0.1, 0.18, "sawtooth");
      tone(ctx, 1000, 0.15, 0.1, 0.18, "sawtooth");
      tone(ctx, 1000, 0.3, 0.1, 0.18, "sawtooth");
    }
  } catch {}
}

export function previewSound(soundId: NotifSoundId) {
  try {
    const ctx = getCtx();
    if (soundId === "silencio") return;
    if (soundId === "clasico") {
      tone(ctx, 880, 0, 0.12);
      tone(ctx, 1320, 0.16, 0.14);
    } else if (soundId === "walkie") {
      tone(ctx, 1050, 0, 0.09, 0.16, "square");
      tone(ctx, 1400, 0.1, 0.07, 0.12, "square");
    } else if (soundId === "suave") {
      tone(ctx, 660, 0, 0.5, 0.09);
      tone(ctx, 990, 0.05, 0.6, 0.06);
    } else if (soundId === "campana") {
      tone(ctx, 1568, 0, 0.4, 0.1);
      tone(ctx, 2093, 0.05, 0.5, 0.08);
      tone(ctx, 2637, 0.1, 0.6, 0.05);
    } else if (soundId === "urgente") {
      tone(ctx, 1000, 0, 0.1, 0.18, "sawtooth");
      tone(ctx, 1000, 0.15, 0.1, 0.18, "sawtooth");
      tone(ctx, 1000, 0.3, 0.1, 0.18, "sawtooth");
    }
  } catch {}
}

/* ---------- Vibración ---------- */
function vibrate(kind: NotifKind) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<NotifKind, number[]> = {
    voice: [40],
    live: [20],
    friend_request: [80, 40, 80],
    friend_accepted: [40, 30, 40],
    room_request: [60, 30, 60],
    room_accepted: [40, 30, 40],
    system: [30],
  };
  try {
    navigator.vibrate(patterns[kind] || [30]);
  } catch {}
}

/* ---------- Toasts in-app ---------- */
export type ToastAction = {
  label: string;
  primary?: boolean;
  onClick: () => void;
};

export type Toast = {
  id: number;
  kind: NotifKind;
  title: string;
  text?: string;
  avatar?: string | null;
  userName?: string;
  actions?: ToastAction[];
  durationMs?: number;
  bad?: boolean;
};

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let currentToasts: Toast[] = [];

export function subscribeToasts(l: (toasts: Toast[]) => void): () => void {
  listeners.add(l);
  l(currentToasts);
  return () => listeners.delete(l);
}

function emit() {
  listeners.forEach((l) => l([...currentToasts]));
}

export function dismissToast(id: number) {
  currentToasts = currentToasts.filter((t) => t.id !== id);
  emit();
}

export function pushToast(t: Omit<Toast, "id">): number {
  if (!toastsEnabled) return -1;
  const id = ++toastId;
  const toast: Toast = { id, durationMs: 6000, ...t };
  currentToasts = [...currentToasts, toast];
  emit();
  const dur = toast.durationMs ?? 6000;
  if (dur > 0) {
    setTimeout(() => dismissToast(id), dur);
  }
  return id;
}

/* ---------- Notificación nativa ---------- */
function nativeTitle(kind: NotifKind): string {
  switch (kind) {
    case "voice": return "Nuevo mensaje de voz";
    case "live": return "Transmisión en vivo";
    case "friend_request": return "Solicitud de amistad";
    case "friend_accepted": return "Solicitud aceptada";
    case "room_request": return "Solicitud de sala";
    case "room_accepted": return "Acceso a sala aprobado";
    default: return "HYPERSONIC";
  }
}

function nativeBody(t: { kind: NotifKind; userName?: string; text?: string }): string {
  const who = t.userName || "Alguien";
  switch (t.kind) {
    case "voice": return `${who} envió un mensaje de voz`;
    case "live": return `${who} está transmitiendo en vivo`;
    case "friend_request": return `${who} quiere ser tu amigo`;
    case "friend_accepted": return `${who} aceptó tu solicitud`;
    case "room_request": return `${who} quiere unirse a tu sala`;
    case "room_accepted": return `Tu solicitud de sala fue aprobada`;
    default: return t.text || "";
  }
}

export async function showNative(t: {
  kind: NotifKind;
  userName?: string;
  text?: string;
  tag?: string;
}) {
  if (!nativeEnabled) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(nativeTitle(t.kind), {
      body: nativeBody(t),
      tag: t.tag || `hs-${t.kind}`,
      icon: "/icon.svg",
      badge: "/icon.svg",
      silent: true, // ya reproducimos nuestro propio sonido
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 8000);
  } catch {}
}

export async function requestNotifPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch {
    return false;
  }
}

/* ---------- API pública principal ---------- */
export function notify(t: {
  kind: NotifKind;
  title: string;
  text?: string;
  userName?: string;
  avatar?: string | null;
  actions?: ToastAction[];
  tag?: string;
  bad?: boolean;
  durationMs?: number;
}) {
  // Siempre sonido + vibración (si la app está abierta)
  playNotifSound(t.kind);
  vibrate(t.kind);

  // Toast in-app (si está habilitado)
  pushToast({
    kind: t.kind,
    title: t.title,
    text: t.text,
    userName: t.userName,
    avatar: t.avatar,
    actions: t.actions,
    bad: t.bad,
    durationMs: t.durationMs,
  });

  // Notificación nativa (solo si la app NO está visible o está en background)
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    showNative(t);
  }
}

/* ---------- Badge en el título de la pestaña ---------- */
let unreadCount = 0;
let originalTitle: string | null = null;

export function setUnreadCount(n: number) {
  unreadCount = Math.max(0, n);
  if (originalTitle === null) originalTitle = document.title;
  document.title = unreadCount > 0 ? `(${unreadCount}) ${originalTitle}` : originalTitle;
}

export function incUnread() {
  setUnreadCount(unreadCount + 1);
}

export function resetUnread() {
  setUnreadCount(0);
}
