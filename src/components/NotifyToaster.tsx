"use client";

import { useEffect, useState } from "react";
import {
  subscribeToasts,
  dismissToast,
  type Toast,
  type ToastAction,
} from "@/lib/notify";
import {
  IconBell,
  IconLive,
  IconMic,
  IconUsers,
  IconX,
} from "@/components/icons";

function iconForKind(kind: Toast["kind"]) {
  switch (kind) {
    case "voice": return <IconMic size={20} />;
    case "live": return <IconLive size={20} />;
    case "friend_request":
    case "friend_accepted":
      return <IconUsers size={20} />;
    case "room_request":
    case "room_accepted":
    case "system":
    default:
      return <IconBell size={20} />;
  }
}

function Avatar({ src, name, size = 36 }: { src?: string | null; name?: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border"
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "var(--accent-soft)",
        border: "1px solid var(--border)",
      }}
      className="rounded-full flex items-center justify-center font-bold text-sm"
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function NotifyToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  return (
    <div className="notify-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`notify slide-in-right ${t.bad ? "bad" : ""}`}>
          <div className="notify-icon">{iconForKind(t.kind)}</div>
          <div className="notify-body">
            <div className="notify-title">
              {t.avatar !== undefined && (
                <Avatar src={t.avatar} name={t.userName} size={20} />
              )}
              <span className="truncate">{t.title}</span>
            </div>
            {t.text && <div className="notify-text">{t.text}</div>}
            {t.actions && t.actions.length > 0 && (
              <div className="notify-actions">
                {t.actions.map((a: ToastAction, i: number) => (
                  <button
                    key={i}
                    className={`btn !py-1 !px-2 text-xs ${a.primary ? "btn-primary" : ""}`}
                    onClick={() => {
                      a.onClick();
                      dismissToast(t.id);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="notify-close"
            onClick={() => dismissToast(t.id)}
            title="Cerrar"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
