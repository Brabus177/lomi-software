"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { AffineTransform } from "@/lib/georef";
import type { TeamLive } from "@/components/map/LiveTeamLayer";
import { t } from "@/lib/i18n";

const PdfBasemapMap = dynamic(
  () => import("@/components/map/PdfBasemap").then((m) => m.PdfBasemapMap),
  { ssr: false },
);
const LiveTeamLayer = dynamic(
  () => import("@/components/map/LiveTeamLayer").then((m) => m.LiveTeamLayer),
  { ssr: false },
);

type TeamRow = { id: string; name: string; color: string; share_token: string };

export function LiveSession({
  sessionId,
  title,
  date,
  map,
  teams,
}: {
  sessionId: string;
  title: string;
  date: string;
  map: {
    id: string;
    label: string;
    image_url: string;
    image_w: number;
    image_h: number;
    georef_transform: AffineTransform;
  };
  teams: TeamRow[];
}) {
  const [live, setLive] = useState<Record<string, TeamLive>>(() =>
    Object.fromEntries(
      teams.map((tm) => [tm.id, { id: tm.id, name: tm.name, color: tm.color, trail: [], bags: [] }]),
    ),
  );

  useEffect(() => {
    const sb = supabaseBrowser();
    const teamIds = teams.map((tm) => tm.id);
    if (teamIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const [pos, bg] = await Promise.all([
        sb.from("positions").select("team_id, lat, lng, ts").in("team_id", teamIds).order("ts"),
        sb.from("bags").select("id, team_id, lat, lng, note, ts").in("team_id", teamIds).order("ts"),
      ]);
      if (cancelled) return;
      setLive((prev) => {
        const next = { ...prev };
        for (const p of pos.data ?? []) {
          const tm = next[p.team_id as string];
          if (!tm) continue;
          tm.trail.push({ lat: p.lat as number, lng: p.lng as number, ts: p.ts as string });
        }
        for (const b of bg.data ?? []) {
          const tm = next[b.team_id as string];
          if (!tm) continue;
          tm.bags.push({
            id: b.id as string,
            lat: b.lat as number,
            lng: b.lng as number,
            ts: b.ts as string,
            note: b.note as string | null,
          });
        }
        return next;
      });
    })();

    const channel = sb
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "positions", filter: `team_id=in.(${teamIds.join(",")})` },
        (payload: { new: Record<string, unknown> }) => {
          const p = payload.new as { team_id: string; lat: number; lng: number; ts: string };
          setLive((prev) => {
            const tm = prev[p.team_id];
            if (!tm) return prev;
            return {
              ...prev,
              [p.team_id]: { ...tm, trail: [...tm.trail, { lat: p.lat, lng: p.lng, ts: p.ts }] },
            };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bags", filter: `team_id=in.(${teamIds.join(",")})` },
        (payload: { new: Record<string, unknown> }) => {
          const b = payload.new as { id: string; team_id: string; lat: number; lng: number; note: string | null; ts: string };
          setLive((prev) => {
            const tm = prev[b.team_id];
            if (!tm) return prev;
            return {
              ...prev,
              [b.team_id]: { ...tm, bags: [...tm.bags, { id: b.id, lat: b.lat, lng: b.lng, note: b.note, ts: b.ts }] },
            };
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [sessionId, teams]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 lg:h-[calc(100vh-9rem)]">
      <div className="h-[60vh] lg:h-auto rounded-2xl overflow-hidden border bg-muted shadow-sm">
        <PdfBasemapMap
          map={{
            imageUrl: map.image_url,
            imageW: map.image_w,
            imageH: map.image_h,
            transform: map.georef_transform,
          }}
        >
          {Object.values(live).map((tm) => (
            <LiveTeamLayer key={tm.id} team={tm} />
          ))}
        </PdfBasemapMap>
      </div>

      <aside className="lg:overflow-y-auto space-y-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title || map.label}</h1>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
        <ul className="space-y-2">
          {teams.map((tm) => {
            const stats = live[tm.id];
            const url = `${baseUrl}/t/${tm.share_token}`;
            return (
              <li key={tm.id} className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: tm.color }} />
                  <span className="font-medium">{tm.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {stats?.trail.length ?? 0} {t.session.positions} · {stats?.bags.length ?? 0} {t.session.bagsLabel}
                </div>
                <ShareLink url={url} />
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

function ShareLink({ url }: { url: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useMemo(() => {
    QRCode.toDataURL(url, { margin: 1, width: 180 }).then(setQr).catch(() => {});
  }, [url]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-2 h-8 text-xs border border-border rounded-lg bg-muted/40"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="text-xs px-2 h-8 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? t.session.copied : t.session.copy}
        </button>
      </div>
      {qr && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t.session.qrShow}</summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="mt-2 rounded-lg border bg-white p-1" width={180} height={180} />
        </details>
      )}
    </div>
  );
}
