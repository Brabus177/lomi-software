"use client";

import "./leaflet-bootstrap";
import { useMemo } from "react";
import { ImageOverlay, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { imageBounds, type AffineTransform } from "@/lib/georef";

export type MapMeta = {
  imageUrl: string;
  imageW: number;
  imageH: number;
  transform: AffineTransform | null;
};

export function PdfBasemapMap({
  map,
  children,
  className,
  showOsmFallback = true,
}: {
  map: MapMeta;
  children?: React.ReactNode;
  className?: string;
  showOsmFallback?: boolean;
}) {
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!map.transform) return null;
    const b = imageBounds(map.transform, map.imageW, map.imageH);
    return [
      [b.south, b.west],
      [b.north, b.east],
    ];
  }, [map]);

  const center = useMemo<[number, number]>(() => {
    if (!bounds) return [47.4979, 19.0402]; // Budapest fallback
    const [[s, w], [n, e]] = bounds as [[number, number], [number, number]];
    return [(s + n) / 2, (w + e) / 2];
  }, [bounds]);

  return (
    <MapContainer
      center={center}
      zoom={15}
      bounds={bounds ?? undefined}
      className={className ?? "h-full w-full"}
      zoomControl={false}
    >
      {showOsmFallback && (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.4}
        />
      )}
      {bounds && (
        <ImageOverlay url={map.imageUrl} bounds={bounds} opacity={1} interactive={false} />
      )}
      {children}
    </MapContainer>
  );
}
