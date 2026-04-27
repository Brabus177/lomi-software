"use client";

import "./leaflet-bootstrap";
import { useMemo, useState } from "react";
import { ImageOverlay, MapContainer, Marker, useMapEvents } from "react-leaflet";
import L, { CRS, type LatLngBoundsExpression } from "leaflet";
import { fitAffine, residualMeters, type ControlPoint } from "@/lib/georef";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type DraftPoint = { px: number; py: number; lat: string; lng: string };

function ClickCapture({ onClick }: { onClick: (px: number, py: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lng, -e.latlng.lat);
    },
  });
  return null;
}

const numIcon = (n: number) =>
  L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:#dc2626;color:white;font:bold 13px/26px system-ui;text-align:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${n}</div>`,
  });

export function GeorefEditor({
  imageUrl,
  imageW,
  imageH,
  initialPoints,
  onSave,
}: {
  imageUrl: string;
  imageW: number;
  imageH: number;
  initialPoints?: ControlPoint[];
  onSave: (points: ControlPoint[]) => Promise<void> | void;
}) {
  const [points, setPoints] = useState<DraftPoint[]>(
    () =>
      initialPoints?.map((p) => ({
        px: p.px,
        py: p.py,
        lat: String(p.lat),
        lng: String(p.lng),
      })) ?? [],
  );
  const [saving, setSaving] = useState(false);

  const bounds = useMemo<LatLngBoundsExpression>(
    () => [
      [-imageH, 0],
      [0, imageW],
    ],
    [imageW, imageH],
  );

  const valid = points
    .map((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { px: p.px, py: p.py, lat, lng } : null;
    })
    .filter(Boolean) as ControlPoint[];

  const transform = valid.length >= 3 ? safeFit(valid) : null;
  const error = transform ? residualMeters(transform, valid) : null;

  const inputCls =
    "px-2 h-9 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:h-[calc(100vh-12rem)]">
      <div className="h-[55vh] lg:h-auto rounded-2xl overflow-hidden border bg-muted shadow-sm">
        <MapContainer
          crs={CRS.Simple}
          bounds={bounds}
          maxBounds={bounds}
          className="h-full w-full bg-muted"
          zoomSnap={0.25}
          minZoom={-3}
          maxZoom={3}
        >
          <ImageOverlay url={imageUrl} bounds={bounds} />
          <ClickCapture
            onClick={(px, py) =>
              setPoints((prev) => [...prev, { px, py, lat: "", lng: "" }])
            }
          />
          {points.map((p, i) => (
            <Marker key={i} position={[-p.py, p.px]} icon={numIcon(i + 1)} />
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3 lg:overflow-y-auto">
        <p className="text-xs text-muted-foreground rounded-xl bg-accent/40 border border-accent p-3">
          {t.georef.description}
        </p>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t.georef.pointsHeader}
          </h3>
          <span className="text-xs text-muted-foreground">{points.length}</span>
        </div>

        {points.length === 0 && (
          <div className="text-sm italic text-muted-foreground rounded-xl border border-dashed p-3 text-center">
            {t.georef.noPoints}
          </div>
        )}

        <ol className="flex flex-col gap-2">
          {points.map((p, i) => (
            <li key={i} className="rounded-xl border bg-card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center gap-2">
                  <span className="size-5 rounded-full bg-destructive text-destructive-foreground inline-flex items-center justify-center text-[11px] font-bold">{i + 1}</span>
                  {t.georef.point} {i + 1}
                </span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setPoints((prev) => prev.filter((_, j) => j !== i))}
                >
                  {t.georef.remove}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t.georef.latPlaceholder}
                  value={p.lat}
                  onChange={(e) =>
                    setPoints((prev) => prev.map((q, j) => (j === i ? { ...q, lat: e.target.value } : q)))
                  }
                  className={inputCls}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t.georef.lngPlaceholder}
                  value={p.lng}
                  onChange={(e) =>
                    setPoints((prev) => prev.map((q, j) => (j === i ? { ...q, lng: e.target.value } : q)))
                  }
                  className={inputCls}
                />
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl border bg-card p-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.georef.validPoints}:</span>
            <strong>{valid.length} / {points.length}</strong>
          </div>
          {error != null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.georef.fitError}:</span>
              <strong className={error < 20 ? "text-primary" : "text-amber-600"}>
                {error.toFixed(1)} m
              </strong>
            </div>
          )}
          {error == null && (
            <div className="text-xs text-muted-foreground">{t.georef.fitTarget}</div>
          )}
        </div>

        <Button
          disabled={!transform || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(valid);
            } finally {
              setSaving(false);
            }
          }}
          className="h-11 rounded-xl"
        >
          {saving ? t.georef.savingShort : t.georef.save}
        </Button>
      </div>
    </div>
  );
}

function safeFit(points: ControlPoint[]) {
  try {
    return fitAffine(points);
  } catch {
    return null;
  }
}
