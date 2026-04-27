/**
 * Georeferencing: fit a 6-parameter affine that maps image pixels (px, py) to
 * geographic coordinates (lng, lat) and back.
 *
 *   lng = a*px + b*py + c
 *   lat = d*px + e*py + f
 *
 * For district-scale OSM screenshots (a few km across), a plain affine in
 * lat/lng space is accurate to well under the GPS noise floor. If maps grow
 * country-scale, swap to fitting in Web Mercator instead.
 */

export type ControlPoint = {
  px: number;
  py: number;
  lat: number;
  lng: number;
};

export type AffineTransform = {
  /** lng = a*px + b*py + c */
  a: number; b: number; c: number;
  /** lat = d*px + e*py + f */
  d: number; e: number; f: number;
};

/** Solve A^T A x = A^T y for 3-column A (least squares). */
function solveLeastSquares3(
  rows: ReadonlyArray<readonly [number, number, number]>,
  ys: ReadonlyArray<number>,
): [number, number, number] {
  // Build 3x3 normal matrix and 3-vector
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const v = [0, 0, 0];
  for (let i = 0; i < rows.length; i++) {
    const [r0, r1, r2] = rows[i];
    const y = ys[i];
    m[0] += r0 * r0; m[1] += r0 * r1; m[2] += r0 * r2;
    m[3] += r1 * r0; m[4] += r1 * r1; m[5] += r1 * r2;
    m[6] += r2 * r0; m[7] += r2 * r1; m[8] += r2 * r2;
    v[0] += r0 * y; v[1] += r1 * y; v[2] += r2 * y;
  }
  return solve3x3(m, v);
}

function solve3x3(m: number[], v: number[]): [number, number, number] {
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (Math.abs(det) < 1e-12) {
    throw new Error("Control points are degenerate (collinear?). Pick spread-out points.");
  }
  const inv = [
    (m[4] * m[8] - m[5] * m[7]) / det,
    -(m[1] * m[8] - m[2] * m[7]) / det,
    (m[1] * m[5] - m[2] * m[4]) / det,
    -(m[3] * m[8] - m[5] * m[6]) / det,
    (m[0] * m[8] - m[2] * m[6]) / det,
    -(m[0] * m[5] - m[2] * m[3]) / det,
    (m[3] * m[7] - m[4] * m[6]) / det,
    -(m[0] * m[7] - m[1] * m[6]) / det,
    (m[0] * m[4] - m[1] * m[3]) / det,
  ];
  return [
    inv[0] * v[0] + inv[1] * v[1] + inv[2] * v[2],
    inv[3] * v[0] + inv[4] * v[1] + inv[5] * v[2],
    inv[6] * v[0] + inv[7] * v[1] + inv[8] * v[2],
  ];
}

export function fitAffine(points: ReadonlyArray<ControlPoint>): AffineTransform {
  if (points.length < 3) {
    throw new Error("Need at least 3 control points to fit an affine.");
  }
  const rows = points.map((p) => [p.px, p.py, 1] as const);
  const [a, b, c] = solveLeastSquares3(rows, points.map((p) => p.lng));
  const [d, e, f] = solveLeastSquares3(rows, points.map((p) => p.lat));
  return { a, b, c, d, e, f };
}

export function pixelToLngLat(t: AffineTransform, px: number, py: number) {
  return {
    lng: t.a * px + t.b * py + t.c,
    lat: t.d * px + t.e * py + t.f,
  };
}

export function lngLatToPixel(t: AffineTransform, lng: number, lat: number) {
  // Invert 2x2 [[a,b],[d,e]]
  const det = t.a * t.e - t.b * t.d;
  if (Math.abs(det) < 1e-18) throw new Error("Singular transform.");
  const dx = lng - t.c;
  const dy = lat - t.f;
  return {
    px: (t.e * dx - t.b * dy) / det,
    py: (-t.d * dx + t.a * dy) / det,
  };
}

/** Bounds of the full image in lat/lng for use with Leaflet imageOverlay. */
export function imageBounds(t: AffineTransform, w: number, h: number) {
  const corners = [
    pixelToLngLat(t, 0, 0),
    pixelToLngLat(t, w, 0),
    pixelToLngLat(t, 0, h),
    pixelToLngLat(t, w, h),
  ];
  const lats = corners.map((c) => c.lat);
  const lngs = corners.map((c) => c.lng);
  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  };
}

/** Mean reprojection error in meters (rough; uses Haversine). */
export function residualMeters(t: AffineTransform, points: ReadonlyArray<ControlPoint>) {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const p of points) {
    const got = pixelToLngLat(t, p.px, p.py);
    sum += haversineMeters(p.lat, p.lng, got.lat, got.lng);
  }
  return sum / points.length;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
