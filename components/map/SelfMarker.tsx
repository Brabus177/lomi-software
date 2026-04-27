"use client";

import { useMemo } from "react";
import { Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";

export type Self = {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number | null;
};

export function SelfMarker({ self, follow }: { self: Self | null; follow: boolean }) {
  const map = useMap();

  const icon = useMemo(() => {
    const rotation = self?.heading ?? 0;
    const html = `
      <div style="position:relative;width:36px;height:36px;transform:translate(-50%,-50%);">
        <div style="
          position:absolute;left:50%;top:50%;transform:translate(-50%,-100%) rotate(${rotation}deg);
          transform-origin:50% 100%;
          width:0;height:0;
          border-left:14px solid transparent;
          border-right:14px solid transparent;
          border-bottom:22px solid rgba(37,99,235,0.45);
          pointer-events:none;
        "></div>
        <div style="
          position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:18px;height:18px;border-radius:50%;
          background:#2563eb;border:3px solid white;
          box-shadow:0 0 0 1px rgba(0,0,0,0.2);
        "></div>
      </div>
    `;
    return L.divIcon({ html, className: "", iconSize: [0, 0] });
  }, [self?.heading]);

  if (!self) return null;
  if (follow) {
    map.panTo([self.lat, self.lng], { animate: true, duration: 0.4 });
  }

  return (
    <>
      {self.accuracy != null && self.accuracy < 200 && (
        <Circle
          center={[self.lat, self.lng]}
          radius={self.accuracy}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.08, weight: 1 }}
        />
      )}
      <Marker position={[self.lat, self.lng]} icon={icon} />
    </>
  );
}
