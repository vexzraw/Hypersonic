"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEffect,
  blobToDataUrl,
  EFFECTS,
  EffectId,
  getCtx,
  isSessionRecording,
  playClick,
  playDataUrl,
  PttRecorder,
  startSessionRecording,
  stopSessionRecording,
} from "@/lib/audio";
import {
  EffectIcon,
  IconAntenna,
  IconBell,
  IconCamera,
  IconCheck,
  IconChevron,
  IconDownload,
  IconGear,
  IconLive,
  IconLogout,
  IconMic,
  IconPlay,
  IconPlus,
  IconRecord,
  IconTray,
  IconUsers,
  IconWalkie,
  IconX,
} from "@/components/icons";
import NotifyToaster from "@/components/NotifyToaster";
import {
  notify,
  loadNotifConfig,
  saveNotifConfig,
  setNotifConfig,
  getNotifConfig,
  requestNotifPermission,
  previewSound,
  NOTIF_SOUNDS,
  type NotifSoundId,
  incUnread,
  resetUnread,
} from "@/lib/notify";

/* ================= Tipos ================= */
type PubUser = { id: number; name: string; avatar: string | null };
type Profile = PubUser;
type Room = {
  id: number;
  name: string;
  isDefault: boolean;
  maxMembers: number;
  members: PubUser[];
  isMember: boolean;
  requested: boolean;
  pendingRequests: { requestId: number; user: PubUser }[];
};
type Msg = {
  id: number;
  roomId: number;
  userId: number;
  kind: string;
  effect: string;
  audio: string;
  durationMs: number;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
};
type FriendsData = {
  friends: PubUser[];
  incoming: { requestId: number; from: PubUser }[];
  outgoing: { requestId: number; to: PubUser }[];
};
type Theme = "matrix" | "gris" | "blanco";

const THEMES: { id: Theme; label: string; desc: string; sw: string[] }[] = [
  { id: "matrix", label: "Matrix", desc: "Verde neón + negro AMOLED", sw: ["#000", "#00ff66", "#052"] },
  { id: "gris", label: "Gris", desc: "Tonos grises elegantes", sw: ["#17191d", "#aeb8c9", "#fff"] },
  { id: "blanco", label: "Blanco Glass", desc: "Glassmorphism estilo Windows 11", sw: ["#eef2f8", "#fff", "#000"] },
];

/* ================= Utilidades ================= */
async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Error de red");
  return data as T;
}

function resizeImage(file: File, max = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function downloadDataUrl(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = 34 }: { user: { name: string; avatar?: string | null }; size?: number }) {
  return user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border"
    />
  ) : (
    <div
      style={{ width: size, height: size, background: "var(--accent-soft)", border: "1px solid var(--border)" }}
      className="rounded-full flex items-center justify-center font-bold"
    >
      {user.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

/* ================= Componente principal ================= */
export default function WalkieTalkie() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedLocal, setLoadedLocal] = useState(false);
  const [theme, setTheme] = useState<Theme>("matrix");
  const [online, setOnline] = useState(true);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [friendsData, setFriendsData] = useState<FriendsData>({ friends: [], incoming: [], outgoing: [] });
  const [allUsers, setAllUsers] = useState<PubUser[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const lastIdRef = useRef(0);
  const roomRef = useRef<number | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const knownFriendReqsRef = useRef<Set<number>>(new Set());
  const knownRoomReqsRef = useRef<Set<number>>(new Set());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sideTab, setSideTab] = useState<"salas" | "amigos">("salas");

  const [mode, setMode] = useState<"voz" | "vivo">("voz");
  const [effect, setEffect] = useState<EffectId>("normal");
  const [talking, setTalking] = useState(false);
  const [sending, setSending] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [sessionRec, setSessionRec] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const recorderRef = useRef<PttRecorder | null>(null);
  const liveActiveRef = useRef(false);
  const talkingRef = useRef(false);
  const liveQueueRef = useRef<string[]>([]);
  const livePlayingRef = useRef(false);
  const modeRef = useRef(mode);
  const effectRef = useRef(effect);
  modeRef.current = mode;
  effectRef.current = effect;
  profileRef.current = profile;

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ---------- Carga inicial ---------- */
  useEffect(() => {
    loadNotifConfig();
    const t = (localStorage.getItem("hs_theme") as Theme) || "matrix";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    const saved = localStorage.getItem("hs_user");
    if (saved) {
      try {
        const p = JSON.parse(saved) as Profile;
        api<{ user: Profile }>(`/api/users?id=${p.id}`)
          .then((d) => {
            setProfile(d.user);
            localStorage.setItem("hs_user", JSON.stringify(d.user));
          })
          .catch(() => localStorage.removeItem("hs_user"))
          .finally(() => setLoadedLocal(true));
      } catch {
        setLoadedLocal(true);
      }
    } else setLoadedLocal(true);

    requestNotifPermission();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resetUnread();
    });
  }, []);

  /* ---------- Indicador de conexión ---------- */
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("hs_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  /* ---------- Refresco del mundo (salas, amigos, usuarios) ---------- */
  const refreshWorld = useCallback(async () => {
    const p = profileRef.current;
    if (!p) return;
    try {
      const [r, f, u] = await Promise.all([
        api<{ rooms: Room[] }>(`/api/rooms?userId=${p.id}`),
        api<FriendsData>(`/api/friends?userId=${p.id}`),
        api<{ users: PubUser[] }>(`/api/users?exclude=${p.id}`),
      ]);
      setRooms(r.rooms);
      setFriendsData(f);
      setAllUsers(u.users);
      setOnline(true);

      // Detectar NUEVAS solicitudes de amistad entrantes (notificar)
      for (const inc of f.incoming) {
        if (!knownFriendReqsRef.current.has(inc.requestId)) {
          knownFriendReqsRef.current.add(inc.requestId);
          // Solo notificar si no es la primera carga
          if (knownFriendReqsRef.current.size > f.incoming.length) {
            notify({
              kind: "friend_request",
              title: "Nueva solicitud de amistad",
              text: `${inc.from.name} quiere ser tu amigo`,
              userName: inc.from.name,
              avatar: inc.from.avatar,
              actions: [
                {
                  label: "Aceptar",
                  primary: true,
                  onClick: () => {
                    api(`/api/friends`, {
                      method: "PATCH",
                      body: JSON.stringify({ requestId: inc.requestId, action: "accept" }),
                    }).then(() => refreshWorld());
                  },
                },
                {
                  label: "Rechazar",
                  onClick: () => {
                    api(`/api/friends`, {
                      method: "PATCH",
                      body: JSON.stringify({ requestId: inc.requestId, action: "reject" }),
                    }).then(() => refreshWorld());
                  },
                },
              ],
            });
            incUnread();
          }
        }
      }

      // Detectar solicitudes de sala nuevas
      for (const room of r.rooms) {
        for (const pr of room.pendingRequests) {
          if (!knownRoomReqsRef.current.has(pr.requestId)) {
            knownRoomReqsRef.current.add(pr.requestId);
            if (knownRoomReqsRef.current.size > r.rooms.reduce((n, x) => n + x.pendingRequests.length, 0)) {
              notify({
                kind: "room_request",
                title: "Solicitud de sala",
                text: `${pr.user.name} quiere unirse a "${room.name}"`,
                userName: pr.user.name,
                avatar: pr.user.avatar,
                actions: [
                  {
                    label: "Aceptar",
                    primary: true,
                    onClick: () => {
                      api(`/api/rooms`, {
                        method: "PATCH",
                        body: JSON.stringify({ requestId: pr.requestId, action: "accept" }),
                      }).then(() => refreshWorld());
                    },
                  },
                  {
                    label: "Rechazar",
                    onClick: () => {
                      api(`/api/rooms`, {
                        method: "PATCH",
                        body: JSON.stringify({ requestId: pr.requestId, action: "reject" }),
                      }).then(() => refreshWorld());
                    },
                  },
                ],
              });
              incUnread();
            }
          }
        }
      }
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    // Inicializar conjuntos conocidos con la primera carga
    refreshWorld().then(() => {
      // Marcar como conocidas todas las que llegaron en la primera carga
      // (ya están en los refs gracias al código de arriba)
    });
    const iv = setInterval(refreshWorld, 4000);
    return () => clearInterval(iv);
  }, [profile, refreshWorld]);

  /* ---------- Cola de reproducción en vivo ---------- */
  const pumpLiveQueue = useCallback(() => {
    if (livePlayingRef.current) return;
    const next = liveQueueRef.current.shift();
    if (!next) return;
    livePlayingRef.current = true;
    playDataUrl(next, () => {
      livePlayingRef.current = false;
      pumpLiveQueue();
    });
  }, []);

  /* ---------- Polling de mensajes de la sala actual ---------- */
  useEffect(() => {
    roomRef.current = currentRoomId;
    lastIdRef.current = 0;
    setMsgs([]);
    if (!currentRoomId || !profile) return;
    let alive = true;

    const tick = async () => {
      const p = profileRef.current;
      if (!p) return;
      try {
        const d = await api<{ messages: Msg[] }>(
          `/api/messages?roomId=${currentRoomId}&after=${lastIdRef.current}&userId=${p.id}`
        );
        if (!alive || roomRef.current !== currentRoomId || !d.messages.length) return;
        const fresh = d.messages.filter((m) => m.id > lastIdRef.current);
        if (!fresh.length) return;
        const isFirstLoad = lastIdRef.current === 0;
        lastIdRef.current = fresh[fresh.length - 1].id;
        setMsgs((prev) => [...prev, ...fresh].slice(-80));

        if (isFirstLoad) return;
        for (const m of fresh) {
          if (m.userId === p.id) continue;
          if (m.kind === "live") {
            liveQueueRef.current.push(m.audio);
            pumpLiveQueue();
            notify({
              kind: "live",
              title: `En vivo · ${m.userName || "Alguien"}`,
              text: "Transmitiendo ahora",
              userName: m.userName || undefined,
              avatar: m.userAvatar,
              durationMs: 3000,
            });
          } else {
            notify({
              kind: "voice",
              title: `Mensaje de voz · ${m.userName || "Alguien"}`,
              text: `Efecto: ${m.effect}${m.durationMs > 0 ? ` · ${(m.durationMs / 1000).toFixed(1)}s` : ""}`,
              userName: m.userName || undefined,
              avatar: m.userAvatar,
              actions: [
                {
                  label: "Reproducir",
                  primary: true,
                  onClick: () => playDataUrl(m.audio),
                },
              ],
              durationMs: 8000,
            });
          }
          incUnread();
        }
      } catch {
        setOnline(false);
      }
    };
    tick();
    const iv = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [currentRoomId, profile, pumpLiveQueue]);

  /* ---------- Enviar audio ---------- */
  const sendBlob = useCallback(
    async (blob: Blob, kind: "voice" | "live") => {
      const roomId = roomRef.current;
      const p = profileRef.current;
      if (!roomId || !p) return;
      try {
        setSending(true);
        const eff = effectRef.current;
        const processed =
          eff === "normal" && kind === "live"
            ? { dataUrl: await blobToDataUrl(blob), durationMs: 0 }
            : await applyEffect(blob, eff);
        await api(`/api/messages`, {
          method: "POST",
          body: JSON.stringify({
            roomId,
            userId: p.id,
            kind,
            effect: eff,
            audio: processed.dataUrl,
            durationMs: processed.durationMs,
          }),
        });
        setOnline(true);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Error al enviar", true);
        setOnline(false);
      } finally {
        setSending(false);
      }
    },
    [showToast]
  );

  /* ---------- Push To Talk ---------- */
  const pttDown = useCallback(async () => {
    if (talkingRef.current || !roomRef.current) return;
    getCtx();
    talkingRef.current = true;
    setTalking(true);
    try {
      if (modeRef.current === "voz") {
        recorderRef.current = new PttRecorder();
        await recorderRef.current.start();
      } else {
        liveActiveRef.current = true;
        (async () => {
          while (liveActiveRef.current) {
            const rec = new PttRecorder();
            try {
              await rec.start();
            } catch {
              liveActiveRef.current = false;
              break;
            }
            await new Promise((r) => setTimeout(r, 1300));
            const blob = await rec.stop();
            if (blob) sendBlob(blob, "live");
          }
        })();
      }
    } catch {
      talkingRef.current = false;
      setTalking(false);
      showToast("No se pudo acceder al micrófono", true);
    }
  }, [sendBlob, showToast]);

  const pttUp = useCallback(async () => {
    if (!talkingRef.current) return;
    talkingRef.current = false;
    setTalking(false);
    if (modeRef.current === "voz") {
      const rec = recorderRef.current;
      recorderRef.current = null;
      const blob = await rec?.stop();
      if (blob) sendBlob(blob, "voice");
      else showToast("Audio muy corto", true);
    } else {
      liveActiveRef.current = false;
    }
  }, [sendBlob, showToast]);

  /* ---------- Barra espaciadora ---------- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName)) return;
      e.preventDefault();
      pttDown();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      pttUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [pttDown, pttUp]);

  /* ---------- Grabación de la sesión ---------- */
  const toggleSessionRec = async () => {
    if (isSessionRecording()) {
      const blob = await stopSessionRecording();
      setSessionRec(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hypersonic-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Grabación guardada en tu dispositivo");
      }
    } else {
      const ok = await startSessionRecording();
      if (ok) {
        setSessionRec(true);
        showToast("Grabando todo el chat en vivo…");
      } else showToast("No se pudo iniciar la grabación", true);
    }
  };

  /* ---------- Acciones ---------- */
  const playMsg = async (m: Msg) => {
    setPlayingId(m.id);
    await playDataUrl(m.audio, () => setPlayingId((p) => (p === m.id ? null : p)));
  };

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || null;
  const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
  const older = msgs.slice(0, -1).reverse();
  const friendIds = new Set(friendsData.friends.map((f) => f.id));
  const outgoingIds = new Set(friendsData.outgoing.map((o) => o.to.id));
  const incomingIds = new Set(friendsData.incoming.map((i) => i.from.id));
  const pendingCount =
    friendsData.incoming.length + rooms.reduce((n, r) => n + r.pendingRequests.length, 0);

  if (!loadedLocal)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Cargando…
      </div>
    );

  return (
    <div
      className="min-h-screen flex flex-col"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button,select,label.clicky")) playClick();
      }}
    >
      {!profile ? (
        <Onboarding
          onDone={(p) => {
            setProfile(p);
            localStorage.setItem("hs_user", JSON.stringify(p));
          }}
          showToast={showToast}
        />
      ) : (
        <>
          <header className="panel !rounded-none !border-x-0 !border-t-0 px-5 py-3 flex items-center gap-3 z-10">
            <IconWalkie size={26} />
            <div className="mr-auto">
              <h1 className="text-lg leading-tight brand-logo flex items-center gap-2">
                HYPERSONIC
                <span
                  className={`conn-dot ${online ? "online" : "offline"}`}
                  title={online ? "Conectado" : "Sin conexión"}
                />
              </h1>
              <p className="fw-t text-[11px]" style={{ color: "var(--muted)" }}>
                Presiona para hablar · efectos de voz · en vivo
              </p>
            </div>
            <button
              className={`btn flex items-center gap-2 ${sessionRec ? "btn-danger" : ""}`}
              onClick={toggleSessionRec}
              title="Graba el audio que entra y sale del chat en vivo"
            >
              <IconRecord size={15} className={sessionRec ? "animate-pulse" : ""} />
              {sessionRec ? "Detener" : "Grabar"}
            </button>
            <button className="btn relative" onClick={() => setSettingsOpen(true)} title="Configuración">
              <IconGear size={16} />
              {pendingCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[10px] rounded-full w-4.5 h-4.5 px-1 flex items-center justify-center"
                  style={{ background: "var(--danger)", color: "#fff" }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-2" style={{ borderLeft: "1px solid var(--border)" }}>
              <Avatar user={profile} size={32} />
              <span className="text-sm">{profile.name}</span>
            </div>
          </header>

          <div className="flex flex-1 gap-4 p-4 max-w-[1200px] w-full mx-auto min-h-0">
            <aside className="panel w-[300px] shrink-0 p-3 flex flex-col gap-3 self-start max-h-[calc(100vh-110px)]">
              <div className="flex gap-2">
                <button
                  className={`btn flex-1 flex items-center justify-center gap-2 ${sideTab === "salas" ? "btn-primary" : ""}`}
                  onClick={() => setSideTab("salas")}
                >
                  <IconAntenna size={15} /> Salas
                </button>
                <button
                  className={`btn flex-1 flex items-center justify-center gap-2 ${sideTab === "amigos" ? "btn-primary" : ""}`}
                  onClick={() => setSideTab("amigos")}
                >
                  <IconUsers size={15} /> Amigos
                  {friendsData.incoming.length > 0 && (
                    <span
                      className="text-[10px] rounded-full px-1.5"
                      style={{ background: "var(--danger)", color: "#fff" }}
                    >
                      {friendsData.incoming.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="overflow-y-auto scroll-thin flex flex-col gap-2 pr-1">
                {sideTab === "salas" ? (
                  <RoomsPanel
                    rooms={rooms}
                    profile={profile}
                    currentRoomId={currentRoomId}
                    onOpen={(id) => setCurrentRoomId(id)}
                    onChanged={refreshWorld}
                    showToast={showToast}
                  />
                ) : (
                  <FriendsPanel
                    profile={profile}
                    friendsData={friendsData}
                    allUsers={allUsers}
                    friendIds={friendIds}
                    outgoingIds={outgoingIds}
                    incomingIds={incomingIds}
                    onChanged={refreshWorld}
                    showToast={showToast}
                  />
                )}
              </div>
            </aside>

            <main className="flex-1 flex flex-col gap-4 min-w-0">
              {!currentRoom || !currentRoom.isMember ? (
                <div className="panel flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center fade-up">
                  <IconWalkie size={52} />
                  <h2 className="text-xl">Elige una sala para empezar</h2>
                  <p className="fw-t text-sm max-w-sm" style={{ color: "var(--muted)" }}>
                    Entra a una de las salas de la izquierda. Si está vacía entras directo; si tiene
                    miembros, envía una solicitud (deben ser tus amigos).
                  </p>
                  <p className="fw-t text-xs max-w-md mt-2" style={{ color: "var(--muted)" }}>
                    Comparte la URL de HYPERSONIC con otras personas para chatear entre distintos dispositivos.
                  </p>
                </div>
              ) : (
                <>
                  <div className="panel px-4 py-3 flex items-center gap-3 fade-up">
                    <IconAntenna size={20} />
                    <div className="mr-auto">
                      <h2 className="text-base leading-tight">{currentRoom.name}</h2>
                      <p className="fw-t text-[11px]" style={{ color: "var(--muted)" }}>
                        {currentRoom.members.length}/{currentRoom.maxMembers} conectados
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      {currentRoom.members.map((m) => (
                        <div key={m.id} title={m.name}>
                          <Avatar user={m} size={30} />
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-danger text-xs"
                      onClick={async () => {
                        await api(`/api/rooms?roomId=${currentRoom.id}&userId=${profile.id}`, { method: "DELETE" });
                        setCurrentRoomId(null);
                        refreshWorld();
                      }}
                    >
                      Salir
                    </button>
                  </div>

                  <div className="panel p-5 fade-up">
                    <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
                      Último audio
                    </p>
                    {!lastMsg ? (
                      <p className="fw-t text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
                        Todavía no hay audios. ¡Mantén presionado el botón y habla!
                      </p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <Avatar user={{ name: lastMsg.userName || "?", avatar: lastMsg.userAvatar }} size={46} />
                        <div className="mr-auto min-w-0">
                          <p className="text-sm truncate">
                            {lastMsg.userId === profile.id ? "Tú" : lastMsg.userName}
                            {lastMsg.kind === "live" && (
                              <span className="chip ml-2 inline-flex items-center gap-1">
                                <IconLive size={11} /> en vivo
                              </span>
                            )}
                          </p>
                          <p className="fw-t text-[11px]" style={{ color: "var(--muted)" }}>
                            {fmtTime(lastMsg.createdAt)} · efecto {lastMsg.effect}
                            {lastMsg.durationMs > 0 && ` · ${(lastMsg.durationMs / 1000).toFixed(1)}s`}
                          </p>
                        </div>
                        {playingId === lastMsg.id && (
                          <span className="eq"><span /><span /><span /><span /></span>
                        )}
                        <button
                          className="btn btn-primary !rounded-full !p-3.5"
                          onClick={() => playMsg(lastMsg)}
                          title="Reproducir"
                        >
                          <IconPlay size={18} />
                        </button>
                        <button
                          className="btn !rounded-full !p-3"
                          title="Guardar en el dispositivo"
                          onClick={() =>
                            downloadDataUrl(
                              lastMsg.audio,
                              `hypersonic-${lastMsg.userName || "user"}-${lastMsg.id}.wav`
                            )
                          }
                        >
                          <IconDownload size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="panel fade-up overflow-hidden">
                    <button
                      className="w-full px-4 py-3 flex items-center gap-2 text-sm"
                      onClick={() => setDrawerOpen((o) => !o)}
                    >
                      <IconTray size={16} />
                      Bandeja de audios anteriores
                      <span className="chip">{older.length}</span>
                      <IconChevron
                        size={16}
                        className={`ml-auto transition-transform ${drawerOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {drawerOpen && (
                      <div
                        className="max-h-56 overflow-y-auto scroll-thin px-3 pb-3 flex flex-col gap-1.5"
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {older.length === 0 && (
                          <p className="fw-t text-xs py-4 text-center" style={{ color: "var(--muted)" }}>
                            No hay audios anteriores
                          </p>
                        )}
                        {older.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-xl mt-1.5"
                            style={{ background: "var(--accent-soft)" }}
                          >
                            <Avatar user={{ name: m.userName || "?", avatar: m.userAvatar }} size={26} />
                            <span className="text-xs truncate mr-auto">
                              {m.userId === profile.id ? "Tú" : m.userName}
                              <span className="fw-t ml-2" style={{ color: "var(--muted)" }}>
                                {fmtTime(m.createdAt)} · {m.effect}
                                {m.kind === "live" ? " · en vivo" : ""}
                              </span>
                            </span>
                            {playingId === m.id && (
                              <span className="eq"><span /><span /><span /><span /></span>
                            )}
                            <button className="btn !p-2 !rounded-full" onClick={() => playMsg(m)}>
                              <IconPlay size={12} />
                            </button>
                            <button
                              className="btn !p-2 !rounded-full"
                              onClick={() =>
                                downloadDataUrl(m.audio, `hypersonic-${m.userName || "user"}-${m.id}.wav`)
                              }
                            >
                              <IconDownload size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="panel p-5 flex flex-col items-center gap-4 fade-up">
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <div
                        className="flex rounded-xl overflow-hidden"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <button
                          className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${mode === "voz" ? "" : "fw-t"}`}
                          style={mode === "voz" ? { background: "var(--accent)", color: "var(--on-accent)" } : {}}
                          onClick={() => setMode("voz")}
                        >
                          <IconMic size={13} /> Mensajes de voz
                        </button>
                        <button
                          className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${mode === "vivo" ? "" : "fw-t"}`}
                          style={mode === "vivo" ? { background: "var(--accent)", color: "var(--on-accent)" } : {}}
                          onClick={() => setMode("vivo")}
                        >
                          <IconLive size={13} /> En vivo
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <EffectIcon id={EFFECTS.find((e) => e.id === effect)?.emojiSvg || "wave"} size={17} />
                        <select
                          className="input !w-auto !py-2 text-xs"
                          value={effect}
                          onChange={(e) => setEffect(e.target.value as EffectId)}
                        >
                          {EFFECTS.map((e) => (
                            <option key={e.id} value={e.id}>
                              Efecto: {e.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {sending && (
                        <span className="chip animate-pulse">enviando…</span>
                      )}
                    </div>

                    <button
                      className={`ptt ${talking ? "talking" : ""}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pttDown();
                      }}
                      onPointerUp={pttUp}
                      onPointerLeave={() => talkingRef.current && pttUp()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <IconMic size={44} />
                      <span className="text-[11px] tracking-widest">
                        {talking ? (mode === "vivo" ? "TRANSMITIENDO…" : "GRABANDO…") : "MANTÉN PARA HABLAR"}
                      </span>
                    </button>
                    <p className="fw-t text-[11px]" style={{ color: "var(--muted)" }}>
                      También puedes mantener presionada la <b>barra espaciadora</b>
                    </p>
                  </div>
                </>
              )}
            </main>
          </div>
        </>
      )}

      {settingsOpen && profile && (
        <SettingsModal
          profile={profile}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          onTheme={applyTheme}
          onProfile={(p) => {
            setProfile(p);
            localStorage.setItem("hs_user", JSON.stringify(p));
          }}
          onLogout={() => {
            localStorage.removeItem("hs_user");
            setProfile(null);
            setSettingsOpen(false);
            setCurrentRoomId(null);
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div
          className="panel fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 text-sm z-50 fade-up"
          style={toast.bad ? { borderColor: "var(--danger)", color: "var(--danger)" } : {}}
        >
          {toast.text}
        </div>
      )}

      {/* Sistema de notificaciones hermosas */}
      <NotifyToaster />
    </div>
  );
}

/* ================= Onboarding ================= */
function Onboarding({
  onDone,
  showToast,
}: {
  onDone: (p: Profile) => void;
  showToast: (t: string, bad?: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    try {
      setBusy(true);
      setErr("");
      const d = await api<{ user: Profile }>(`/api/users`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      onDone(d.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setErr(msg);
      showToast(msg, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel p-8 w-full max-w-md flex flex-col items-center gap-5 fade-up">
        <IconWalkie size={54} />
        <div className="text-center">
          <h1 className="text-2xl brand-logo">HYPERSONIC</h1>
          <p className="fw-t text-sm mt-1" style={{ color: "var(--muted)" }}>
            Crea tu perfil para empezar a transmitir
          </p>
        </div>
        <label className="clicky cursor-pointer flex flex-col items-center gap-2">
          {avatar ? (
            <img src={avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border" />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent-soft)", border: "2px dashed var(--border-strong)" }}
            >
              <IconCamera size={28} />
            </div>
          )}
          <span className="fw-t text-xs" style={{ color: "var(--muted)" }}>
            Foto de perfil (opcional)
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setAvatar(await resizeImage(f));
            }}
          />
        </label>
        <input
          className="input text-center"
          placeholder="Tu nombre de usuario"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && !busy && submit()}
        />
        {err && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary w-full py-3" disabled={busy || !name.trim()} onClick={submit}>
          {busy ? "Creando…" : "Entrar al canal"}
        </button>
      </div>
    </div>
  );
}

/* ================= Panel de salas ================= */
function RoomsPanel(props: {
  rooms: Room[];
  profile: Profile;
  currentRoomId: number | null;
  onOpen: (id: number) => void;
  onChanged: () => void;
  showToast: (t: string, bad?: boolean) => void;
}) {
  const { rooms, profile, currentRoomId, onOpen, onChanged, showToast } = props;
  const [newRoom, setNewRoom] = useState("");

  return (
    <>
      {rooms.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl p-3 flex flex-col gap-2"
          style={{
            background: currentRoomId === r.id ? "var(--accent-soft)" : "transparent",
            border: `1px solid ${currentRoomId === r.id ? "var(--border-strong)" : "var(--border)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <IconAntenna size={16} />
            <span className="text-sm truncate mr-auto">{r.name}</span>
            <span className="chip">
              {r.members.length}/{r.maxMembers}
            </span>
          </div>
          {r.members.length > 0 && (
            <div className="flex -space-x-1.5">
              {r.members.map((m) => (
                <div key={m.id} title={m.name}>
                  <Avatar user={m} size={22} />
                </div>
              ))}
            </div>
          )}
          {r.pendingRequests.map((pr) => (
            <div
              key={pr.requestId}
              className="flex items-center gap-2 text-xs rounded-xl px-2 py-1.5"
              style={{ background: "var(--accent-soft)" }}
            >
              <IconBell size={12} />
              <span className="truncate mr-auto fw-t">{pr.user.name} quiere unirse</span>
              <button
                className="btn !p-1.5 !rounded-full"
                onClick={async () => {
                  try {
                    await api(`/api/rooms`, {
                      method: "PATCH",
                      body: JSON.stringify({ requestId: pr.requestId, action: "accept" }),
                    });
                    onChanged();
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Error", true);
                  }
                }}
              >
                <IconCheck size={12} />
              </button>
              <button
                className="btn !p-1.5 !rounded-full btn-danger"
                onClick={async () => {
                  await api(`/api/rooms`, {
                    method: "PATCH",
                    body: JSON.stringify({ requestId: pr.requestId, action: "reject" }),
                  });
                  onChanged();
                }}
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
          {r.isMember ? (
            <button className="btn btn-primary text-xs" onClick={() => onOpen(r.id)}>
              Abrir sala
            </button>
          ) : r.requested ? (
            <span className="chip text-center">Solicitud enviada</span>
          ) : (
            <button
              className="btn text-xs"
              onClick={async () => {
                try {
                  const d = await api<{ joined?: boolean; requested?: boolean }>(`/api/rooms`, {
                    method: "POST",
                    body: JSON.stringify({ roomId: r.id, userId: profile.id }),
                  });
                  showToast(d.joined ? "¡Entraste a la sala!" : "Solicitud enviada");
                  onChanged();
                } catch (e) {
                  showToast(e instanceof Error ? e.message : "Error", true);
                }
              }}
            >
              {r.members.length === 0 ? "Entrar" : "Solicitar unirse"}
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-2 mt-1">
        <input
          className="input !py-2 text-xs"
          placeholder="Nueva sala…"
          value={newRoom}
          maxLength={30}
          onChange={(e) => setNewRoom(e.target.value)}
        />
        <button
          className="btn !px-3"
          disabled={!newRoom.trim()}
          onClick={async () => {
            try {
              await api(`/api/rooms`, {
                method: "POST",
                body: JSON.stringify({ action: "create", name: newRoom.trim(), userId: profile.id }),
              });
              setNewRoom("");
              onChanged();
            } catch (e) {
              showToast(e instanceof Error ? e.message : "Error", true);
            }
          }}
        >
          <IconPlus size={14} />
        </button>
      </div>
    </>
  );
}

/* ================= Panel de amigos ================= */
function FriendsPanel(props: {
  profile: Profile;
  friendsData: FriendsData;
  allUsers: PubUser[];
  friendIds: Set<number>;
  outgoingIds: Set<number>;
  incomingIds: Set<number>;
  onChanged: () => void;
  showToast: (t: string, bad?: boolean) => void;
}) {
  const { profile, friendsData, allUsers, friendIds, outgoingIds, incomingIds, onChanged, showToast } = props;
  const strangers = allUsers.filter(
    (u) => !friendIds.has(u.id) && !outgoingIds.has(u.id) && !incomingIds.has(u.id)
  );

  const respond = async (requestId: number, action: "accept" | "reject") => {
    await api(`/api/friends`, { method: "PATCH", body: JSON.stringify({ requestId, action }) });
    onChanged();
  };

  return (
    <>
      {friendsData.incoming.length > 0 && (
        <p className="text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Solicitudes recibidas
        </p>
      )}
      {friendsData.incoming.map((r) => (
        <div
          key={r.requestId}
          className="flex items-center gap-2 rounded-xl p-2"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <Avatar user={r.from} size={28} />
          <span className="text-xs truncate mr-auto">{r.from.name}</span>
          <button className="btn !p-1.5 !rounded-full" onClick={() => respond(r.requestId, "accept")}>
            <IconCheck size={13} />
          </button>
          <button className="btn !p-1.5 !rounded-full btn-danger" onClick={() => respond(r.requestId, "reject")}>
            <IconX size={13} />
          </button>
        </div>
      ))}

      <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
        Mis amigos ({friendsData.friends.length})
      </p>
      {friendsData.friends.length === 0 && (
        <p className="fw-t text-xs" style={{ color: "var(--muted)" }}>
          Aún no tienes amigos. Agrega a alguien de la lista de abajo.
        </p>
      )}
      {friendsData.friends.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-xl p-2" style={{ border: "1px solid var(--border)" }}>
          <Avatar user={f} size={28} />
          <span className="text-xs truncate">{f.name}</span>
          <IconCheck size={13} className="ml-auto opacity-60" />
        </div>
      ))}

      {friendsData.outgoing.length > 0 && (
        <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
          Enviadas
        </p>
      )}
      {friendsData.outgoing.map((o) => (
        <div key={o.requestId} className="flex items-center gap-2 rounded-xl p-2 fw-t text-xs" style={{ border: "1px dashed var(--border)" }}>
          <Avatar user={o.to} size={24} />
          {o.to.name} <span className="ml-auto" style={{ color: "var(--muted)" }}>pendiente…</span>
        </div>
      ))}

      <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
        Personas en la red ({strangers.length})
      </p>
      {strangers.length === 0 && (
        <p className="fw-t text-xs" style={{ color: "var(--muted)" }}>
          No hay más personas conectadas todavía. ¡Comparte la URL de HYPERSONIC!
        </p>
      )}
      {strangers.map((u) => (
        <div key={u.id} className="flex items-center gap-2 rounded-xl p-2" style={{ border: "1px solid var(--border)" }}>
          <Avatar user={u} size={28} />
          <span className="text-xs truncate mr-auto">{u.name}</span>
          <button
            className="btn text-[11px] !py-1"
            onClick={async () => {
              try {
                await api(`/api/friends`, {
                  method: "POST",
                  body: JSON.stringify({ requesterId: profile.id, addresseeId: u.id }),
                });
                showToast("Solicitud de chat enviada");
                onChanged();
              } catch (e) {
                showToast(e instanceof Error ? e.message : "Error", true);
              }
            }}
          >
            Agregar
          </button>
        </div>
      ))}
    </>
  );
}

/* ================= Configuración ================= */
function SettingsModal(props: {
  profile: Profile;
  theme: Theme;
  onClose: () => void;
  onTheme: (t: Theme) => void;
  onProfile: (p: Profile) => void;
  onLogout: () => void;
  showToast: (t: string, bad?: boolean) => void;
}) {
  const { profile, theme, onClose, onTheme, onProfile, onLogout, showToast } = props;
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [pendingTheme, setPendingTheme] = useState<Theme>(theme);
  const [cfg, setCfg] = useState(getNotifConfig());

  const updateCfg = (key: keyof typeof cfg, value: NotifSoundId) => {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    setNotifConfig(next);
    saveNotifConfig();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="panel w-full max-w-lg p-6 flex flex-col gap-5 fade-up max-h-[92vh] overflow-y-auto scroll-thin" style={{ background: "var(--panel-solid)" }}>
        <div className="flex items-center gap-2">
          <IconGear size={20} />
          <h2 className="text-lg mr-auto">Configuración</h2>
          <button className="btn !p-2 !rounded-full" onClick={onClose} title="Cerrar">
            <IconX size={16} />
          </button>
        </div>

        <section className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Mi perfil
          </p>
          <div className="flex items-center gap-4">
            <label className="clicky cursor-pointer relative">
              <Avatar user={{ name, avatar }} size={64} />
              <span
                className="absolute -bottom-1 -right-1 rounded-full p-1.5"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <IconCamera size={12} />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setAvatar(await resizeImage(f));
                }}
              />
            </label>
            <input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
            <button
              className="btn btn-primary shrink-0"
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  const d = await api<{ user: Profile }>(`/api/users`, {
                    method: "PATCH",
                    body: JSON.stringify({ id: profile.id, name: name.trim(), avatar: avatar ?? undefined }),
                  });
                  onProfile(d.user);
                  showToast("Perfil guardado");
                } catch {
                  showToast("Error al guardar", true);
                }
              }}
            >
              Guardar
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Tema de color
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className="rounded-2xl p-3 flex flex-col items-center gap-2 text-xs transition-all"
                style={{
                  border: `2px solid ${pendingTheme === t.id ? "var(--border-strong)" : "var(--border)"}`,
                  background: pendingTheme === t.id ? "var(--accent-soft)" : "transparent",
                }}
                onClick={() => setPendingTheme(t.id)}
              >
                <span className="flex gap-1">
                  {t.sw.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: "1px solid rgba(128,128,128,0.4)" }} />
                  ))}
                </span>
                {t.label}
                <span className="fw-t text-[10px]" style={{ color: "var(--muted)" }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
          {pendingTheme !== theme && (
            <button className="btn btn-primary" onClick={() => { onTheme(pendingTheme); showToast("Tema aplicado"); }}>
              <span className="inline-flex items-center gap-2">
                <IconCheck size={14} /> Confirmar cambio de tema
              </span>
            </button>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Sonidos de notificación
          </p>
          <SoundRow
            label="Mensajes de voz"
            value={cfg.voice}
            onChange={(v) => updateCfg("voice", v)}
          />
          <SoundRow
            label="Solicitudes de amistad"
            value={cfg.friend}
            onChange={(v) => updateCfg("friend", v)}
          />
          <SoundRow
            label="Solicitudes de sala"
            value={cfg.room}
            onChange={(v) => updateCfg("room", v)}
          />
        </section>

        <button className="btn btn-danger self-start" onClick={onLogout}>
          <span className="inline-flex items-center gap-2">
            <IconLogout size={14} /> Cerrar sesión en este dispositivo
          </span>
        </button>
      </div>
    </div>
  );
}

function SoundRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: NotifSoundId;
  onChange: (v: NotifSoundId) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs flex-1">{label}</span>
      <select
        className="input !w-auto !py-2 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value as NotifSoundId)}
      >
        {NOTIF_SOUNDS.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
          </option>
        ))}
      </select>
      <button
        className="btn shrink-0 !py-2"
        onClick={() => previewSound(value)}
        title="Probar sonido"
      >
        <IconBell size={13} />
      </button>
    </div>
  );
}
