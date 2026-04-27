"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { imageFileInfo, pdfToPngBlob } from "@/lib/pdf-to-image";
import { t } from "@/lib/i18n";

export function MapUploader() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onUpload() {
    if (!file || !label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error(t.errors.notSignedIn);

      setProgress(t.maps.rasterising);
      const { blob, width, height } =
        file.type === "application/pdf"
          ? await pdfToPngBlob(file)
          : await imageFileInfo(file);

      setProgress(t.maps.uploading);
      const path = `${user.id}/${crypto.randomUUID()}.png`;
      const up = await sb.storage.from("maps").upload(path, blob, {
        contentType: file.type === "application/pdf" ? "image/png" : file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) throw up.error;

      const pub = sb.storage.from("maps").getPublicUrl(path);
      const imageUrl = pub.data.publicUrl;

      setProgress(t.maps.saving);
      const ins = await sb
        .from("maps")
        .insert({
          owner: user.id,
          label: label.trim(),
          image_url: imageUrl,
          image_w: width,
          image_h: height,
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;

      router.push(`/admin/maps/${ins.data.id}/georef`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <h2 className="font-medium">{t.maps.uploadHeader}</h2>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.maps.label}</label>
        <input
          type="text"
          placeholder={t.maps.labelPlaceholder}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 h-10 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition"
        />
      </div>
      <label className="block">
        <span className="sr-only">PDF / kép</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-accent file:text-accent-foreground file:cursor-pointer"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!file || !label.trim() || busy} onClick={onUpload} className="h-10 rounded-xl px-4">
          {busy ? progress ?? t.maps.saving : t.maps.upload}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
      <p className="text-xs text-muted-foreground">{t.maps.pdfHelp}</p>
    </div>
  );
}
