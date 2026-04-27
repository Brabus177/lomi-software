"use client";

import "./leaflet-bootstrap";
import "leaflet-distortableimage/dist/vendor.css";
import "leaflet-distortableimage/dist/leaflet.distortableimage.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import "leaflet-distortableimage";

import { pixelToLngLat, type AffineTransform, type ControlPoint } from "@/lib/georef";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type Corners = {
  nw: LatLngLiteral;
  ne: LatLngLiteral;
  sw: LatLngLiteral;
  se: LatLngLiteral;
};

interface DistortableLayer extends L.ImageOverlay {
  getCorners(): L.LatLng[];
  setOpacity(o: number): this;
}

interface DistortableFactory {
  distortableImageOverlay(url: string, opts?: Record<string, unknown>): DistortableLayer;
}

function cornersFromTransform(t: AffineTransform, w: number, h: number): Corners {
  const xy = (x: number, y: number) => {
    const p = pixelToLngLat(t, x, y);
    return { lat: p.lat, lng: p.lng };
  };
  return { nw: xy(0, 0), ne: xy(w, 0), se: xy(w, h), sw: xy(0, h) };
}

function DistortableImage({
  url,
  initial,
  opacity,
  onChange,
}: {
  url: string;
  initial: Corners;
  opacity: number;
  onChange: (c: Corners) => void;
}) {
  const map = useMap();
  const layerRef = useRef<DistortableLayer | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const corners = [
      L.latLng(initial.nw.lat, initial.nw.lng),
      L.latLng(initial.ne.lat, initial.ne.lng),
      L.latLng(initial.sw.lat, initial.sw.lng),
      L.latLng(initial.se.lat, initial.se.lng),
    ];

    const factory = L as unknown as DistortableFactory;
    const layer = factory.distortableImageOverlay(url, {
      corners,
      editable: true,
      mode: "distort",
      selected: true,
      suppressToolbar: false,
    });
    layer.addTo(map);
    layerRef.current = layer;

    const handle = () => {
      const c = layer.getCorners();
      onChangeRef.current({
        nw: { lat: c[0].lat, lng: c[0].lng },
        ne: { lat: c[1].lat, lng: c[1].lng },
        sw: { lat: c[2].lat, lng: c[2].lng },
        se: { lat: c[3].lat, lng: c[3].lng },
      });
    };

    // The plugin emits a few different events depending on the active edit
    // tool; listen broadly so we never miss a change.
    layer.on("update", handle);
    layer.on("dragend", handle);
    layer.on("rotateend", handle);
    layer.on("scaleend", handle);
    layer.on("distortend", handle);

    return () => {
      layer.off("update", handle);
      layer.off("dragend", handle);
      layer.off("rotateend", handle);
      layer.off("scaleend", handle);
      layer.off("distortend", handle);
      layer.remove();
      layerRef.current = null;
    };
    // We only want this to run once per mounted url; corner edits shouldn't
    // remount the layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url]);

  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  return null;
}

export function AlignEditor({
  imageUrl,
  imageW,
  imageH,
  initialTransform,
  onSave,
}: {
  imageUrl: string;
  imageW: number;
  imageH: number;
  initialTransform: AffineTransform;
  onSave: (points: ControlPoint[]) => Promise<void> | void;
}) {
  const initialCorners = useMemo(
    () => cornersFromTransform(initialTransform, imageW, imageH),
    [initialTransform, imageW, imageH],
  );
  const [corners, setCorners] = useState<Corners>(initialCorners);
  const [opacity, setOpacity] = useState(0.55);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const center = useMemo<[number, number]>(() => {
    const lats = Object.values(initialCorners).map((p) => p.lat);
    const lngs = Object.values(initialCorners).map((p) => p.lng);
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
  }, [initialCorners]);

  const reset = () => {
    setCorners(initialCorners);
    setResetKey((k) => k + 1);
  };

  const save = async () => {
    setSaving(true);
    try {
      const points: ControlPoint[] = [
        { px: 0, py: 0, lat: corners.nw.lat, lng: corners.nw.lng },
        { px: imageW, py: 0, lat: corners.ne.lat, lng: corners.ne.lng },
        { px: imageW, py: imageH, lat: corners.se.lat, lng: corners.se.lng },
        { px: 0, py: imageH, lat: corners.sw.lat, lng: corners.sw.lng },
      ];
      await onSave(points);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:h-[calc(100vh-12rem)]">
      <div className="h-[60vh] lg:h-auto rounded-2xl overflow-hidden border bg-muted shadow-sm">
        <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DistortableImage
            // remount on reset so the plugin's internal corner state matches ours
            key={resetKey}
            url={imageUrl}
            initial={initialCorners}
            opacity={opacity}
            onChange={setCorners}
          />
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3 lg:overflow-y-auto">
        <p className="text-xs text-muted-foreground rounded-xl bg-accent/40 border border-accent p-3">
          {t.align.description}
        </p>

        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t.align.opacity}</label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-2 text-xs">
          <Row label={t.align.nw} color="#dc2626" p={corners.nw} />
          <Row label={t.align.ne} color="#16a34a" p={corners.ne} />
          <Row label={t.align.sw} color="#2563eb" p={corners.sw} />
          <Row label="DK" color="#a16207" p={corners.se} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={reset} className="h-11 rounded-xl">
            {t.align.reset}
          </Button>
          <Button onClick={save} disabled={saving} className="h-11 rounded-xl">
            {saving ? t.align.saving : t.align.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, color, p }: { label: string; color: string; p: LatLngLiteral }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      <span className="font-medium w-8">{label}</span>
      <span className="tabular-nums text-muted-foreground">
        {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
      </span>
    </div>
  );
}

