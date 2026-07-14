"use client";

export type EffectId = "normal" | "grave" | "agudo" | "distorsion" | "robot" | "radio";

export const EFFECTS: { id: EffectId; label: string; emojiSvg: string }[] = [
  { id: "normal", label: "Normal", emojiSvg: "wave" },
  { id: "grave", label: "Grave (voz profunda)", emojiSvg: "down" },
  { id: "agudo", label: "Agudo (ardilla)", emojiSvg: "up" },
  { id: "distorsion", label: "Distorsión", emojiSvg: "bolt" },
  { id: "robot", label: "Robot", emojiSvg: "bot" },
  { id: "radio", label: "Radio antigua", emojiSvg: "radio" },
];

let sharedCtx: AudioContext | null = null;
export function getCtx(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

/* ---------- Sonido de click de botones ---------- */
export function playClick() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1900, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.045);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch {}
}

/* ---------- Sonidos de notificación personalizables ---------- */
export type NotifSound = "clasico" | "walkie" | "suave" | "silencio";
export const NOTIF_SOUNDS: { id: NotifSound; label: string }[] = [
  { id: "clasico", label: "Clásico (bip-bip)" },
  { id: "walkie", label: "Walkie (roger beep)" },
  { id: "suave", label: "Suave (campana)" },
  { id: "silencio", label: "Silencio" },
];

export function playNotif(kind: NotifSound) {
  if (kind === "silencio") return;
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime;
    const tone = (f: number, start: number, dur: number, vol = 0.14, type: OscillatorType = "sine") => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(vol, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.02);
    };
    if (kind === "clasico") {
      tone(880, 0, 0.12);
      tone(1320, 0.16, 0.14);
    } else if (kind === "walkie") {
      tone(1050, 0, 0.09, 0.16, "square");
      tone(1400, 0.1, 0.07, 0.12, "square");
    } else if (kind === "suave") {
      tone(660, 0, 0.5, 0.09);
      tone(990, 0.05, 0.6, 0.06);
    }
  } catch {}
}

/* ---------- Grabación de sesión en vivo (entrada + salida) ---------- */
let sessionDest: MediaStreamAudioDestinationNode | null = null;
let sessionRecorder: MediaRecorder | null = null;
let sessionChunks: Blob[] = [];
let micTap: MediaStreamAudioSourceNode | null = null;
let micTapStream: MediaStream | null = null;

export async function startSessionRecording(): Promise<boolean> {
  try {
    const ctx = getCtx();
    sessionDest = ctx.createMediaStreamDestination();
    micTapStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micTap = ctx.createMediaStreamSource(micTapStream);
    micTap.connect(sessionDest);
    sessionChunks = [];
    sessionRecorder = new MediaRecorder(sessionDest.stream, { mimeType: pickMime() });
    sessionRecorder.ondataavailable = (e) => {
      if (e.data.size) sessionChunks.push(e.data);
    };
    sessionRecorder.start(1000);
    return true;
  } catch {
    return false;
  }
}

export function stopSessionRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!sessionRecorder) return resolve(null);
    const rec = sessionRecorder;
    rec.onstop = () => {
      const blob = new Blob(sessionChunks, { type: rec.mimeType });
      micTapStream?.getTracks().forEach((t) => t.stop());
      micTap?.disconnect();
      sessionRecorder = null;
      sessionDest = null;
      micTap = null;
      micTapStream = null;
      resolve(blob.size ? blob : null);
    };
    rec.stop();
  });
}

export function isSessionRecording() {
  return sessionRecorder !== null && sessionRecorder.state === "recording";
}

/* ---------- Reproducción (con envío a la grabación de sesión) ---------- */
export async function playDataUrl(dataUrl: string, onEnd?: () => void): Promise<AudioBufferSourceNode | null> {
  try {
    const ctx = getCtx();
    const res = await fetch(dataUrl);
    const buf = await res.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(buf);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    if (sessionDest) src.connect(sessionDest);
    src.onended = () => onEnd?.();
    src.start();
    return src;
  } catch {
    onEnd?.();
    return null;
  }
}

/* ---------- Efectos de voz ---------- */
function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export async function applyEffect(
  blob: Blob,
  effect: EffectId
): Promise<{ dataUrl: string; durationMs: number }> {
  const ctx = getCtx();
  const raw = await blob.arrayBuffer();
  const decoded = await ctx.decodeAudioData(raw);

  const SR = 22050;
  const rate = effect === "grave" ? 0.72 : effect === "agudo" ? 1.4 : 1.0;
  const outLen = Math.max(1, Math.ceil((decoded.duration / rate) * SR) + SR / 10);
  const off = new OfflineAudioContext(1, outLen, SR);

  const src = off.createBufferSource();
  src.buffer = decoded;
  src.playbackRate.value = rate;

  let node: AudioNode = src;

  if (effect === "distorsion") {
    const pre = off.createGain();
    pre.gain.value = 6;
    const shaper = off.createWaveShaper();
    shaper.curve = distortionCurve(120);
    shaper.oversample = "4x";
    const post = off.createGain();
    post.gain.value = 0.5;
    node.connect(pre).connect(shaper).connect(post);
    node = post;
  } else if (effect === "robot") {
    const ring = off.createGain();
    ring.gain.value = 0;
    const osc = off.createOscillator();
    osc.frequency.value = 42;
    osc.connect(ring.gain);
    osc.start();
    const shaper = off.createWaveShaper();
    shaper.curve = distortionCurve(30);
    node.connect(ring).connect(shaper);
    node = shaper;
  } else if (effect === "radio") {
    const hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 500;
    const lp = off.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const pre = off.createGain();
    pre.gain.value = 3;
    const shaper = off.createWaveShaper();
    shaper.curve = distortionCurve(40);
    node.connect(hp).connect(lp).connect(pre).connect(shaper);
    node = shaper;
  }

  const comp = off.createDynamicsCompressor();
  node.connect(comp).connect(off.destination);
  src.start();

  const rendered = await off.startRendering();
  const wav = encodeWav(rendered);
  const dataUrl = await blobToDataUrl(new Blob([wav], { type: "audio/wav" }));
  return { dataUrl, durationMs: Math.round(rendered.duration * 1000) };
}

/* ---------- WAV encoder ---------- */
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const ch = buffer.getChannelData(0);
  const len = ch.length;
  const out = new ArrayBuffer(44 + len * 2);
  const view = new DataView(out);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len * 2, true);
  let offset = 44;
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return out;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c;
  return "";
}

/* ---------- Grabador PTT ---------- */
export class PttRecorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  startedAt = 0;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, { mimeType: pickMime() });
    this.rec.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.rec.start();
    this.startedAt = Date.now();
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const rec = this.rec;
      if (!rec || rec.state === "inactive") {
        this.cleanup();
        return resolve(null);
      }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType });
        this.cleanup();
        resolve(blob.size > 200 ? blob : null);
      };
      rec.stop();
    });
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}
