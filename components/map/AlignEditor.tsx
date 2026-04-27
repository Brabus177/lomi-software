"use client";

import "./leaflet-bootstrap";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import { fitAffine, pixelToLngLat, type AffineTransform, type ControlPoint } from "@/lib/georef";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type Corner = "nw" | "ne" | "sw";

type State = Record<Corner, LatLngLiteral>;

function cornersFromTransform(transform: AffineTransform, w: number, h: number): State {
  return {
    nw: ((p) => ({ lat: p.lat, lng: p.lng }))(pixelToLngLat(transform, 0, 0)),
    ne: ((p) => ({ lat: p.lat, lng: p.lng }))(pixelToLngLat(transform, w, 0)),
    sw: ((p) => ({ lat: p.lat, lng: p.lng }))(pixelToLngLat(transform, 0, h)),
  };
}

const ALIGN_PANE = "alignOverlayPane";

/** Render the image as a CSS-transformed <img> inside a dedicated map pane. */
function RotatedImageOverlay({
  url,
  state,
  imageW,
  imageH,
  opacity,
}: {
  url: string;
  state: State;
  imageW: number;
  imageH: number;
  opacity: number;
}) {
  const map = useMap();
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Create the pane + img once, destroy on unmount.
  useEffect(() => {
    let pane = map.getPane(ALIGN_PANE);
    if (!pane) {
      pane = map.createPane(ALIGN_PANE);
      pane.style.zIndex = "350"; // above tilePane (200), below markerPane (600)
      pane.style.pointerEvents = "none";
    }
    const img = document.createElement("img");
    img.style.position = "absolute";
    img.style.top = "0";
    img.style.left = "0";
    img.style.transformOrigin = "0 0";
    img.style.pointerEvents = "none";
    img.style.userSelect = "none";
    img.style.willChange = "transform";
    img.style.display = "block";
    img.draggable = false;
    img.alt = "";
    pane.appendChild(img);
    imgRef.current = img;
    return () => {
      img.remove();
      imgRef.current = null;
    };
  }, [map]);

  // Update src / size / opacity when they change.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.getAttribute("src") !== url) img.src = url;
    img.style.width = `${imageW}px`;
    img.style.height = `${imageH}px`;
    img.style.opacity = String(opacity);
  }, [url, imageW, imageH, opacity]);

  // Recompute the matrix transform on every map move / zoom / corner change.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const update = () => {
      const pNW = map.latLngToLayerPoint(state.nw);
      const pNE = map.latLngToLayerPoint(state.ne);
      const pSW = map.latLngToLayerPoint(state.sw);
      const a = (pNE.x - pNW.x) / imageW;
      const b = (pNE.y - pNW.y) / imageW;
      const c = (pSW.x - pNW.x) / imageH;
      const d = (pSW.y - pNW.y) / imageH;
      img.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${pNW.x}, ${pNW.y})`;
    };
    update();
    map.on("zoom", update);
    map.on("zoomend", update);
    map.on("move", update);
    map.on("moveend", update);
    map.on("viewreset", update);
    return () => {
      map.off("zoom", update);
      map.off("zoomend", update);
      map.off("move", update);
      map.off("moveend", update);
      map.off("viewreset", update);
    };
  }, [map, state, imageW, imageH]);

  return null;
}

const handleIcon = (label: string, color: string) =>
  L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `
      <div style="
        transform:translate(-50%,-50%);
        display:flex;flex-direction:column;align-items:center;gap:2px;
      ">
        <div style="
          width:24px;height:24px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
        "></div>
        <div style="
          background:white;border:1px solid ${color};color:#111;
          font:700 10px/1 system-ui;padding:2px 5px;border-radius:9999px;
          white-space:nowrap;
        ">${label}</div>
      </div>
    `,
  });

function CornerHandle({
  position,
  onChange,
  label,
  color,
}: {
  position: LatLngLiteral;
  onChange: (p: LatLngLiteral) => void;
  label: string;
  color: string;
}) {
  const icon = useMemo(() => handleIcon(label, color), [label, color]);
  return (
    <Marker
      position={position}
      icon={icon}
      draggable
      eventHandlers={{
        drag: (e) => {
          const m = e.target as L.Marker;
          const ll = m.getLatLng();
          onChange({ lat: ll.lat, lng: ll.lng });
        },
      }}
    />
  );
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
  const [state, setState] = useState<State>(() =>
    cornersFromTransform(initialTransform, imageW, imageH),
  );
  const [opacity, setOpacity] = useState(0.55);
  const [saving, setSaving] = useState(false);

  const center = useMemo<[number, number]>(() => {
    const lats = Object.values(state).map((p) => p.lat);
    const lngs = Object.values(state).map((p) => p.lng);
    return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
  }, [state]);

  const reset = () => setState(cornersFromTransform(initialTransform, imageW, imageH));

  const save = async () => {
    setSaving(true);
    try {
      const points: ControlPoint[] = [
        { px: 0, py: 0, lat: state.nw.lat, lng: state.nw.lng },
        { px: imageW, py: 0, lat: state.ne.lat, lng: state.ne.lng },
        { px: 0, py: imageH, lat: state.sw.lat, lng: state.sw.lng },
      ];
      await onSave(points);
    } finally {
      setSaving(false);
    }
  };

  // Sanity-check the current placement still fits an affine
  const ok = useMemo(() => {
    try {
      fitAffine([
        { px: 0, py: 0, lat: state.nw.lat, lng: state.nw.lng },
        { px: imageW, py: 0, lat: state.ne.lat, lng: state.ne.lng },
        { px: 0, py: imageH, lat: state.sw.lat, lng: state.sw.lng },
      ]);
      return true;
    } catch {
      return false;
    }
  }, [state, imageW, imageH]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:h-[calc(100vh-12rem)]">
      <div className="h-[60vh] lg:h-auto rounded-2xl overflow-hidden border bg-muted shadow-sm">
        <MapContainer
          center={center}
          zoom={15}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RotatedImageOverlay
            url={imageUrl}
            state={state}
            imageW={imageW}
            imageH={imageH}
            opacity={opacity}
          />
          <CornerHandle
            position={state.nw}
            label={t.align.nw}
            color="#dc2626"
            onChange={(p) => setState((s) => ({ ...s, nw: p }))}
          />
          <CornerHandle
            position={state.ne}
            label={t.align.ne}
            color="#16a34a"
            onChange={(p) => setState((s) => ({ ...s, ne: p }))}
          />
          <CornerHandle
            position={state.sw}
            label={t.align.sw}
            color="#2563eb"
            onChange={(p) => setState((s) => ({ ...s, sw: p }))}
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
          <Row label={t.align.nw} color="#dc2626" p={state.nw} />
          <Row label={t.align.ne} color="#16a34a" p={state.ne} />
          <Row label={t.align.sw} color="#2563eb" p={state.sw} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={reset} className="h-11 rounded-xl">
            {t.align.reset}
          </Button>
          <Button onClick={save} disabled={!ok || saving} className="h-11 rounded-xl">
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
