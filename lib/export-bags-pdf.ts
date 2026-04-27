"use client";

import jsPDF from "jspdf";
import { lngLatToPixel, type AffineTransform } from "@/lib/georef";

export type BagForExport = {
  lat: number;
  lng: number;
  teamColor: string;
  teamName: string;
};

/**
 * Render the original map image with team-coloured pins for each bag, then save
 * the result as a single-page PDF.
 */
export async function exportBagsPdf({
  imageUrl,
  imageW,
  imageH,
  transform,
  bags,
  filename,
  title,
}: {
  imageUrl: string;
  imageW: number;
  imageH: number;
  transform: AffineTransform;
  bags: BagForExport[];
  filename: string;
  title?: string;
}) {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = imageW;
  canvas.height = imageH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  ctx.drawImage(img, 0, 0, imageW, imageH);

  // Pin geometry scales with image so a small print stays readable.
  const r = Math.max(8, Math.round(Math.min(imageW, imageH) / 120));
  const stroke = Math.max(2, Math.round(r / 4));

  for (let i = 0; i < bags.length; i++) {
    const b = bags[i];
    const { px, py } = lngLatToPixel(transform, b.lng, b.lat);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = b.teamColor;
    ctx.fill();
    ctx.lineWidth = stroke;
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.stroke();
  }

  // Legend — counts per team
  const counts = new Map<string, { color: string; n: number }>();
  for (const b of bags) {
    const cur = counts.get(b.teamName);
    if (cur) cur.n++;
    else counts.set(b.teamName, { color: b.teamColor, n: 1 });
  }

  if (title || counts.size > 0) {
    const padding = Math.round(r * 1.6);
    const lineH = Math.round(r * 2.4);
    const fontSize = Math.round(r * 1.6);
    const linesCount = (title ? 1 : 0) + counts.size;
    const boxH = padding * 2 + linesCount * lineH;
    const boxW = Math.min(imageW * 0.45, Math.round(r * 24));

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    roundRect(ctx, padding, padding, boxW, boxH, r * 0.8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#111";
    let y = padding + lineH;
    if (title) {
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.fillText(title, padding * 1.5, y);
      y += lineH;
      ctx.font = `${fontSize}px system-ui`;
    }
    for (const [name, { color, n }] of counts) {
      const swatchSize = fontSize;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(padding * 1.5 + swatchSize / 2, y - swatchSize / 3, swatchSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillText(`${name} — ${n} zsák`, padding * 1.5 + swatchSize + r * 0.6, y);
      y += lineH;
    }
  }

  const pageOrientation = imageW >= imageH ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation: pageOrientation,
    unit: "pt",
    format: "a4",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const fitW = pageW - margin * 2;
  const fitH = pageH - margin * 2;
  const ratio = Math.min(fitW / imageW, fitH / imageH);
  const drawW = imageW * ratio;
  const drawH = imageH * ratio;
  const offX = (pageW - drawW) / 2;
  const offY = (pageH - drawH) / 2;

  const pngData = canvas.toDataURL("image/png");
  pdf.addImage(pngData, "PNG", offX, offY, drawW, drawH);
  pdf.save(`${filename}.pdf`);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
