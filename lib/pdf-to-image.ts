"use client";

/**
 * Render the first page of a PDF File to a PNG Blob using pdfjs-dist in the
 * browser. Used by the admin to convert uploaded route PDFs into a flat raster
 * we can serve as a Leaflet imageOverlay basemap.
 */
export async function pdfToPngBlob(file: File, targetWidth = 2000) {
  const pdfjs = await import("pdfjs-dist");
  // Use the matching worker version from a CDN. Avoids bundler-specific URL
  // imports that don't always resolve under Turbopack.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not get 2D context");

  await page.render({
    canvas,
    canvasContext: ctx,
    viewport,
  } as Parameters<typeof page.render>[0]).promise;

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );

  return { blob, width: canvas.width, height: canvas.height };
}

/** Convert any image File to dimensions + a Blob (passthrough). */
export async function imageFileInfo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    return { blob: file as Blob, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
