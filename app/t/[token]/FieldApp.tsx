"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Polyline } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { supabaseTeamClient } from "@/lib/supabase/browser";
import type { AffineTransform } from "@/lib/georef";
import type { Self } from "@/components/map/SelfMarker";
import { t } from "@/lib/i18n";

const PdfBasemapMap = dynamic(
  () => import("@/components/map/PdfBasemap").then((m) => m.PdfBasemapMap),
  { ssr: false },
);
const SelfMarker = dynamic(
  () => import("@/components/map/SelfMarker").then((m) => m.SelfMarker),
  { ssr: false },
);

type PermState = "idle" | "asking" | "granted" | "denied";

const POST_INTERVAL_MS = 2000;

export function FieldApp(props: {
  shareToken: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  mapImageUrl: string;
  mapImageW: number;
  mapImageH: number;
  mapTransform: AffineTransform;
}) {
  const [perm, setPerm] = useState<PermState>("idle");
  const [self, setSelf] = useState<Self | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [bagCount, setBagCount] = useState(0);
  const [follow, setFollow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulseBag, setPulseBag] = useState(0);
  const lastPostedRef = useRef<number>(0);

  const sb = useMemo(() => supabaseTeamClient(props.shareToken), [props.shareToken]);

  const beginTracking = useCallback(async () => {
    setPerm("asking");
    setError(null);

    type IOSDOEvent = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const DOE = (typeof DeviceOrientationEvent !== "undefined"
      ? (DeviceOrientationEvent as IOSDOEvent)
      : null);
    if (DOE?.requestPermission) {
      try {
        await DOE.requestPermission();
      } catch {
        // ignored
      }
    }

    if (!("geolocation" in navigator)) {
      setError(t.field.noGps);
      setPerm("denied");
      return;
    }

    setPerm("granted");
  }, []);

  useEffect(() => {
    if (perm !== "granted") return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: Self = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          accuracy: pos.coords.accuracy,
        };
        setSelf((prev) => ({ ...fix, heading: fix.heading ?? prev?.heading ?? null }));

        const now = Date.now();
        if (now - lastPostedRef.current >= POST_INTERVAL_MS) {
          lastPostedRef.current = now;
          setTrail((prev) => [...prev, [fix.lat, fix.lng]]);
          sb.from("positions")
            .insert({
              team_id: props.teamId,
              lat: fix.lat,
              lng: fix.lng,
              heading: fix.heading,
              accuracy: fix.accuracy,
            })
            .then(({ error }) => {
              if (error) console.warn("position insert failed:", error.message);
            });
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [perm, sb, props.teamId]);

  useEffect(() => {
    if (perm !== "granted") return;
    const handler = (e: DeviceOrientationEvent) => {
      type WebkitOE = DeviceOrientationEvent & { webkitCompassHeading?: number };
      const ev = e as WebkitOE;
      const heading = typeof ev.webkitCompassHeading === "number"
        ? ev.webkitCompassHeading
        : (typeof e.alpha === "number" ? 360 - e.alpha : null);
      if (heading == null) return;
      setSelf((prev) => prev ? { ...prev, heading } : prev);
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [perm]);

  const dropBag = useCallback(async () => {
    if (!self) return;
    setBagCount((n) => n + 1);
    setPulseBag((n) => n + 1);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(40); } catch { /* noop */ }
    }
    const { error } = await sb.from("bags").insert({
      team_id: props.teamId,
      lat: self.lat,
      lng: self.lng,
    });
    if (error) {
      setBagCount((n) => Math.max(0, n - 1));
      setError(`${t.field.bagSaveFailed}: ${error.message}`);
    }
  }, [self, sb, props.teamId]);

  if (perm !== "granted") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-background to-accent/40">
        <div className="w-full max-w-sm rounded-3xl border bg-card shadow-sm p-7 space-y-5">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t.field.badge}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: props.teamColor }}>
              {props.teamName}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.field.intro}</p>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button
            size="lg"
            onClick={beginTracking}
            disabled={perm === "asking"}
            className="w-full h-12 text-base rounded-2xl"
            style={{ background: props.teamColor }}
          >
            {perm === "asking" ? t.field.asking : t.field.start}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="px-3 py-2 flex items-center gap-3 bg-card border-b text-sm safe-top">
        <span className="size-3 rounded-full shrink-0" style={{ background: props.teamColor }} />
        <span className="font-medium truncate flex-1">{props.teamName}</span>
        <span className="tabular-nums text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
          {bagCount} {t.field.bagOne}
        </span>
        <button
          type="button"
          className={
            "text-xs px-2 py-1 rounded-full border transition " +
            (follow ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground")
          }
          onClick={() => setFollow((f) => !f)}
        >
          {follow ? `✓ ${t.field.follow}` : t.field.follow}
        </button>
      </header>

      <div className="flex-1 relative">
        <PdfBasemapMap
          map={{
            imageUrl: props.mapImageUrl,
            imageW: props.mapImageW,
            imageH: props.mapImageH,
            transform: props.mapTransform,
          }}
          showOsmFallback={false}
        >
          {trail.length > 1 && (
            <Polyline positions={trail} pathOptions={{ color: props.teamColor, weight: 4, opacity: 0.7 }} />
          )}
          <SelfMarker self={self} follow={follow} />
        </PdfBasemapMap>

        {error && (
          <div className="absolute top-2 left-2 right-2 bg-destructive text-destructive-foreground text-sm rounded-xl px-3 py-2 shadow-lg">
            {error}
          </div>
        )}
      </div>

      <div className="p-3 bg-card border-t safe-bottom">
        <button
          type="button"
          disabled={!self}
          onClick={dropBag}
          key={pulseBag}
          className="w-full h-16 text-lg font-semibold rounded-2xl text-white shadow-lg active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition relative overflow-hidden"
          style={{ background: props.teamColor }}
        >
          <span className="relative z-10">{t.field.drop}</span>
        </button>
      </div>
    </div>
  );
}
