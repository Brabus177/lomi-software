"use client";

import { useMemo } from "react";
import { CircleMarker, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";

export type TeamPos = { lat: number; lng: number; ts: string };
export type TeamBag = { id: string; lat: number; lng: number; ts: string; note?: string | null };
export type TeamLive = {
  id: string;
  name: string;
  color: string;
  trail: TeamPos[];
  bags: TeamBag[];
};

export function LiveTeamLayer({ team }: { team: TeamLive }) {
  const last = team.trail.at(-1);
  const trailLatLng = team.trail.map((p) => [p.lat, p.lng] as [number, number]);

  const dotIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        iconSize: [0, 0],
        html: `
          <div style="transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:14px;height:14px;border-radius:50%;background:${team.color};border:3px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>
            <div style="background:white;border:1px solid ${team.color};color:#111;font:600 11px/1 system-ui;padding:2px 6px;border-radius:9999px;white-space:nowrap;">${escapeHtml(team.name)}</div>
          </div>
        `,
      }),
    [team.color, team.name],
  );

  return (
    <>
      {trailLatLng.length > 1 && (
        <Polyline positions={trailLatLng} pathOptions={{ color: team.color, weight: 4, opacity: 0.7 }} />
      )}
      {last && <Marker position={[last.lat, last.lng]} icon={dotIcon} />}
      {team.bags.map((bag) => (
        <CircleMarker
          key={bag.id}
          center={[bag.lat, bag.lng]}
          radius={7}
          pathOptions={{ color: "#111", weight: 2, fillColor: team.color, fillOpacity: 1 }}
        >
          <Tooltip>
            <div style={{ font: "12px system-ui" }}>
              <strong>{team.name}</strong>
              <br />
              Bag · {new Date(bag.ts).toLocaleTimeString()}
              {bag.note ? <><br />{bag.note}</> : null}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
